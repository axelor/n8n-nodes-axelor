import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
	NodeApiError,
} from 'n8n-workflow';

import {
	contextToDomainContext,
	processAxelorError,
	processCustomFieldResponse,
	processSelectedFields,
	sortRulesToSortBy,
	wrapData,
} from '../../helpers/utils';
import { getFields } from '../../helpers/api-helper';
import { FIELD_TYPE, SORT_BY_OPTIONS } from '../../helpers/constants';
import type {
	AxelorModelFieldSchema,
	ContextValues,
	FieldCategory,
	SortValues,
} from '../../helpers/interface';
import { isEmpty } from '../../helpers/lodash';
import { searchRecords } from '../../helpers/pagination';

export const properties: INodeProperties[] = [
	{
		displayName: 'Search Query',
		name: 'query',
		type: FIELD_TYPE.STRING,
		default: '',
		placeholder: '',
		hint: 'If empty, all the records will be returned',
		description:
			'The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response. <a href="https://support.airtable.com/docs/formula-field-reference" target="_blank">More info</a>.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: FIELD_TYPE.BOOLEAN,
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: FIELD_TYPE.NUMBER,
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { returnAll: [false] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: FIELD_TYPE.COLLECTION,
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Context',
				name: 'context',
				type: FIELD_TYPE.FIXED_COLLECTION,
				typeOptions: { multipleValues: true },
				placeholder: 'Add Context Variable',
				default: {},
				description: 'Values for the named parameters used in the search query (for example :name)',
				options: [
					{
						name: 'context',
						displayName: 'Context',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: FIELD_TYPE.STRING,
								required: true,
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: FIELD_TYPE.STRING,
								required: true,
								default: '',
							},
						],
					},
				],
			},
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
				},
			},
			{
				displayName: 'Include Archived',
				name: 'archived',
				type: FIELD_TYPE.BOOLEAN,
				default: false,
				description: 'Whether to include archived records in the results',
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: FIELD_TYPE.FIXED_COLLECTION,
		typeOptions: { multipleValues: true },
		placeholder: 'Add Sort Rule',
		default: {},
		options: [
			{
				displayName: 'Sort Rule',
				name: 'sortBy',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'field',
						type: FIELD_TYPE.OPTIONS,
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						default: '',
						typeOptions: {
							loadOptionsMethod: 'loadMetaFields',
							loadOptionsDependsOn: ['model'],
						},
					},
					{
						displayName: 'Direction',
						name: 'rule',
						type: FIELD_TYPE.OPTIONS,
						options: SORT_BY_OPTIONS,
						default: 'asc',
					},
				],
			},
		],
	},
];
const displayOptions = { show: { resource: ['record'], operation: ['search'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	const metaFieldCache: Record<string, Record<FieldCategory, AxelorModelFieldSchema[]>> = {};

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const limit = this.getNodeParameter('limit', i, 50) as number;

			let cacheData = metaFieldCache[model];
			if (!cacheData) {
				const data = await getFields.call(this, model);
				metaFieldCache[model] = data;
				cacheData = data;
			}
			const fields = [...(cacheData?.metaFields || []), ...(cacheData?.jsonFields || [])];
			const fieldNames = fields.map((f: { name: string }) => f.name);

			const data: IDataObject = {};
			const body: IDataObject = { data, fields: fieldNames };

			const query = this.getNodeParameter('query', i, '') as string;
			if (query) {
				data._domain = query;
			}
			let jsonFields: Array<string> | undefined;

			const options = this.getNodeParameter('options', i, {}) as {
				fields?: string[];
				archived?: boolean;
				context?: ContextValues;
			};
			const sort = this.getNodeParameter('sort', i, {}) as SortValues;

			const sortBy = sortRulesToSortBy(sort);
			if (sortBy.length > 0) {
				body.sortBy = sortBy;
			}

			const selectedFields = options.fields ?? [];
			if (selectedFields.length > 0) {
				const processedFields = processSelectedFields(selectedFields);
				body.fields = processedFields.fields;
				jsonFields = processedFields.jsonFields as Array<string>;
			}

			const domainContext = contextToDomainContext(options.context);
			if (!isEmpty(domainContext)) {
				data._domainContext = domainContext;
			}

			if (typeof options.archived === 'boolean') {
				data._archived = options.archived;
			}

			let result = await searchRecords.call(this, model, body, { returnAll, limit });
			if (jsonFields && jsonFields.length > 0) {
				const processedResponse = result.map((item: IDataObject) =>
					processCustomFieldResponse(item, selectedFields, jsonFields),
				);
				result = processedResponse;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(result as IDataObject[]),
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
