import * as apiRequest from '../../../../v1/transport/index';
import * as addAttachments from '../../../../v1/actions/dms/addAttachments.operation';

jest.mock('../../../../v1/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v1/transport/index');
	return { ...originalModule, apiRequest: jest.fn() };
});

describe('Test Axelor, add attachment operation', () => {
	let mockExecuteFunction: any;
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
	test('should add attachment successfully', async () => {
		const items = [{ json: { item: 'test' } }];
		const model = 'com.axelor.test.Model';
		const recordId = 123;
		const uploadIds = { values: [{ id: 1 }] };

		// mock responses
		const mockResponse = {
			status: 0,
			data: [{ fileName: 'abc.txt', id: 1 }],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation(
			(param: string, index: number, defaultValue?: any) => {
				if (param === 'model') return model;
				if (param === 'records') return recordId;
				if (param === 'uploadIds.values') return uploadIds.values;
				return defaultValue;
			},
		);

		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await addAttachments.execute.call(mockExecuteFunction, items);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('records', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('uploadIds.values', 0, []);

		expect(apiRequest.apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'PUT',
			`/ws/dms/attachments/${encodeURIComponent(model)}/${recordId}`,
			{ records: uploadIds.values },
		);
		expect(result).toEqual([
			{
				json: {
					status: 0,
					data: [{ fileName: 'abc.txt', id: 1 }],
				},
			},
		]);
	});

	test('should handle multiple upload IDs', async () => {
		const items = [{ json: { item: 'test' } }];
		const model = 'com.axelor.test.Model';
		const recordId = 123;
		const uploadIds = { values: [{ id: 1 }, { id: 2 }, { id: 3 }] };

		const mockResponse = {
			status: 0,
			data: [
				{ fileName: 'file1.txt', id: 1 },
				{ fileName: 'file2.pdf', id: 2 },
				{ fileName: 'file3.docx', id: 3 },
			],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation(
			(param: string, _idx: number, defaultValue?: any) => {
				if (param === 'model') return model;
				if (param === 'records') return recordId;
				if (param === 'uploadIds.values') return uploadIds.values;
				return defaultValue;
			},
		);

		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await addAttachments.execute.call(mockExecuteFunction, items);

		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'PUT',
			`/ws/dms/attachments/${encodeURIComponent(model)}/${recordId}`,
			{ records: uploadIds.values },
		);
		expect(result).toEqual([
			{
				json: {
					status: 0,
					data: [
						{ fileName: 'file1.txt', id: 1 },
						{ fileName: 'file2.pdf', id: 2 },
						{ fileName: 'file3.docx', id: 3 },
					],
				},
			},
		]);
	});
});
