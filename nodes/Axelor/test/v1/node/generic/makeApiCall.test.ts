import type { IExecuteFunctions } from 'n8n-workflow';
import * as makeApiCall from '../../../../v1/actions/generic/makeApiCall.operation';

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

describe('Test Axelor, makeApiCall operation', () => {
	let mockExecuteFunction: MockExecuteFunction;

	const setParameters = (url: string) => {
		mockExecuteFunction.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'url') return url;
			if (param === 'method') return 'GET';
			if (param === 'headers') return {};
			if (param === 'queryParameters') return {};
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
				httpRequestWithAuthentication: jest.fn().mockResolvedValue({ status: 0, data: [{ id: 1 }] }),
				constructExecutionMetaData: jest.fn((data) => data),
			},
		};
	});

	test('Should call a relative path on the Base URL', async () => {
		setParameters('/ws/rest/com.axelor.apps.base.db.Partner/1');

		const result = await makeApiCall.execute.call(
			mockExecuteFunction as unknown as IExecuteFunctions,
			[{ json: {} }],
		);

		expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'axelorApi',
			expect.objectContaining({
				method: 'GET',
				url: '/ws/rest/com.axelor.apps.base.db.Partner/1',
				baseURL: 'https://erp.example.com',
			}),
		);
		expect(result).toEqual([{ json: { id: 1 } }]);
	});

	test.each([
		'https://evil.example.com/steal',
		'//evil.example.com/steal',
		'/\\evil.example.com/steal',
		'/\t/evil.example.com',
		'ws/rest/com.axelor.apps.base.db.Partner',
		'',
	])('Should reject URL %j without sending a request', async (url) => {
		setParameters(url);

		await expect(
			makeApiCall.execute.call(mockExecuteFunction as unknown as IExecuteFunctions, [{ json: {} }]),
		).rejects.toThrow('enter a path relative to the Base URL');

		expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
