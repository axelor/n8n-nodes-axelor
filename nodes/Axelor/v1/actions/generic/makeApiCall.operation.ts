import {
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
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
		description: 'The URL to make the API call to',
		hint: 'Enter a relative path. Example: /ws/axelor/getRecord',
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
				} catch (e) {
					body = bodyContent;
				}
			}

			const requestOptions: Record<string, any> = {
				method,
				url,
				baseURL: creds.baseUrl,
				headers: { Accept: '*/*', ...headers },
				auth: { user: creds.username, pass: creds.password },
				json: true,
				qs,
			};

			if (body !== undefined) {
				requestOptions.body = body;
			}

			const response = await this.helpers.request(requestOptions);
			isValidResponse(response);

			const executionData = this.helpers.constructExecutionMetaData(wrapData(response.data), {
				itemData: { item: i },
			});

			returnData.push(...executionData);
		} catch (error) {
			error = processAxelorError(error as NodeApiError);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
