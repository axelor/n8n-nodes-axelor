import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';

import { isValidResponse, processAxelorError } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'DMS File Record ID',
		name: 'fileRecordId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Record ID of the DMS file to access',
	},
];

const displayOptions = {
	show: {
		resource: ['dms'],
		operation: ['downloadFile'],
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

	const auth = {
		user: creds.username as string,
		pass: creds.password as string,
	};

	for (let i = 0; i < items.length; i++) {
		const fileRecordId = this.getNodeParameter('fileRecordId', i);

		if (!fileRecordId) {
			throw new NodeOperationError(
				this.getNode(),
				'Missing required parameter: DMS File Record ID',
			);
		}

		try {
			const response = await this.helpers.request!({
				method: 'GET',
				baseURL: baseUrl,
				url: `/ws/dms/download/${fileRecordId}`,
				auth,
				json: false,
				encoding: null,
				resolveWithFullResponse: true,
			});

			isValidResponse(response);

			const contentDisposition = response.headers['content-disposition'] as string;
			const mimeType = response.headers['content-type'] as string;

			let fileName = 'file';
			const fileNameMatch = /filename="(.+?)"/.exec(contentDisposition);
			if (fileNameMatch) {
				fileName = fileNameMatch[1];
			}

			const binaryData = await this.helpers.prepareBinaryData(
				Buffer.from(response.body as Buffer),
				fileName,
				mimeType,
			);

			returnData.push({
				json: {},
				binary: {
					data: binaryData,
				},
				pairedItem: { item: i },
			});
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
