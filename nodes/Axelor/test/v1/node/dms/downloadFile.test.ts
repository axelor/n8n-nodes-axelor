import { NodeOperationError } from 'n8n-workflow';
import * as downloadFile from '../../../../v1/actions/dms/downloadFile.operation';

describe('Test Axelor, downloadFile operation', () => {
	let mockExecuteFunction: any;
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
				request: jest.fn(),
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
		mockExecuteFunction.helpers.request.mockResolvedValue(mockResponse);
		mockExecuteFunction.helpers.prepareBinaryData.mockReturnValue(mockBinaryData);

		const result = await downloadFile.execute.call(mockExecuteFunction, items);
		//assertions
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fileRecordId', 0);
		expect(mockExecuteFunction.getCredentials).toHaveBeenCalledWith('axelorApi');
		expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'GET',
				baseURL: 'https://api.axelor.com/',
				auth: { user: 'test', pass: 'test' },
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

		await expect(downloadFile.execute.call(mockExecuteFunction, items)).rejects.toThrow(
			new NodeOperationError(
				mockExecuteFunction.getNode(),
				'Missing required parameter: DMS File Record ID',
			),
		);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fileRecordId', 0);
		expect(mockExecuteFunction.helpers.request).not.toHaveBeenCalled();
	});
});
