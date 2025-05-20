import type { INodeProperties } from 'n8n-workflow';
import * as listFiles from './listFiles.operation';

export { listFiles };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'List File',
				value: 'listFiles',
				description: 'List all the files',
				action: 'File listing',
			},
		],
		default: 'listFiles',
		displayOptions: {
			show: {
				resource: ['dms'],
			},
		},
	},
	...listFiles.description,
];
