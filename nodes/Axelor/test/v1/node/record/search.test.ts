import type { IExecuteFunctions } from 'n8n-workflow';
import * as apiHelper from '../../../../v1/helpers/api-helper';
import * as transport from '../../../../v1/transport';
import * as search from '../../../../v1/actions/record/search.operation';

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

describe('Test Axelor, Search Operation', () => {
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

	test('should search record successfully', async () => {
		const item = [{ json: { test: 'test' } }];
		const model = 'com.axelor.test.model';
		const advancedSettings = true;
		const limit = 50;
		const query = 'self.name like :name';
		const archived = false;
		const sortBy = {
			sortBy: [{ field: 'updatedOn', rule: 'desc' }],
		};
		const context = {
			context: [{ key: 'name', value: '%Bob%' }],
		};
		const fields = ['id', 'name'];

		const mockFields = {
			metaFields: [
				{
					name: 'id',
					type: 'number',
				},
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
			total: 2,
			data: [
				{ id: 1, name: 'Bob' },
				{ id: 2, name: 'Bob-Lorex' },
			],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'query') return query;
			if (param === 'model') return model;
			if (param === 'context') return context;
			if (param === 'sortBy') return sortBy;
			if (param === 'limit') return limit;
			if (param === 'archived') return archived;
			if (param === 'advancedSettings') return advancedSettings;
			if (param === 'returnAll') return false;
			if (param === 'fields') return fields;
			return null;
		});

		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);
		(transport.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await search.execute.call(
			mockExecuteFunction as unknown as IExecuteFunctions,
			item,
		);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('advancedSettings', 0);

		expect(apiHelper.getFields).toHaveBeenCalledWith(model);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('returnAll', 0, false);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('limit', 0, 50);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('query', 0, '');
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('sortBy', 0, {});
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('archived', 0, false);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('context', 0, {});

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}/search`,
			expect.objectContaining({
				fields,
				data: {
					_domain: 'self.name like :name',
					_domainContext: { name: '%Bob%' },
					_archived: false,
				},

				offset: 0,
				limit,
				sortBy: ['-updatedOn', 'id'],
			}),
		);
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{ json: { id: 1, name: 'Bob' } },
			{ json: { id: 2, name: 'Bob-Lorex' } },
		]);
	});

	test('should page through all records when Return All is enabled', async () => {
		const item = [{ json: {} }];
		const model = 'com.axelor.test.model';
		const url = `/ws/rest/${encodeURIComponent(model)}/search`;
		const page = (from: number, count: number) =>
			Array.from({ length: count }, (_, i) => ({ id: from + i }));

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'query') return '';
			if (param === 'advancedSettings') return false;
			if (param === 'returnAll') return true;
			if (param === 'limit') return 50;
			return null;
		});

		(apiHelper.getFields as jest.Mock).mockResolvedValue({
			metaFields: [{ name: 'id', type: 'number' }],
			jsonFields: [],
			metaJsonFields: [],
		});
		(transport.apiRequest as jest.Mock)
			.mockResolvedValueOnce({ status: 0, total: 230, data: page(0, 100) })
			.mockResolvedValueOnce({ status: 0, total: 230, data: page(100, 100) })
			.mockResolvedValueOnce({ status: 0, total: 230, data: page(200, 30) });

		const result = await search.execute.call(
			mockExecuteFunction as unknown as IExecuteFunctions,
			item,
		);

		expect(result).toHaveLength(230);
		expect(transport.apiRequest).toHaveBeenCalledTimes(3);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(1, 'POST', url, {
			data: {},
			fields: ['id'],
			sortBy: ['id'],
			offset: 0,
			limit: 100,
		});
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			url,
			expect.objectContaining({ offset: 100, limit: 100 }),
		);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			url,
			expect.objectContaining({ offset: 200, limit: 100 }),
		);
	});
});
