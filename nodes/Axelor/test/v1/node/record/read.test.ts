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

describe('Test Axeor, Read Operation', () => {
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
	test('Should read record successfully ', async () => {
		const items = [{ json: { data: 'test' } }];
		const model = 'com.axelor.test.Model';
		const recordId = 123;
		const advancedSettings = true;
		const fields = ['id', 'name'];

		const mockFields = {
			metaFields: [{ name: 'id' }, { name: 'name' }, { name: 'code' }],
		};
		const mockApiResponse = {
			status: 0,
			data: [{ id: 1, name: 'test' }],
		};

		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'model') return model;
			if (param === 'records') return recordId;
			if (param === 'advancedSettings') return advancedSettings;
			if (param === 'fields') return fields;
			return null;
		});

		(apiHelper.getFields as jest.Mock).mockResolvedValue(mockFields);
		(transport.apiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

		const result = await read.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

		//assertion
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('model', 0);
		expect(apiHelper.getFields).toHaveBeenCalledWith(model);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('records', 0);
		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('advancedSettings', 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			`/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`,
			{
				fields,
				data: {},
			},
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);

		expect(result).toEqual([{ json: { id: 1, name: 'test' } }]);
	});
});
