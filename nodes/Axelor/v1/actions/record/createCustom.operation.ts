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
import { getCustomModelFields } from '../../helpers/api-helper';
import { MODEL } from '../../helpers/constants';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
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

	const creds = await this.getCredentials('axelorApi');
	const baseUrl = creds.baseUrl as string;

	for (let i = 0; i < items.length; i++) {
		try {
			const mapping = this.getNodeParameter('fields', i, {}) as any;

			const model = this.getNodeParameter('customModel', i) as string;
			const fields = await getCustomModelFields.call(this, model, { jsonMetaFields: true });

			// Extract only the field names that have actually changed (not removed)
			const changedKeys = getChangedFieldNames(mapping);

			// Build the final data payload using the changed keys only
			const data = buildRequestData(changedKeys, mapping, fields, ['attrs']);
			data.jsonModel = model;
			const responseData = await this.helpers.request!({
				method: 'POST',
				url: `/ws/rest/${MODEL.META_JSON_RECORD}`,
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
