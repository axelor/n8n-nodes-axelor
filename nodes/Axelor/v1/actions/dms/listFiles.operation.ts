import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { AxelorApiCredentials } from '../../helpers/interface';
import { HTTP } from '../../helpers/constants';

export const properties: INodeProperties[] = [
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'number',
		default: '',
		description: 'ID of the parent folder from which to list files',
		typeOptions: {
			minValue: 0,
		},
	},
	{
		displayName: 'Pattern',
		name: 'pattern',
		type: 'string',
		default: '',
		description: 'Pattern to match file names',
	},
];

const displayOptions = {
	show: {
		resource: ['dms'],
		operation: ['listFiles'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

	const auth = {
		user: creds.username,
		pass: creds.password,
	};

	for (let i = 0; i < items.length; i++) {
		const parentId = this.getNodeParameter('parentId', i);
		const pattern = this.getNodeParameter('pattern', i);

		const qs: IDataObject = {
			...(parentId && { parent: parentId }),
			...(pattern && { pattern }),
		};

		try {
			const responseData = await this.helpers.request!({
				method: HTTP.GET,
				baseURL: creds.baseUrl,
				url: '/ws/dms/files',
				auth,
				json: true,
				qs,
			});

			isValidResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const handledError = processAxelorError(error as NodeApiError);

			if (this.continueOnFail()) {
				returnData.push({ json: { error: handledError.message } });
				continue;
			}

			throw handledError;
		}
	}

	return returnData;
}
