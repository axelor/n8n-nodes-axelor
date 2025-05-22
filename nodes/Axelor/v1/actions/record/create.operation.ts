import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import { updateDisplayOptions, NodeApiError } from 'n8n-workflow';

import { getMetaFields } from '../../helpers/api-helper';
import {
	buildRequestData,
	getChangedFieldNames,
	isValidResponse,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		required: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMetaModelFields',
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
		resource: ['record'],
		operation: ['create'],
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

	const metaFieldCache: Record<string, any> = {};

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const mapping = this.getNodeParameter('fields', i, {}) as any;

			let fields = metaFieldCache[model];
			if (!fields) {
				fields = await getMetaFields.call(this, model);
				metaFieldCache[model] = fields;
			}

			// Extract only the field names that have actually changed (not removed)
			const changedKeys = getChangedFieldNames(mapping);

			// Build the final data payload using the changed keys only
			const data = buildRequestData(changedKeys, mapping, fields);

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
