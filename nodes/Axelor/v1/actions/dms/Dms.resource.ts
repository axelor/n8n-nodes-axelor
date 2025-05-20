import type { INodeProperties } from 'n8n-workflow';
import * as list from './list.operation';

export { list };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'List File',
				value: 'listfile',
				description: 'List all the files',
				action: 'File listing',
			},
		],
		default: 'listfile',
		displayOptions: {
			show: {
				resource: ['dms'],
			},
		},
	},
	...list.description,
];
