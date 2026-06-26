import type { IExecuteFunctions } from 'n8n-workflow';
import * as transport from '../../../../v1/transport';
import * as find from '../../../../v1/actions/record/find.operation';
import * as apiHelper from '../../../../v1/helpers/api-helper';

jest.mock('../../../../v1/transport', () => {
	const originalModule = jest.requireActual('../../../../v1/transport');
	return { ...originalModule, apiRequest: jest.fn() };
});

jest.mock('../../../../v1/helpers/api-helper', () => {
	const originalModule = jest.requireActual('../../../../v1/helpers/api-helper');
	return { ...originalModule, getFields: jest.fn() };
});

type MockExecuteFunction = {
	getNodeParameter: jest.Mock;
	continueOnFail: jest.Mock;
	helpers: { constructExecutionMetaData: jest.Mock };
};

describe('Test Axelor, find operation', () => {
	let mockExecutionFunction: MockExecuteFunction;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecutionFunction = {
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				constructExecutionMetaData: jest.fn((item) => item),
			},
		};
	});

	test('Should find records successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = `com.axelor.test.model`;
		const limit = 50;
		const findById = false;

		const mockFields = {
			fields: [{ name: 'id' }, { name: 'name' }, { name: 'code' }, { name: 'updatedOn' }],
		};

		const mockResponse = {
			status: 0,
			data: [
				{ id: 1, name: 'Test Name 1', code: 'TEST001' },
				{ id: 2, name: 'Test Name 2', code: 'TEST002' },
			],
		};

		mockExecutionFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'limit') return limit;
			if (param === 'findById') return findById;
			return null;
		});

		(transport.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);

		const result = await find.execute.call(mockExecutionFunction as unknown as IExecuteFunctions, items);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(mockExecutionFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecutionFunction.getNodeParameter).toHaveBeenCalledWith('limit', 0, 10);
		expect(mockExecutionFunction.getNodeParameter).toHaveBeenCalledWith('findById', 0, false);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}/search`,
			expect.objectContaining({
				fields: ['id', 'name', 'code', 'updatedOn'],
			}),
		);

		expect(result).toEqual([
			{ json: { id: 1, name: 'Test Name 1', code: 'TEST001' } },
			{ json: { id: 2, name: 'Test Name 2', code: 'TEST002' } },
		]);
	});

	test('Should find record by ID successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = `com.axelor.test.model`;
		const limit = 1;
		const findById = true;
		const recordId = 123;

		const mockFields = {
			fields: [{ name: 'id' }, { name: 'name' }, { name: 'code' }, { name: 'updatedOn' }],
		};

		const mockResponse = {
			status: 0,
			data: [{ id: 123, name: 'Test Name', code: 'TEST123' }],
		};

		mockExecutionFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'recordId') return recordId;
			if (param === 'findById') return findById;
			if (param === 'limit') return limit;
			return null;
		});

		(transport.apiRequest as jest.Mock).mockResolvedValue(mockResponse);
		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);

		const result = await find.execute.call(mockExecutionFunction as unknown as IExecuteFunctions, items);

		expect(mockExecutionFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecutionFunction.getNodeParameter).toHaveBeenCalledWith('recordId', 0, null);
		expect(mockExecutionFunction.getNodeParameter).toHaveBeenCalledWith('findById', 0, false);
		expect(apiHelper.getFields).toHaveBeenCalledWith(model);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`,
			expect.objectContaining({
				fields: ['id', 'name', 'code', 'updatedOn'],
			}),
		);

		expect(result).toEqual([{ json: { id: 123, name: 'Test Name', code: 'TEST123' } }]);
	});
});
