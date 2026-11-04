import type { IExecuteFunctions } from 'n8n-workflow';
import * as apiHelper from '../../../../v1/helpers/api-helper';
import * as transport from '../../../../v1/transport';
import * as read from '../../../../v1/actions/record/read.operation';

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

describe('Test Axelor, Read Operation', () => {
	let mockExecuteFunction: MockExecuteFunction;

	const model = 'com.axelor.test.Model';
	const recordId = 123;
	const url = `/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`;
	const mockFields = {
		metaFields: [{ name: 'id' }, { name: 'name' }, { name: 'code' }],
	};
	const mockApiResponse = {
		status: 0,
		data: [{ id: 1, name: 'test' }],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunction = {
			getNodeParameter: jest.fn(),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				constructExecutionMetaData: jest.fn((item) => item),
			},
		};
		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);
		(transport.apiRequest as jest.Mock).mockResolvedValue(mockApiResponse);
	});

	test('Should read a record with the selected fields', async () => {
		const items = [{ json: { data: 'test' } }];
		const fields = ['id', 'name'];

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'records') return recordId;
			if (param === 'options') return { fields };
			return null;
		});

		const result = await read.execute.call(
			mockExecuteFunction as unknown as IExecuteFunctions,
			items,
		);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(apiHelper.getFields).toHaveBeenCalledWith(model);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('records', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('options', 0, {});

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('POST', url, { fields, data: {} });

		expect(result).toEqual([{ json: { id: 1, name: 'test' } }]);
	});

	test('Should read a record with all model fields when no option is set', async () => {
		const items = [{ json: {} }];

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'records') return recordId;
			if (param === 'options') return {};
			return null;
		});

		const result = await read.execute.call(
			mockExecuteFunction as unknown as IExecuteFunctions,
			items,
		);

		expect(transport.apiRequest).toHaveBeenCalledWith('POST', url, {
			fields: ['id', 'name', 'code'],
			data: {},
		});
		expect(result).toEqual([{ json: { id: 1, name: 'test' } }]);
	});
});
