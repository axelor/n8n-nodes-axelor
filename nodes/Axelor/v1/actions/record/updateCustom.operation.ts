import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeApiError, updateDisplayOptions } from 'n8n-workflow';
import {
	buildRequestData,
	getChangedFieldNames,
	isValidResponse,
	manageCustomFieldData,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { getFields, getMetaModelFieldRecord } from '../../helpers/api-helper';
import { FIELD_TYPE, HTTP, MODEL } from '../../helpers/constants';
import { AxelorApiCredentials } from '../../helpers/interface';

const properties: INodeProperties[] = [
	{
		displayName: 'Records Name or ID',
		name: 'records',
		type: FIELD_TYPE.OPTIONS,
		typeOptions: {
			loadOptionsMethod: 'getMetaJsonRecords',
			loadOptionsDependsOn: ['customModel'],
			refreshOn: ['customModel'],
		},
		default: '',
		description:
			'Select the record type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: FIELD_TYPE.RESOURCE_MAPPER,
		required: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMetaJsonModelFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
			},
			loadOptionsDependsOn: ['customModel'],
			refreshOn: ['customModel'],
		},
		displayOptions: {
			hide: {
				model: ['customModel'],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['updateCustom'],
	},
	hide: {
		customModel: [''],
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
		const model = this.getNodeParameter('customModel', i) as string;
		const recordId = this.getNodeParameter('records', i) as number;

		const record = await getMetaModelFieldRecord.call(this, model, recordId, {
			isCustomModel: true,
		});
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
				const data = await getFields.call(this, model, { isCustomModel: true });
				metaFieldCache[model] = data;
				cacheData = data;
			}
			const jsonFields = cacheData?.jsonFields || [];
			const metaJsonFields = cacheData?.metaJsonFields || [];

			// Extract only the field names that have actually changed (not removed)
			const changedKeys = getChangedFieldNames(mapping);

			// Build the final data payload using the changed keys only
			let data = buildRequestData(changedKeys, mapping, jsonFields, metaJsonFields);
			data = manageCustomFieldData(data, record, metaJsonFields);

			data.jsonModel = model;
			data.id = record.id;
			data.version = record.version;

			const responseData = await this.helpers.request!({
				method: HTTP.POST,
				url: `/ws/rest/${MODEL.META_JSON_RECORD}`,
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
