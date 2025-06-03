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
import { WorkflowCredentials } from '../../helpers/interface';

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
	for (let i = 0; i < items.length; i++) {
		const creds = (await this.getCredentials('axelorApi')) as WorkflowCredentials;

		const actionRaw = this.getNodeParameter('action', i) as string;
		const actionData = JSON.parse(actionRaw);

		const action = actionData.name;
		const classFullyQualifiedName = actionData.classFullyQualifiedName;

		if (!module || !action) {
			return returnData;
		}

		if (!this.helpers.request) {
			throw new Error('Request helper not available');
		}

		const qs: IDataObject = {};

		qs.classFullyQualifiedName = classFullyQualifiedName;
		qs.name = action;

		try {
			const response = await this.helpers.request({
				method: 'GET',
				url: `/ws/connect/connect-web-service-info`,
				baseURL: creds.baseUrl,
				auth: {
					user: creds.username,
					pass: creds.password,
				},
				json: true,
				qs,
			});

			const fields = response.requestBody?.bodyParameters || [];

			const mapping = this.getNodeParameter('parameters', i, {}) as any;

			const changedKeys = getChangedFieldNames(mapping);

			// this.logger.info('changedkey', { changedKeys });
			// this.logger.info('mapping', { mapping });
			// this.logger.info('fields', { fields });
			// this.logger.info('mapping', mapping);

			const requestBody = buildRequest({
				serviceInfo: response,
				credentials: creds,
				values: mapping.value,
			});
			// this.logger.info('requestBody', { requestBody });
			if (requestBody.method === 'POST') {
				const data = buildBuisnessAPIRequestData(changedKeys, mapping.value, fields);
				// this.logger.info('data', { data });
				requestBody.body = { data };
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
