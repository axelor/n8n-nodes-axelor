import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { loadOptions } from './v1/methods';
import { webhookMethods } from './v1/triggers/webhook-methods';

export class AxelorTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Axelor Delete Trigger',
		name: 'axelorTrigger',
		icon: { light: 'file:axelor_light.svg', dark: 'file:axelor_dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '=Record deleted in {{$parameter["model"]}}',
		description: 'Triggers when a record is deleted in Axelor',
		defaults: {
			name: 'Axelor Delete Trigger',
		},
		credentials: [{ name: 'axelorApi', required: true }],
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMetaModels' },
				default: '',
				required: true,
				description:
					'Select the Axelor model to watch for deletions. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'axelor/delete',
			},
		],
	};

	methods = {
		loadOptions,
	};

	webhookMethods = webhookMethods;

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const payload = this.getBodyData();
		return { workflowData: [this.helpers.returnJsonArray(payload)] };
	}
}
