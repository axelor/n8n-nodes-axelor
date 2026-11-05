import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import * as transport from '../../../../v1/transport';
import * as businessServiceCall from '../../../../v1/actions/generic/businessServiceCall.operation';

jest.mock('../../../../v1/transport', () => {
	const originalModule = jest.requireActual('../../../../v1/transport');
	return { ...originalModule, apiRequest: jest.fn() };
});

type MockExecuteFunction = {
	getNodeParameter: jest.Mock;
	getCredentials: jest.Mock;
	getNode: jest.Mock;
	continueOnFail: jest.Mock;
	helpers: {
		httpRequestWithAuthentication: jest.Mock;
		constructExecutionMetaData: jest.Mock;
	};
};

type ItemParams = { module: string; action: string };

const actionParam = (name: string, classFullyQualifiedName: string) =>
	JSON.stringify({ name, classFullyQualifiedName });

describe('Test Axelor, businessServiceCall operation', () => {
	let mockExecuteFunction: MockExecuteFunction;

	const serviceInfo = {
		target: '/connect/v1/base/ping',
		httpMethod: 'GET',
		requestBody: { bodyParameters: [] },
	};

	const setParameters = (perItem: ItemParams[]) => {
		mockExecuteFunction.getNodeParameter.mockImplementation((param: string, i: number) => {
			if (param === 'module') return perItem[i].module;
			if (param === 'action') return perItem[i].action;
			if (param === 'parameters') return { schema: [], value: {} };
			return null;
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockExecuteFunction = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({ baseUrl: 'https://erp.example.com' }),
			getNode: jest.fn().mockReturnValue({ name: 'Axelor' }),
			continueOnFail: jest.fn().mockReturnValue(false),
			helpers: {
				httpRequestWithAuthentication: jest
					.fn()
					.mockResolvedValue({ status: 0, data: [{ id: 1 }] }),
				constructExecutionMetaData: jest.fn((data) => data),
			},
		};
		(transport.apiRequest as jest.Mock).mockResolvedValue(serviceInfo);
	});

	const execute = (items: INodeExecutionData[]) =>
		businessServiceCall.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, items);

	test('should read the module parameter per item and look up the service info', async () => {
		setParameters([{ module: 'base', action: actionParam('ping', 'com.axelor.base.Ping') }]);

		const result = await execute([{ json: {} }]);

		expect(mockExecuteFunction.getNodeParameter).toHaveBeenCalledWith('module', 0);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'GET',
			'/ws/connect/connect-web-service-info',
			{},
			{ classFullyQualifiedName: 'com.axelor.base.Ping', name: 'ping' },
		);
		expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'axelorApi',
			expect.objectContaining({ method: 'GET', url: '/ws/connect/v1/base/ping' }),
		);
		expect(result).toEqual([{ json: { status: 0, data: [{ id: 1 }] } }]);
	});

	test('should cache the service info per module and action', async () => {
		setParameters([
			{ module: 'base', action: actionParam('ping', 'com.axelor.base.Ping') },
			{ module: 'base', action: actionParam('ping', 'com.axelor.base.Ping') },
			{ module: 'crm', action: actionParam('ping', 'com.axelor.crm.Ping') },
		]);

		await execute([{ json: {} }, { json: {} }, { json: {} }]);

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'GET',
			'/ws/connect/connect-web-service-info',
			{},
			{ classFullyQualifiedName: 'com.axelor.crm.Ping', name: 'ping' },
		);
	});

	test('should fail when no module is selected', async () => {
		setParameters([{ module: '', action: actionParam('ping', 'com.axelor.base.Ping') }]);

		await expect(execute([{ json: {} }])).rejects.toThrow('Module and Action must be selected');
		expect(transport.apiRequest).not.toHaveBeenCalled();
	});

	test('should fail when no action is selected', async () => {
		setParameters([{ module: 'base', action: '' }]);

		await expect(execute([{ json: {} }])).rejects.toThrow('Module and Action must be selected');
	});
});
