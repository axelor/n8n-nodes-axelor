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

const ENABLED_ON_ADVANCED_SETTING = { show: { advancedSettings: [true] } };

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
		displayName: 'Advanced Settings',
		name: 'advancedSettings',
		type: FIELD_TYPE.BOOLEAN,
		default: false,
		description: 'Whether to show advanced options',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Select Fields',
		name: 'fields',
		type: FIELD_TYPE.MULTI_OPTIONS,
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'loadMetaFields',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
		},
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
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
	const metaFieldCache: Record<string, any> = {};

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
			const enableAdvancedSettings = this.getNodeParameter('advancedSettings', i) as boolean;

			const body: any = { fields: fieldNames, data: {} };
			let jsonFields: Array<string> | undefined;
			let selectedFields: Array<string> | undefined;

			if (enableAdvancedSettings) {
				selectedFields = this.getNodeParameter('fields', i, []) as Array<string>;
				if (selectedFields.length > 0) {
					const processedFields = processSelectedFields(selectedFields);
					body.fields = processedFields.fields;
					jsonFields = processedFields.jsonFields as Array<string>;
				}
			}

			const url = `/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`;
			const resp = await apiRequest.call(this, HTTP.POST, url, body);

			isValidResponse(resp);

			let result = (resp.data && resp.data[0]) || {};
			if (jsonFields && jsonFields.length > 0) {
				result = processCustomFieldResponse(result, selectedFields!, jsonFields);
			}
			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(result as IDataObject[]),
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
