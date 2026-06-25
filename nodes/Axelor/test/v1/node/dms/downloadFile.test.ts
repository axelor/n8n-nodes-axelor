import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import * as downloadFile from '../../../../v1/actions/dms/downloadFile.operation';

type MockExecuteFunction = {
	getNode: jest.Mock;
	getNodeParameter: jest.Mock;
	getCredentials: jest.Mock;
	continueOnFail: jest.Mock;
	helpers: {
		httpRequestWithAuthentication: jest.Mock;
		prepareBinaryData: jest.Mock;
	};
};

describe('Test Axelor, downloadFile operation', () => {
	let mockExecuteFunction: MockExecuteFunction;
	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunction = {
			getNode: jest.fn().mockReturnValue({ name: 'Axelor' }),
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockReturnValue({
				baseUrl: 'https://api.axelor.com/',
				username: 'test',
				password: 'test',
			}),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequestWithAuthentication: jest.fn(),
				prepareBinaryData: jest.fn(),
			},
		};
	});

	test('Should download file successfully', async () => {
		const items = [{ json: { item: 'test' } }];
		const fileRecordId = 123;

		const mockResponseBody = Buffer.from('file content');
		const mockResponse = {
			body: mockResponseBody,
			headers: {
				'content-disposition': 'attachment; filename="test-file.pdf"',
				'content-type': 'application/pdf',
			},
		};
		const mockBinaryData = {
			data: 'base64data',
			fileName: 'test-file.pdf',
			mimeType: 'application/pdf',
		};

		mockExecuteFunction.getNodeParameter.mockReturnValue(fileRecordId);
		mockExecuteFunction.helpers.httpRequestWithAuthentication.mockResolvedValue(mockResponse);
		mockExecuteFunction.helpers.prepareBinaryData.mockReturnValue(mockBinaryData);

		const result = await downloadFile.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);
		//assertions
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fileRecordId', 0);
		expect(mockExecuteFunction.getCredentials).toHaveBeenCalledWith('axelorApi');
		expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'axelorApi',
			expect.objectContaining({
				method: 'GET',
				baseURL: 'https://api.axelor.com/',
				url: `/ws/dms/download/${fileRecordId}`,
			}),
		);

		expect(mockExecuteFunction.helpers.prepareBinaryData).toHaveBeenCalledWith(
			mockResponseBody,
			'test-file.pdf',
			'application/pdf',
		);

		expect(result).toEqual([
			{
				json: {},
				binary: {
					data: mockBinaryData,
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	test('should handle Missing file record ID', async () => {
		const items = [{ json: { item: 'test' } }];
		mockExecuteFunction.getNodeParameter.mockReturnValue(undefined);

		await expect(downloadFile.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items)).rejects.toThrow(
			new NodeOperationError(
				mockExecuteFunction.getNode(),
				'Missing required parameter: DMS File Record ID',
			),
		);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fileRecordId', 0);
		expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
