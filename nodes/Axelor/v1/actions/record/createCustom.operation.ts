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
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { getFields } from '../../helpers/api-helper';
import { FIELD_TYPE, HTTP, MODEL } from '../../helpers/constants';
import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
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
		operation: ['createCustom'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const metaFieldCache: Record<string, any> = {};

	for (let i = 0; i < items.length; i++) {
		try {
			const model = this.getNodeParameter('customModel', i) as string;
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
			const data = buildRequestData(changedKeys, mapping, jsonFields, metaJsonFields);

			data.jsonModel = model;

			const url = `/ws/rest/${MODEL.META_JSON_RECORD}`;
			const responseData = await apiRequest.call(this, HTTP.POST, url, { data });

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
