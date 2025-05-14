import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';

export { create };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create Record',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Get Updated Records',
				value: 'getUpdated',
				description: 'Retrieve a record',
				action: 'Get a record',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getMetaModels' },
		placeholder: 'Select Axelor model',
		required: true,
		default: '',
	},
	...create.description,
];
