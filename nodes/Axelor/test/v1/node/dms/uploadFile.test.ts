import type { IExecuteFunctions } from 'n8n-workflow';
import * as apiRequest from '../../../../v1/transport/index';
import * as utils from '../../../../v1/helpers/utils';
import * as uploadFile from '../../../../v1/actions/dms/uploadFile.operation';

jest.mock('../../../../v1/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v1/transport/index');
	return { ...originalModule, apiRequest: jest.fn() };
});

jest.mock('../../../../v1/helpers/utils', () => {
	const originalModule = jest.requireActual('../../../../v1/helpers/utils');
	return {
		...originalModule,
		getItemBinaryData: jest.fn(),
	};
});

type MockExecuteFunction = {
	getNodeParameter: jest.Mock;
	continueOnFail: jest.Mock;
	helpers: { constructExecutionMetaData: jest.Mock };
};

describe('Test Axelor, upload file operation', () => {
	let mockExecuteFunction: MockExecuteFunction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunction = {
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				constructExecutionMetaData: jest.fn((item) => item),
			},
		};
	});

	test('should upload file successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const inputDataFieldName = 'data';
		const fileName = 'custom-filename.pdf';

		const fileContent = Buffer.from('test file content');
		const binaryData = {
			contentLength: fileContent.length,
			fileContent,
			originalFilename: 'original.pdf',
			mimeType: 'application/pdf',
		};

		const mockResponse = { id: 123, fileName: 'custom-filename.pdf' };

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'inputDataFieldName') return inputDataFieldName;
			if (param === 'fileName') return fileName;
			return null;
		});

		(utils.getItemBinaryData as jest.Mock).mockResolvedValue(binaryData);
		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await uploadFile.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('inputDataFieldName', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fileName', 0);
		expect(utils.getItemBinaryData).toHaveBeenCalledWith(inputDataFieldName, 0);

		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/ws/files/upload',
			fileContent,
			{},
			{
				'X-File-Name': fileName,
				'X-File-Type': binaryData.mimeType,
				'X-File-Size': binaryData.contentLength,
				'X-File-Offset': 0,
				'Content-Type': 'application/octet-stream',
			},
		);

		expect(result).toEqual([{ json: { id: 123, fileName: 'custom-filename.pdf' } }]);
	});
});
