import type { IExecuteFunctions } from 'n8n-workflow';
import * as apiRequest from '../../../../v1/transport/index';
import * as listAttachments from '../../../../v1/actions/dms/listAttachments.operation';

jest.mock('../../../../v1/transport/index', () => {
	const originalModule = jest.requireActual('../../../../v1/transport/index');
	return { ...originalModule, apiRequest: jest.fn() };
});

type MockExecuteFunction = {
	getNodeParameter: jest.Mock;
	continueOnFail: jest.Mock;
	helpers: { constructExecutionMetaData: jest.Mock };
};

describe('Test Axelor, list attachments operation', () => {
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

	test('should list attachments successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const recordId = 123;

		const mockResponse = {
			status: 0,
			data: [
				{ id: 1, fileName: 'document1.pdf', fileType: 'application/pdf' },
				{
					id: 2,
					fileName: 'document2.docx',
					fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				},
			],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'records') return recordId;
			return null;
		});

		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await listAttachments.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('records', 0);

		expect(apiRequest.apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'GET',
			`/ws/dms/attachments/${model}/${recordId}`,
		);
		expect(result).toEqual([
			{ json: { id: 1, fileName: 'document1.pdf', fileType: 'application/pdf' } },
			{
				json: {
					id: 2,
					fileName: 'document2.docx',
					fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				},
			},
		]);
	});

	test('should return empty data when no attachments exist', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const recordId = 456;

		const mockResponse = {
			status: 0,
			data: [],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'records') return recordId;
			return null;
		});

		(apiRequest.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await listAttachments.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

		expect(apiRequest.apiRequest).toHaveBeenCalledWith(
			'GET',
			`/ws/dms/attachments/${model}/${recordId}`,
		);
		expect(result).toEqual([]);
	});
});
