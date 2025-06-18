import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	buildBuisnessAPIRequestData,
	buildRequest,
	getChangedFieldNames,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { AxelorApiCredentials } from '../../helpers/interface';
import { HTTP, WEB_SERVICE } from '../../helpers/constants';
import { join } from '../../helpers/lodash';
import { apiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Module Name or ID',
		name: 'module',
		required: true,
		type: 'options',
		description:
			'Select the Axelor module you want to interact with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getModules',
		},
		default: '',
	},
	{
		displayName: 'Action Name or ID',
		name: 'action',
		required: true,
		type: 'options',
		description:
			'Select the action. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getActions',
			loadOptionsDependsOn: ['module'],
			refreshOn: ['module'],
		},
		default: '',
		displayOptions: {
			hide: {
				module: [''],
			},
		},
	},
	{
		displayName: 'Parameters',
		name: 'parameters',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		typeOptions: {
			loadOptionsDependsOn: ['action'],
			resourceMapper: {
				resourceMapperMethod: 'loadActionBodyFields',
				valuesLabel: 'Parameter',
				mode: 'add',
				fieldWords: {
					singular: 'Field',
					plural: 'Fields',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
		displayOptions: {
			hide: {
				action: [''],
				module: [''],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['generic'],
		operation: ['businessServiceCall'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const infoCache: Record<string, any> = {};

	for (let i = 0; i < items.length; i++) {
		const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

		const actionRaw = this.getNodeParameter('action', i) as string;
		const actionData = JSON.parse(actionRaw);

		const action = actionData.name;
		const classFullyQualifiedName = actionData.classFullyQualifiedName;

		if (!module || !action) return returnData;

		if (!this.helpers.request) throw new Error('Request helper not available');

		const qs: IDataObject = {};

		qs.classFullyQualifiedName = classFullyQualifiedName;
		qs.name = action;

		const key = join([module, action], '_');
		let cacheData = infoCache[key];
		let response: any = {};
		try {
			if (!cacheData) {
				const url = WEB_SERVICE.CONNECT_WS_INFO;
				const data: IDataObject = {};
				response = await apiRequest.call(this, HTTP.GET, url, data, qs);

				infoCache[key] = response;
				cacheData = response;
			}
			response = cacheData;

			const fields = response.requestBody?.bodyParameters || [];

			const mapping = this.getNodeParameter('parameters', i, {}) as any;

			const changedKeys = getChangedFieldNames(mapping);

			const requestBody = buildRequest({
				serviceInfo: response,
				credentials: creds,
				values: mapping?.value || {},
			});
			if (requestBody.method === HTTP.POST) {
				const data = buildBuisnessAPIRequestData(changedKeys, mapping.value, fields);
				requestBody.body = data;
			}
			const buisnessCallResponse = await this.helpers.request(requestBody);
			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(buisnessCallResponse as IDataObject[]),
				{ itemData: { item: i } },
			);

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
