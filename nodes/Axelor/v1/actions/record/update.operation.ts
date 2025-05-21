import type {
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import {
	buildRequestData,
	getChangedFieldNames,
	isValidResponse,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { getMetaFields, getMetaModelFieldRecord } from '../../helpers/api-helper';

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

	const creds = await this.getCredentials('axelorApi');
	const baseUrl = creds.baseUrl as string;

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

			const fields = await getMetaFields.call(this, model);

			// Extract changed field keys using schema info
			const changedKeys = getChangedFieldNames(mapping);

			// Build request payload with only changed fields
			const data = buildRequestData(changedKeys, mapping, fields);

			data.id = recordId;
			data.version = record.version;

			const responseData = await this.helpers.request!({
				method: 'POST',
				url: `/ws/rest/${encodeURIComponent(model)}`,
				baseURL: baseUrl,
				auth: { user: creds.username as string, pass: creds.password as string },
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
