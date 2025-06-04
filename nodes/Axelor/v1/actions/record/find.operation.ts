import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { getFields } from '../../helpers/api-helper';

export const properties: INodeProperties[] = [
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Find By ID',
		name: 'findById',
		type: 'boolean',
		default: false,
		description: 'Whether to find a record by ID',
	},
	{
		displayName: 'ID',
		name: 'recordId',
		type: 'string',
		default: '',
		description: 'ID of the record to find',
		displayOptions: { show: { findById: [true] } },
		required: true,
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['find'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	const metaFieldCache: Record<string, any> = {};

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const creds = await this.getCredentials('axelorApi');
			const baseUrl = creds.baseUrl as string;
			const findById = this.getNodeParameter('findById', i, false) as boolean;
			const recordId = this.getNodeParameter('recordId', i, null) as string;
			const limit = this.getNodeParameter('limit', i, 10) as number;

			let cacheData = metaFieldCache[model];
			if (!cacheData) {
				const data = await getFields.call(this, model);
				metaFieldCache[model] = data;
				cacheData = data;
			}
			const fields = [...(cacheData?.fields || [])];
			const fieldNames = fields.map((f: { name: string }) => f.name);

			const url = findById
				? `/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`
				: `/ws/rest/${encodeURIComponent(model)}/search`;

			const body: any = {
				offset: 0,
				limit,
				fields: fieldNames,
				sortBy: ['-updatedOn'],
				data: {},
			};

			const resp = await this.helpers.request!({
				method: 'POST',
				url,
				baseURL: baseUrl,
				auth: { user: creds.username as string, pass: creds.password as string },
				body,
				json: true,
			});

			isValidResponse(resp);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData((resp.data as IDataObject[]) || []),
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
