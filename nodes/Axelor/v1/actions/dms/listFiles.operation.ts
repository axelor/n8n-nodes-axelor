import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { FIELD_TYPE, HTTP } from '../../helpers/constants';

export const properties: INodeProperties[] = [
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: FIELD_TYPE.NUMBER,
		default: '',
		description: 'ID of the parent folder from which to list files',
		typeOptions: {
			minValue: 0,
		},
	},
	{
		displayName: 'Pattern',
		name: 'pattern',
		type: FIELD_TYPE.STRING,
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

	for (let i = 0; i < items.length; i++) {
		const parentId = this.getNodeParameter('parentId', i);
		const pattern = this.getNodeParameter('pattern', i);

		const qs: IDataObject = {
			...(parentId && { parent: parentId }),
			...(pattern && { pattern }),
		};

		try {
			const url = `/ws/dms/files`;
			const body: IDataObject = {};
			const responseData = await apiRequest.call(this, HTTP.GET, url, body, qs);

			isValidResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData.data as IDataObject[]),
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
