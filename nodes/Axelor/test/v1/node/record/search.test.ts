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

describe('Test Axelor, Search Operation', () => {
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
			if (param === 'fields') return fields;
			return null;
		});

		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);
		(transport.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await search.execute.call(mockExecuteFunction, item);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('advancedSettings', 0);

		expect(apiHelper.getFields).toHaveBeenCalledWith(model);
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

				limit,
				sortBy: ['-updatedOn'],
			}),
		);
		expect(result).toEqual([
			{ json: { id: 1, name: 'Bob' } },
			{ json: { id: 2, name: 'Bob-Lorex' } },
		]);
	});
});
