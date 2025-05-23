import type { INodeProperties } from 'n8n-workflow';

import * as runAction from './runAction.operation';

export { runAction };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Run Action',
				value: 'runAction',
				description: 'Execute a predefined action using custom parameters',
				action: 'Run action',
			},
		],
		default: 'runAction',
		displayOptions: {
			show: {
				resource: ['generic'],
			},
		},
	},
	...runAction.description,
];
