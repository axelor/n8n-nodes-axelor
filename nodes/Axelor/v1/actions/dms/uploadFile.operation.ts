import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';

import { AxelorApiCredentials } from '../../helpers/interface';
import {
	isValidResponse,
	processAxelorError,
	getItemBinaryData,
	wrapData,
} from '../../helpers/utils';
import { HTTP } from '../../helpers/constants';

export const properties: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'inputDataFieldName',
		type: 'string',
		placeholder: '“e.g. data',
		default: 'data',
		required: true,
		hint: 'The name of the input field containing the binary file data to update the file',
		description:
			'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. My New File',
		description: 'If not specified, the original file name will be used',
	},
];

const displayOptions = {
	show: {
		resource: ['dms'],
		operation: ['uploadFile'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const { baseUrl, username, password } = (await this.getCredentials(
		'axelorApi',
	)) as AxelorApiCredentials;

	for (let i = 0; i < items.length; i++) {
		const inputDataFieldName = this.getNodeParameter('inputDataFieldName', i) as string;

		const { contentLength, fileContent, originalFilename, mimeType } = await getItemBinaryData.call(
			this,
			inputDataFieldName,
			i,
		);

		const name = (this.getNodeParameter('fileName', i) as string) || originalFilename;

		if (!Buffer.isBuffer(fileContent)) {
			throw new NodeOperationError(this.getNode(), 'Invalid file content. Expected a Buffer.');
		}

		try {
			const responseData = await this.helpers.request!({
				method: HTTP.POST,
				url: `/ws/files/upload`,
				baseURL: baseUrl,
				auth: { user: username, pass: password },
				body: fileContent,
				headers: {
					'X-File-Name': name,
					'X-File-Type': mimeType,
					'X-File-Size': contentLength,
					'X-File-Offset': 0,
					'Content-Type': 'application/octet-stream',
				},
				json: true,
			});

			isValidResponse(responseData);
			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			const processedError = processAxelorError(error as NodeApiError);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: processedError.message } });
				continue;
			}
			throw processedError;
		}
	}
	return returnData;
}
