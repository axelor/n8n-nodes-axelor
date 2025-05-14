import { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { processAxelorError } from '../../helpers/utils';
import { getMetaFields } from '../../helpers/api-helper';

export const description: INodeProperties[] = [
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { operation: ['find'] } },
	},
	{
		displayName: 'Find By ID',
		name: 'findById',
		type: 'boolean',
		default: false,
		description: 'Whether to find a record by ID',
		displayOptions: { show: { operation: ['find'] } },
	},
	{
		displayName: 'ID',
		name: 'recordId',
		type: 'string',
		default: '',
		description: 'ID of the record to find',
		displayOptions: { show: { operation: ['find'], findById: [true] } },
		required: true,
	},
];

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;
		try {
			const creds = await this.getCredentials('axelorApi');
			const baseUrl = creds.baseUrl as string;
			const findById = this.getNodeParameter('findById', i, false) as boolean;
			const recordId = this.getNodeParameter('recordId', i, null) as string;
			const limit = this.getNodeParameter('limit', i, 10) as number;

			const fields = await getMetaFields.call(this, model);
			const fieldNames = fields.map((f) => f.name);

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

			const records = resp.data || [];
			if (Array.isArray(records)) {
				returnData.push(...records.map((record) => ({ json: record })));
			} else {
				returnData.push({ json: records });
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
