import type { IExecuteFunctions } from 'n8n-workflow';
import * as apiHelper from '../../../../v1/helpers/api-helper';
import * as transport from '../../../../v1/transport';
import * as update from '../../../../v1/actions/record/update.operation';

jest.mock('../../../../v1/transport', () => {
	const originalModule = jest.requireActual('../../../../v1/transport');
	return { ...originalModule, apiRequest: jest.fn() };
});

jest.mock('../../../../v1/helpers/api-helper', () => {
	const originalModule = jest.requireActual('../../../../v1/helpers/api-helper');
	return {
		...originalModule,
		getFields: jest.fn(),
		getMetaModelFieldRecord: jest.fn(),
	};
});

type MockExecuteFunction = {
	getNodeParameter: jest.Mock;
	continueOnFail: jest.Mock;
	helpers: { constructExecutionMetaData: jest.Mock };
};

describe('Test Axelor, update operation', () => {
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

	test('Should update record successfully', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const recordId = 123;
		const mappingData = {
			schema: [
				{ id: 'name', removed: false },
				{ id: 'code', removed: false },
			],
			value: {
				name: 'Updated Name',
				code: 'UPD001',
			},
		};

		const mockRecord = {
			id: recordId,
			version: 2,
			name: 'Old Name',
			code: 'OLD001',
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
			data: [{ id: recordId, name: 'Updated Name', code: 'UPD001', version: 3 }],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation(
			(param: string, _idx: number, defaultValue?: unknown) => {
				if (param === 'model') return model;
				if (param === 'records') return recordId;
				if (param === 'fields') return mappingData;
				return defaultValue;
			},
		);

		(apiHelper.getMetaModelFieldRecord as jest.Mock).mockResolvedValue(mockRecord);
		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);
		(transport.apiRequest as jest.Mock).mockResolvedValue(mockResponse);

		const result = await update.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('records', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('fields', 0, {});
		expect(apiHelper.getMetaModelFieldRecord).toHaveBeenCalledWith(model, recordId);
		expect(apiHelper.getFields).toHaveBeenCalledWith(model);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}`,
			{
				data: {
					id: recordId,
					version: 2,
					name: 'Updated Name',
					code: 'UPD001',
				},
			},
		);
		expect(result).toEqual([
			{
				json: { id: recordId, name: 'Updated Name', code: 'UPD001', version: 3 },
			},
		]);
	});
});
