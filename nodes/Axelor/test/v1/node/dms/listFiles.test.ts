import * as apiRequest from '../../../../v1/transport/index';
import * as listFiles from '../../../../v1/actions/dms/listFiles.operation';

jest.mock('../../../../v1/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v1/transport/index');
	return { ...originalModule, apiRequest: jest.fn() };
});

describe('Test Axelor, list files operation', () => {
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

	test('should list files with parent ID and pattern', async () => {
		const items = [{ json: { data: 'test' } }];
		const parentId = 123;
		const pattern = '*.pdf';

		const mockResponse = {
			status: 0,
			total: 2,
			data: [
				{ id: 1, fileName: 'document1.pdf', isDirectory: false },
				{ id: 2, fileName: 'document2.pdf', isDirectory: false },
			],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string, index: number) => {
			if (param === 'parentId') return parentId;
			if (param === 'pattern') return pattern;
			return null;
		});

		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		// execute the function
		const result = await listFiles.execute.call(mockExecuteFunction, items);

		// assertions
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('parentId', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('pattern', 0);

		expect(apiRequest.apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'GET',
			'/ws/dms/files',
			{},
			{ parent: parentId, pattern: pattern },
		);
		expect(result).toEqual([
			{
				json: {
					status: 0,
					total: 2,
					data: [
						{ id: 1, fileName: 'document1.pdf', isDirectory: false },
						{ id: 2, fileName: 'document2.pdf', isDirectory: false },
					],
				},
			},
		]);
	});

	test('should list files with only parent ID', async () => {
		const items = [{ json: { data: 'test' } }];
		const parentId = 123;
		const pattern = '';

		// mock response
		const mockResponse = {
			status: 0,
			data: [
				{ id: 1, fileName: 'document1.pdf', isDirectory: false },
				{ id: 2, fileName: 'folder1', isDirectory: true },
				{ id: 3, fileName: 'document2.txt', isDirectory: false },
			],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string, index: number) => {
			if (param === 'parentId') return parentId;
			if (param === 'pattern') return pattern;
			return null;
		});

		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		// execute the function
		const result = await listFiles.execute.call(mockExecuteFunction, items);

		// assertions
		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'GET',
			'/ws/dms/files',
			{},
			{ parent: parentId },
		);
		expect(result).toEqual([
			{
				json: {
					status: 0,
					data: [
						{ id: 1, fileName: 'document1.pdf', isDirectory: false },
						{ id: 2, fileName: 'folder1', isDirectory: true },
						{ id: 3, fileName: 'document2.txt', isDirectory: false },
					],
				},
			},
		]);
	});
});
