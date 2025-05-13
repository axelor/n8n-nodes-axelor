/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { type INodeTypeDescription } from 'n8n-workflow';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Axelor',
	name: 'axelor',
	icon: 'file:Axelor.svg',
	group: ['input'],
	version: 1,
	description: 'Integrate with Axelor Open Platform',
	defaults: {
		name: 'Axelor',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'axelorApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Create Record', value: 'create' },
				{ name: 'Get Updated Records', value: 'getUpdated' },
			],
			default: 'create',
		},
		{
			displayName: 'Model Name or ID',
			name: 'model',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: { loadOptionsMethod: 'getModels' },
			placeholder: 'Select Axelor model',
			required: true,
			default: '',
		},
		{
			displayName: 'Fields',
			name: 'fields',
			type: 'resourceMapper',
			required: true,
			default: { mappingMode: 'defineBelow', value: null },
			typeOptions: {
				resourceMapper: {
					resourceMapperMethod: 'getModelFields',
					mode: 'add',
					fieldWords: { singular: 'field', plural: 'fields' },
				},
			},
			displayOptions: { show: { operation: ['create'] } },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: {
				minValue: 1,
			},
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { operation: ['getUpdated'] } },
		},
	],
} as INodeTypeDescription;
