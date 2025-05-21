import type { INodeProperties } from 'n8n-workflow';
import * as listFiles from './listFiles.operation';
import * as listAttachments from './listAttachments.operation';
import * as downloadFile from './downloadFile.operation';

export { listFiles, listAttachments, downloadFile };

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
			{
				name: 'File Downlaod',
				value: 'downloadFile',
				description: 'Download file from DMS ID',
				action: 'File download',
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
	...downloadFile.description,
];
