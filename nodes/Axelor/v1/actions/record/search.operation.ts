import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	getContextFields,
	getSelectedFields,
	getSortByFields,
	isValidResponse,
	processAxelorError,
	processCustomFieldResponse,
	processSelectedFields,
	wrapData,
} from '../../helpers/utils';
import { getFields } from '../../helpers/api-helper';
import { ARCHIVED_OPTIONS, HTTP, SORT_BY_OPTIONS } from '../../helpers/constants';
import { isEmpty } from '../../helpers/lodash';
import { apiRequest } from '../../transport';

const ENABLED_ON_ADVANCED_SETTING = { show: { advancedSettings: [true] } };

export const properties: INodeProperties[] = [
	{
		displayName: 'Search Query',
		name: 'query',
		type: 'string',
		default: '',
		placeholder: '',
		hint: 'If empty, all the records will be returned',
		description:
			'The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response. <a href="https://support.airtable.com/docs/formula-field-reference" target="_blank">More info</a>.',
	},
	{
		displayName: 'Advanced Settings',
		name: 'advancedSettings',
		type: 'boolean',
		default: false,
		description: 'Whether to show advanced options',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		hint: 'The maximum no. of records to be fetched in one internal request and total there can be max. 3200 internal request in one operation',
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
	},
	{
		displayName: 'Field Name Names or IDs',
		name: 'fields',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'loadMetaFields',
			loadOptionsDependsOn: ['model'],
		},
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
	},

	{
		displayName: 'Show Archived',
		name: 'archived',
		type: 'options',
		options: ARCHIVED_OPTIONS,
		default: 'unset',
		description: 'Whether the item is archived',
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
		required: true,
	},

	{
		displayName: 'Context',
		name: 'context',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		options: [
			{
				name: 'context',
				displayName: 'Context',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		options: [
			{
				displayName: 'Sort By',
				name: 'sortBy',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'field',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'loadMetaFields',
							loadOptionsDependsOn: ['model'],
						},
					},
					{
						displayName: 'Rule',
						name: 'rule',
						type: 'options',
						options: SORT_BY_OPTIONS,
						default: '',
					},
				],
			},
		],
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
	},
];
const displayOptions = { show: { resource: ['record'], operation: ['search'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	const metaFieldCache: Record<string, any> = {};

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const enableAdvancedSettings = this.getNodeParameter('advancedSettings', i) as boolean;
			const limit = this.getNodeParameter('limit', i, enableAdvancedSettings ? 50 : 10) as number;

			let cacheData = metaFieldCache[model];
			if (!cacheData) {
				const data = await getFields.call(this, model);
				metaFieldCache[model] = data;
				cacheData = data;
			}
			const fields = [...(cacheData?.metaFields || []), ...(cacheData?.jsonFields || [])];
			const fieldNames = fields.map((f: { name: string }) => f.name);

			const data: Record<string, any> = {};
			const body: Record<string, any> = { offset: 0, limit, data, fields: fieldNames };

			const query = this.getNodeParameter('query', i, '') as string;
			if (query) {
				data._domain = query;
			}
			let jsonFields: Array<string> | undefined;
			let selectedFields: Array<string> | undefined;

			if (enableAdvancedSettings) {
				body.sortBy = getSortByFields.call(this, i);
				selectedFields = getSelectedFields.call(this, i) as Array<string>;
				const domainContext = getContextFields.call(this, i);
				const archived = this.getNodeParameter('archived', i, false) as boolean | string;

				if (selectedFields.length > 0) {
					const processedFields = processSelectedFields(selectedFields);
					body.fields = processedFields.fields;
					jsonFields = processedFields.jsonFields as Array<string>;
				}
				if (!isEmpty(domainContext)) {
					data._domainContext = domainContext;
				}

				typeof archived === 'boolean' ? (data._archived = archived) : delete data._archived;
			}

			const url = `/ws/rest/${encodeURIComponent(model)}/search`;
			const resp = await apiRequest.call(this, HTTP.POST, url, body);

			isValidResponse(resp);

			let result = (resp.data && resp.data) || [];
			if (jsonFields && jsonFields.length > 0) {
				const processedResponse = result.map((item: any) =>
					processCustomFieldResponse(item, selectedFields!, jsonFields),
				);
				result = processedResponse;
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
