// eslint-disable-next-line n8n-nodes-base/node-filename-against-convention
import { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

export const triggerDescription: INodeTypeDescription = {
	displayName: 'Axelor Delete Trigger',
	name: 'axelorTrigger',
	icon: 'file:Axelor.svg',
	group: ['trigger'],
	version: 1,
	description: 'Triggers when a record is deleted in Axelor',
	defaults: {
		name: 'Axelor Delete Trigger',
	},
	credentials: [{ name: 'axelorApi', required: true }],
	inputs: [],
	// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
	outputs: [NodeConnectionType.Main],
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
};
