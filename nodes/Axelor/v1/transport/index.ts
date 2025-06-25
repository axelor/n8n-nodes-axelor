import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { AxelorApiCredentials } from '../helpers/interface';
import { HTTP } from '../helpers/constants';

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	url: string,
	body: any = {},
	qs: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
) {
	const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		baseURL: creds.baseUrl,
		auth: { user: creds.username, pass: creds.password },
		body,
		url,
		json: true,
		...option,
	};

	if (Object.keys(headers).length !== 0) {
		options.headers = Object.assign({}, options.headers, headers);
	}
	if (![HTTP.PATCH, HTTP.POST].includes(method) && Object.keys(body).length === 0) {
		delete options.body;
	}

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	return await this.helpers.request!(options);
}
