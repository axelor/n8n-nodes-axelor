import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { getFields, getMetaModelFieldRecord } from '../../helpers/api-helper';
import {
	buildRequestData,
	getChangedFieldNames,
	isValidResponse,
	manageCustomFieldData,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { HTTP } from '../../helpers/constants';
import { AxelorApiCredentials } from '../../helpers/interface';

const properties: INodeProperties[] = [
	{
		displayName: 'Records Name or ID',
		name: 'records',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getMetaModelRecords',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
		},
		default: '',
		description:
			'Select the record type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		required: true,
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMetaModelFields',
				// TODO: Check the mode with "update"
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
			},
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
		},
		displayOptions: {
			hide: {
				model: [''],
			},
		},
	},
];

const displayOptions = {
	show: {
		operation: ['update'],
	},
	hide: {
		model: [''],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const metaFieldCache: Record<string, any> = {};

	const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;
		const recordId = this.getNodeParameter('records', i) as number;

		const record = await getMetaModelFieldRecord.call(this, model, recordId);
		if (!record) {
			const error = new Error(`No record found with ID ${recordId} for model ${model}`);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}

		try {
			const mapping = this.getNodeParameter('fields', i, {}) as any;
			let cacheData = metaFieldCache[model];
			if (!cacheData) {
				const data = await getFields.call(this, model);
				metaFieldCache[model] = data;
				cacheData = data;
			}

			const metaFields = cacheData?.metaFields || [];
			const jsonFields = cacheData?.jsonFields || [];
			const metaJsonFields = cacheData?.metaJsonFields || [];
			const fields = [...metaFields, ...jsonFields];

			// Extract changed field keys using schema info
			const changedKeys = getChangedFieldNames(mapping);

			// Build request payload with only changed fields
			let data = buildRequestData(changedKeys, mapping, fields, metaJsonFields);
			data = manageCustomFieldData(data, record, metaJsonFields);

			data.id = recordId;
			data.version = record.version;

			const responseData = await this.helpers.request!({
				method: HTTP.POST,
				url: `/ws/rest/${encodeURIComponent(model)}`,
				baseURL: creds.baseUrl,
				auth: { user: creds.username, pass: creds.password },
				body: { data },
				json: true,
			});

			isValidResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
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
