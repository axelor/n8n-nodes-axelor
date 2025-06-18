import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	isValidResponse,
	processAxelorError,
	getItemBinaryData,
	wrapData,
} from '../../helpers/utils';
import { FIELD_TYPE, HTTP } from '../../helpers/constants';
import { apiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Input Data Field Name',
		name: 'inputDataFieldName',
		type: FIELD_TYPE.STRING,
		placeholder: '"e.g. data',
		default: 'data',
		required: true,
		hint: 'The name of the input field containing the binary file data to update the file',
		description:
			'Find the name of input field containing the binary data to update the file in the Input panel on the left, in the Binary tab',
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: FIELD_TYPE.STRING,
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
			const headers = {
				'X-File-Name': name,
				'X-File-Type': mimeType,
				'X-File-Size': contentLength,
				'X-File-Offset': 0,
				'Content-Type': 'application/octet-stream',
			};
			const url = `/ws/files/upload`;
			const qs: IDataObject = {};

			const responseData = await apiRequest.call(this, HTTP.POST, url, fileContent, qs, headers);

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