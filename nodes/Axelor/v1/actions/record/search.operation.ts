import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { isEmpty } from 'lodash';

import {
	getContextFields,
	getSelectedFields,
	getSortByFields,
	isValidResponse,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { getMetaFields } from '../../helpers/api-helper';
import { ARCHIVED_OPTIONS, SORT_BY_OPTIONS } from '../../helpers/constants';

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

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const creds = await this.getCredentials('axelorApi');
			const baseUrl = creds.baseUrl as string;
			const enableAdvancedSettings = this.getNodeParameter('advancedSettings', i) as boolean;
			const limit = this.getNodeParameter('limit', i, enableAdvancedSettings ? 50 : 10) as number;

			const fields = await getMetaFields.call(this, model);
			const fieldNames: string[] = fields.map((f) => f.name);

			const data: Record<string, any> = {};
			const body: Record<string, any> = { offset: 0, limit, data, fields: fieldNames };

			const query = this.getNodeParameter('query', i, '') as string;
			if (query) {
				data._domain = query;
			}

			if (enableAdvancedSettings) {
				body.sortBy = getSortByFields.call(this, i);
				const selectedFiels = getSelectedFields.call(this, i);
				const domainContext = getContextFields.call(this, i);
				const archived = this.getNodeParameter('archived', i, false) as boolean | string;

				if (selectedFiels.length > 0) {
					body.fields = selectedFiels;
				}
				if (!isEmpty(domainContext)) {
					data._domainContext = domainContext;
				}

				typeof archived === 'boolean' ? (data._archived = archived) : delete data._archived;
			}

			const resp = await this.helpers.request!({
				method: 'POST',
				url: `/ws/rest/${encodeURIComponent(model)}/search`,
				baseURL: baseUrl,
				auth: { user: creds.username as string, pass: creds.password as string },
				body,
				json: true,
			});

			if (isValidResponse(resp)) {
				returnData.push(...wrapData(resp.data || []));
			}
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
