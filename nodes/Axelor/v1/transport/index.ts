import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';
import { AxelorApiCredentials } from '../helpers/interface';
import { HTTP } from '../helpers/constants';

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	url: string,
	body: IDataObject | Buffer = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	option: Partial<IHttpRequestOptions> = {},
): Promise<any> {
	const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

	const options: IHttpRequestOptions = {
		method,
		url,
		baseURL: creds.baseUrl,
		headers: {
			'Content-Type': 'application/json',
		},
		qs,
		...option,
	};

	if (Object.keys(headers).length !== 0) {
		options.headers = { ...options.headers, ...headers };
	}

	const hasBody = Buffer.isBuffer(body) ? body.length > 0 : Object.keys(body).length > 0;
	if ([HTTP.PATCH, HTTP.POST].includes(method) || hasBody) {
		options.body = body;
		if (!Buffer.isBuffer(body)) {
			options.json = true;
		}
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'axelorApi', options);
}
