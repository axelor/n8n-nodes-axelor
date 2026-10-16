import {
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { AxelorApiCredentials } from '../../helpers/interface';
import { FIELD_TYPE, HTTP, HTTP_METHOD_OPTIONS } from '../../helpers/constants';

const MUTATING_HTTP_METHODS = [HTTP.POST, HTTP.PUT, HTTP.PATCH];

export const properties: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: FIELD_TYPE.STRING,
		required: true,
		default: '',
		description: 'Path of the API endpoint, relative to the Base URL of the credential',
		placeholder: '/ws/rest/com.axelor.apps.base.db.Partner/1',
		hint: 'Enter a path starting with /. Full URLs are not allowed.',
	},
	{
		displayName: 'Method',
		name: 'method',
		type: FIELD_TYPE.OPTIONS,
		options: HTTP_METHOD_OPTIONS,
		default: HTTP.GET,
		description: 'The HTTP method to use for the API call',
	},
	{
		displayName: 'Headers',
		name: 'headers',
		type: FIELD_TYPE.FIXED_COLLECTION,
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Header',
		default: {},
		hint: "You don't have to add authorization headers; we already did that for you.",
		options: [
			{
				name: 'parameters',
				displayName: 'Header',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: FIELD_TYPE.STRING,
						default: '',
						description: 'Key of the header parameter',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: FIELD_TYPE.STRING,
						default: '',
						description: 'Value of the header parameter',
					},
				],
			},
		],
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: FIELD_TYPE.FIXED_COLLECTION,
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Query Parameter',
		default: {},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: FIELD_TYPE.STRING,
						default: '',
						description: 'Key of the query parameter',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: FIELD_TYPE.STRING,
						default: '',
						description: 'Value of the query parameter',
					},
				],
			},
		],
	},
	{
		displayName: 'Body',
		name: 'body',
		type: FIELD_TYPE.STRING,
		default: '',
		description: 'The body of the API call',
		displayOptions: {
			show: {
				method: MUTATING_HTTP_METHODS,
			},
		},
	},
];

/**
 * Only allow paths relative to the credential's Base URL, so the
 * authenticated request can never be sent to another host.
 */
export function validateRelativePath(url: string): boolean {
	// Must start with a single "/"; "//" and "/\" are protocol-relative URLs.
	// Control characters and whitespace are rejected because URL parsers strip them.
	if (!/^\/(?![/\\])/.test(url) || /\s/.test(url)) return false;
	return [...url].every((char) => char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f);
}

const displayOptions = {
	show: {
		resource: ['generic'],
		operation: ['makeApiCall'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

		try {
			const url = this.getNodeParameter('url', i) as string;
			if (!validateRelativePath(url)) {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid URL "${url}": enter a path relative to the Base URL, starting with /`,
					{
						itemIndex: i,
						description: 'For example: /ws/rest/com.axelor.apps.base.db.Partner/1',
					},
				);
			}
			const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
			const headersCollection = this.getNodeParameter('headers', i, {}) as {
				parameters?: Array<{ key: string; value: string }>;
			};
			const queryCollection = this.getNodeParameter('queryParameters', i, {}) as {
				parameters?: Array<{ key: string; value: string }>;
			};

			const headers: Record<string, string> = {};
			if (headersCollection.parameters) {
				for (const param of headersCollection.parameters) {
					headers[param.key] = param.value;
				}
			}

			const qs: Record<string, string> = {};
			if (queryCollection.parameters) {
				for (const param of queryCollection.parameters) {
					qs[param.key] = param.value;
				}
			}

			let body;
			if (MUTATING_HTTP_METHODS.includes(method)) {
				const bodyContent = this.getNodeParameter('body', i, '') as string;
				try {
					body = JSON.parse(bodyContent);
				} catch {
					body = bodyContent;
				}
			}

			const requestOptions: IHttpRequestOptions = {
				method,
				url,
				baseURL: creds.baseUrl,
				headers: { Accept: '*/*', 'Content-Type': 'application/json', ...headers },
				json: true,
				qs,
			};

			if (body !== undefined) {
				requestOptions.body = body;
			}

			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'axelorApi', requestOptions);
			isValidResponse(response);

			const executionData = this.helpers.constructExecutionMetaData(wrapData(response.data), {
				itemData: { item: i },
			});

			returnData.push(...executionData);
		} catch (error) {
			const processedError = processAxelorError(error as NodeApiError);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: processedError.message } });
				continue;
			}
			throw processedError;
		}
	}

	return returnData;
}
