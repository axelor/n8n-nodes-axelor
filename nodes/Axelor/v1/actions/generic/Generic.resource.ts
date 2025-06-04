import type { INodeProperties } from 'n8n-workflow';

import * as runAction from './runAction.operation';
import * as businessServiceCall from './businessServiceCall.operation';
import * as makeApiCall from './makeApiCall.operation';

export { runAction, businessServiceCall, makeApiCall };

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
			{
				name: 'Make Business Service Call',
				value: 'businessServiceCall',
				description: 'Invoke a business logic layer or service endpoint',
				action: 'Make a business service call',
			},
			{
				name: 'Make API Call',
				value: 'makeApiCall',
				description: 'Invoke all Axelor API',
				action: 'Make a API call',
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
	...businessServiceCall.description,
	...makeApiCall.description,
];
