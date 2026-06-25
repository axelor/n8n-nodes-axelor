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
import type { AxelorApiCredentials, AxelorModelFieldSchema, WebServiceInfo } from '../../helpers/interface';
import { FIELD_TYPE, HTTP, WEB_SERVICE } from '../../helpers/constants';
import { join } from '../../helpers/lodash';
import { apiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Module Name or ID',
		name: 'module',
		required: true,
		type: FIELD_TYPE.OPTIONS,
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
		type: FIELD_TYPE.OPTIONS,
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
		type: FIELD_TYPE.RESOURCE_MAPPER,
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

type ServiceInfo = WebServiceInfo & {
	requestBody?: { bodyParameters?: AxelorModelFieldSchema[] };
};

type MappingData = {
	schema?: Array<{ id: string; removed: boolean }>;
	value?: IDataObject;
};

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const infoCache: Record<string, ServiceInfo> = {};

	for (let i = 0; i < items.length; i++) {
		const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

		const actionRaw = this.getNodeParameter('action', i) as string;
		const actionData = JSON.parse(actionRaw);

		const action = actionData.name;
		const classFullyQualifiedName = actionData.classFullyQualifiedName;

		if (!module || !action) return returnData;


		const qs: IDataObject = {};

		qs.classFullyQualifiedName = classFullyQualifiedName;
		qs.name = action;

		const key = join([module, action], '_');
		let cacheData = infoCache[key];
		let response!: ServiceInfo;
		try {
			if (!cacheData) {
				const url = WEB_SERVICE.CONNECT_WS_INFO;
				const data: IDataObject = {};
				response = await apiRequest.call(this, HTTP.GET, url, data, qs) as unknown as ServiceInfo;

				infoCache[key] = response;
				cacheData = response;
			}
			response = cacheData;

			const fields = response.requestBody?.bodyParameters || [];

			const mapping = this.getNodeParameter('parameters', i, {}) as MappingData;

			const changedKeys = getChangedFieldNames(mapping);

			const requestBody = buildRequest({
				serviceInfo: response,
				credentials: creds,
				values: mapping?.value,
			});
			if (requestBody.method === HTTP.POST) {
				const data = buildBuisnessAPIRequestData(changedKeys, mapping.value ?? {}, fields);
				requestBody.body = data;
			}
			const buisnessCallResponse = await this.helpers.httpRequestWithAuthentication.call(this, 'axelorApi', requestBody);
			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(buisnessCallResponse as IDataObject[]),
				{ itemData: { item: i } },
			);

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
