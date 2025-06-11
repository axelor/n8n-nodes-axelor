import * as transport from '../../../../v1/transport';
import * as deleteOp from '../../../../v1/actions/record/delete.operation';

jest.mock('../../../../v1/transport', () => {
	const originalModule = jest.requireActual('../../../../v1/transport');
	return { ...originalModule, apiRequest: jest.fn() };
});

describe('Test Axelor, delete operation', () => {
	let mockExecuteFunction: any;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunction = {
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockResolvedValue(false),
		};
	});

	test('Should delete a single record successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const deleteMultiple = false;
		const singleRecordId = 123;

		const mockApiResponse = {
			status: 0,
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'deleteMultiple') return deleteMultiple;
			if (param === 'singleRecordId') return singleRecordId;
			return null;
		});

		(transport.apiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

		const result = await deleteOp.execute.call(mockExecuteFunction, items);

		//assertions
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('deleteMultiple', 0, false);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('singleRecordId', 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}/removeAll`,
			{
				records: [{ id: singleRecordId }],
			},
		);

		expect(result).toEqual([
			{
				json: {
					success: true,
					message: 'Successfully deleted 1 record(s)',
					deletedIds: [{ id: singleRecordId }],
				},
			},
		]);
	});

	test('Should test multiple records successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const deleteMultiple = true;
		const recordIds = [123, 456, 987];
		const mockApiResponse = {
			status: 0,
		};

		mockExecuteFunction.getNodeParameter.mockImplementation(
			(param: string, _idx: number, defaultValue: string) => {
				if (param === 'model') return model;
				if (param === 'deleteMultiple') return deleteMultiple;
				if (param === 'recordIds') return recordIds;
				return defaultValue;
			},
		);

		(transport.apiRequest as jest.Mock).mockResolvedValue(mockApiResponse);
		const result = await deleteOp.execute.call(mockExecuteFunction, items);

		console.log(result);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('deleteMultiple', 0, false);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('recordIds', 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}/removeAll`,
			{
				records: [{ id: 123 }, { id: 456 }, { id: 987 }],
			},
		);

		expect(result).toEqual([
			{
				json: {
					success: true,
					message: 'Successfully deleted 3 record(s)',
					deletedIds: [{ id: 123 }, { id: 456 }, { id: 987 }],
				},
			},
		]);
	});
});
