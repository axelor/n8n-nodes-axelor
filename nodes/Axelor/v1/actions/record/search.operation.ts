import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { getMetaFields } from '../../helpers/api-helper';

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
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];
const displayOptions = { show: { operation: ['search'] } };
export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const creds = await this.getCredentials('axelorApi');
			const baseUrl = creds.baseUrl as string;
			const limit = this.getNodeParameter('limit', i, 10) as number;

			const fields = await getMetaFields.call(this, model);
			const fieldNames = fields.map((f) => f.name);

			const query = this.getNodeParameter('query', i) as string;

			const body: any = { offset: 0, limit, fields: fieldNames, sortBy: [], data: {} };
			if (query) {
				body.data = { _domain: query };
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
