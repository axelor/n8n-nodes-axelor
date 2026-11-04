import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	isValidResponse,
	processAxelorError,
	processCustomFieldResponse,
	processSelectedFields,
	wrapData,
} from '../../helpers/utils';
import { getFields } from '../../helpers/api-helper';
import { FIELD_TYPE, HTTP } from '../../helpers/constants';
import { apiRequest } from '../../transport';
import type { AxelorModelFieldSchema, FieldCategory } from '../../helpers/interface';

const properties: INodeProperties[] = [
	{
		displayName: 'Records Name or ID',
		name: 'records',
		type: FIELD_TYPE.OPTIONS,
		typeOptions: {
			loadOptionsMethod: 'getMetaModelRecords',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
		},
		default: '',
		description:
			'Select the record type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
		displayOptions: {
			hide: {
				model: [''],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: FIELD_TYPE.COLLECTION,
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Field Names or IDs',
				name: 'fields',
				type: FIELD_TYPE.MULTI_OPTIONS,
				description:
					'Fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'loadMetaFields',
					loadOptionsDependsOn: ['model'],
					refreshOn: ['model'],
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['read'],
	},
};
export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];
	const metaFieldCache: Record<string, Record<FieldCategory, AxelorModelFieldSchema[]>> = {};

	for (let i = 0; i < items?.length || 0; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			let cacheData = metaFieldCache[model];
			if (!cacheData) {
				const data = await getFields.call(this, model);
				metaFieldCache[model] = data;
				cacheData = data;
			}

			const fields = [...(cacheData?.metaFields || []), ...(cacheData?.jsonFields || [])];
			const fieldNames = fields.map((f: { name: string }) => f.name);

			const recordId = this.getNodeParameter('records', i) as string;
			const options = this.getNodeParameter('options', i, {}) as { fields?: string[] };

			const body: { fields: string[]; data: IDataObject } = { fields: fieldNames, data: {} };
			let jsonFields: Array<string> | undefined;

			const selectedFields = options.fields ?? [];
			if (selectedFields.length > 0) {
				const processedFields = processSelectedFields(selectedFields);
				body.fields = processedFields.fields;
				jsonFields = processedFields.jsonFields as Array<string>;
			}

			const url = `/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`;
			const resp = await apiRequest.call(this, HTTP.POST, url, body);

			isValidResponse(resp);

			let result = (Array.isArray(resp.data) ? resp.data[0] : resp.data) || {};
			if (jsonFields && jsonFields.length > 0) {
				result = processCustomFieldResponse(result, selectedFields, jsonFields);
			}
			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(result as IDataObject),
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
