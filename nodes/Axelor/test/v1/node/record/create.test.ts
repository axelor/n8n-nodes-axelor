import type { IExecuteFunctions } from 'n8n-workflow';
import * as apiHelper from '../../../../v1/helpers/api-helper';
import * as transport from '../../../../v1/transport';
import * as create from '../../../../v1/actions/record/create.operation';

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

describe('Test Axelor, create operation', () => {
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
	test('Should create record successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const mappingData = {
			schema: [
				{ id: 'name', removed: false },
				{ id: 'code', removed: false },
			],
			value: {
				name: 'Test Name',
				code: 'TEST001',
			},
		};

		const mockFields = {
			metaFields: [
				{
					name: 'name',
					type: 'string',
				},
				{
					name: 'code',
					type: 'string',
				},
			],
			jsonFields: [],
			metaJsonFields: [],
		};

		const mockResponse = {
			status: 0,
			data: [{ id: 1, name: 'Test Name', code: 'TEST001' }],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'fields') return mappingData;
			return null;
		});

		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);
		(transport.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await create.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fields', 0, {});
		expect(apiHelper.getFields).toHaveBeenCalledWith(model);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}`,
			expect.objectContaining({
				data: {
					name: 'Test Name',
					code: 'TEST001',
				},
			}),
		);
		expect(result).toEqual([
			{
				json: {
					status: 0,
					data: [{ id: 1, name: 'Test Name', code: 'TEST001' }],
				},
			},
		]);
	});
});
