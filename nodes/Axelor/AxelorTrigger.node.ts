import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { loadOptions } from './v1/methods';
import { webhookMethods } from './v1/triggers/webhook-methods';
import { triggerDescription } from './v1/triggers/trigger-description';

export class AxelorTrigger implements INodeType {
	description: INodeTypeDescription;

	constructor() {
		this.description = {
			...triggerDescription,
			webhooks: [
				{
					name: 'default',
					httpMethod: 'POST',
					responseMode: 'onReceived',
					path: 'axelor/delete',
				},
			],
		};
	}

	methods = {
		loadOptions,
	};

	webhookMethods = webhookMethods;

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const payload = this.getBodyData();
		return { workflowData: [this.helpers.returnJsonArray(payload)] };
	}
}
