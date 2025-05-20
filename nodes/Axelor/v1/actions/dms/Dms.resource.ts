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
				value: 'list',
				description: 'List all the files',
				action: 'File listing',
			},
		],
		default: 'list',
		displayOptions: {
			show: {
				resource: ['dms'],
			},
		},
	},
	...list.description,
];
