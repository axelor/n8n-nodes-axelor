import type { IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { webhookMethods } from '../../../v1/triggers/webhook-methods';

type MockHookFunctions = {
	getCredentials: jest.Mock;
	getWorkflowStaticData: jest.Mock;
	getNodeParameter: jest.Mock;
	getNodeWebhookUrl: jest.Mock;
	getNode: jest.Mock;
	helpers: {
		httpRequestWithAuthentication: jest.Mock;
	};
};

const WEBHOOK_URL = 'https://n8n.example.com/webhook/axelor/delete';
const MODEL = 'com.axelor.apps.base.db.Partner';

let staticData: { webhookId?: number };
let mockHookFunctions: MockHookFunctions;

beforeEach(() => {
	jest.clearAllMocks();
	staticData = {};
	mockHookFunctions = {
		getCredentials: jest.fn().mockResolvedValue({ baseUrl: 'https://erp.example.com' }),
		getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
		getNodeParameter: jest.fn().mockReturnValue(MODEL),
		getNodeWebhookUrl: jest.fn().mockReturnValue(WEBHOOK_URL),
		getNode: jest.fn().mockReturnValue({ name: 'Axelor Delete Trigger', type: 'axelorTrigger' }),
		helpers: {
			httpRequestWithAuthentication: jest.fn(),
		},
	};
});

describe('Test Axelor, Delete Trigger webhook checkExists', () => {
	const checkExists = async () =>
		await webhookMethods.default.checkExists.call(mockHookFunctions as unknown as IHookFunctions);

	test('Should return true and store the ID when the webhook exists in Axelor', async () => {
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
			status: 0,
			data: [{ id: 42 }],
		});

		const result = await checkExists();

		expect(mockHookFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'axelorApi',
			expect.objectContaining({
				method: 'POST',
				url: 'https://erp.example.com/ws/rest/com.axelor.connect.db.Webhook/search',
				body: expect.objectContaining({
					data: expect.objectContaining({
						_domainContext: { modelName: MODEL, url: WEBHOOK_URL },
					}),
				}),
			}),
		);
		expect(result).toBe(true);
		expect(staticData.webhookId).toBe(42);
	});

	test('Should return false when no webhook is registered in Axelor', async () => {
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({
			status: 0,
			data: [],
		});

		const result = await checkExists();

		expect(result).toBe(false);
		expect(staticData.webhookId).toBeUndefined();
	});

	test('Should surface request errors instead of returning false', async () => {
		const error = Object.assign(new Error('Authorization failed'), { httpCode: '401' });
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(error);

		await expect(checkExists()).rejects.toBe(error);
		expect(staticData.webhookId).toBeUndefined();
	});
});

describe('Test Axelor, Delete Trigger webhook delete', () => {
	const deleteWebhook = async () =>
		await webhookMethods.default.delete.call(mockHookFunctions as unknown as IHookFunctions);

	beforeEach(() => {
		staticData.webhookId = 42;
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue({});
	});

	test('Should delete the webhook in Axelor', async () => {
		const result = await deleteWebhook();

		expect(mockHookFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'axelorApi',
			expect.objectContaining({
				method: 'DELETE',
				url: 'https://erp.example.com/ws/rest/com.axelor.connect.db.Webhook/42',
			}),
		);
		expect(result).toBe(true);
		expect(staticData.webhookId).toBeUndefined();
	});

	test('Should succeed when the webhook was already removed in Axelor', async () => {
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue({ httpCode: '404' });

		const result = await deleteWebhook();

		expect(result).toBe(true);
		expect(staticData.webhookId).toBeUndefined();
	});

	test('Should surface other errors as NodeApiError and keep the webhook ID', async () => {
		const error = Object.assign(new Error('Internal Server Error'), { httpCode: '500' });
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue(error);

		await expect(deleteWebhook()).rejects.toBeInstanceOf(NodeApiError);
		expect(staticData.webhookId).toBe(42);
	});

	test('Should do nothing when no webhook was registered', async () => {
		delete staticData.webhookId;

		const result = await deleteWebhook();

		expect(result).toBe(false);
		expect(mockHookFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
