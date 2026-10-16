import type { IHookFunctions } from 'n8n-workflow';
import { webhookMethods } from '../../../v1/triggers/webhook-methods';

type MockHookFunctions = {
	getCredentials: jest.Mock;
	getWorkflowStaticData: jest.Mock;
	helpers: {
		httpRequestWithAuthentication: jest.Mock;
	};
};

describe('Test Axelor, Delete Trigger webhook delete', () => {
	let staticData: { webhookId?: number };
	let mockHookFunctions: MockHookFunctions;

	const deleteWebhook = async () =>
		await webhookMethods.default.delete.call(mockHookFunctions as unknown as IHookFunctions);

	beforeEach(() => {
		jest.clearAllMocks();
		staticData = { webhookId: 42 };
		mockHookFunctions = {
			getCredentials: jest.fn().mockResolvedValue({ baseUrl: 'https://erp.example.com' }),
			getWorkflowStaticData: jest.fn().mockReturnValue(staticData),
			helpers: {
				httpRequestWithAuthentication: jest.fn().mockResolvedValue({}),
			},
		};
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

	test('Should keep the webhook ID when deletion fails for another reason', async () => {
		mockHookFunctions.helpers.httpRequestWithAuthentication.mockRejectedValue({ httpCode: '500' });

		const result = await deleteWebhook();

		expect(result).toBe(false);
		expect(staticData.webhookId).toBe(42);
	});

	test('Should do nothing when no webhook was registered', async () => {
		delete staticData.webhookId;

		const result = await deleteWebhook();

		expect(result).toBe(false);
		expect(mockHookFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
