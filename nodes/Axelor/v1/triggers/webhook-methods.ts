import { IDataObject, IHookFunctions, JsonObject, NodeApiError } from 'n8n-workflow';
import { MODEL } from '../helpers/constants';

export const webhookMethods = {
	default: {
		/**
		 * Check if webhook exists in Axelor by filtering on modelName & URL.
		 */
		async checkExists(this: IHookFunctions): Promise<boolean> {
			const credentials = await this.getCredentials('axelorApi');
			const webhookData = this.getWorkflowStaticData('node');
			const modelName = this.getNodeParameter('model') as string;
			const webhookUrl = this.getNodeWebhookUrl('default') as string;

			const body: IDataObject = {
				offset: 0,
				limit: 1,
				fields: ['id'],
				data: {
					_domain: 'self.modelName = :modelName and self.url = :url',
					_domainContext: {
						modelName,
						url: webhookUrl,
					},
				},
			};

			try {
				const response = await this.helpers.httpRequestWithAuthentication.call(this, 'axelorApi', {
					method: 'POST',
					url: `${credentials.baseUrl}/ws/rest/${MODEL.CONNECT_DB_WEBHOOK}/search`,
					body,
					json: true,
				});
				if (response.data && Array.isArray(response.data) && response.data.length > 0) {
					const record = response.data[0] as IDataObject;
					webhookData.webhookId = record.id as number;
					return true;
				}
				return false;
			} catch {
				return false;
			}
		},

		/**
		 * Create webhook in Axelor when not already existing
		 */
		async create(this: IHookFunctions): Promise<boolean> {
			const { baseUrl } = await this.getCredentials('axelorApi');
			const modelName = this.getNodeParameter('model') as string;
			const webhookUrl = this.getNodeWebhookUrl('default');

			const body = { data: { name: modelName, modelName, url: webhookUrl } };
			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'axelorApi', {
				method: 'POST',
				url: `${baseUrl}/ws/rest/${MODEL.CONNECT_DB_WEBHOOK}`,
				body,
				json: true,
			});

			if (!response.data?.length) {
				throw new NodeApiError(this.getNode(), response as JsonObject, {
					message: 'Failed to create Axelor webhook',
				});
			}

			this.getWorkflowStaticData('node').webhookId = response.data[0].id;
			return true;
		},

		/**
		 * Delete webhook in Axelor when workflow is deactivated
		 */
		async delete(this: IHookFunctions): Promise<boolean> {
			const { baseUrl } = await this.getCredentials('axelorApi');
			const staticData = this.getWorkflowStaticData('node');
			const webhookId = staticData.webhookId as number;
			if (!webhookId) return false;
			await this.helpers.httpRequestWithAuthentication.call(this, 'axelorApi', {
				method: 'DELETE',
				url: `${baseUrl}/ws/rest/${MODEL.CONNECT_DB_WEBHOOK}/${webhookId}`,
				json: true,
			});
			delete staticData.webhookId;
			return true;
		},
	},
};
