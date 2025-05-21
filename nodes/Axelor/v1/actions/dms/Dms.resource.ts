import type { INodeProperties } from 'n8n-workflow';
import * as listFiles from './listFiles.operation';
import * as listAttachments from './listAttachments.operation';

export { listFiles, listAttachments };

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
			{
				name: 'List Attachment',
				value: 'listAttachments',
				description: 'List all the attachments',
				action: 'List attachments',
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
	...listAttachments.description,
];
