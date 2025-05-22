import type { INodeProperties } from 'n8n-workflow';
import * as listFiles from './listFiles.operation';
import * as listAttachments from './listAttachments.operation';
import * as downloadFile from './downloadFile.operation';
import * as addAttachments from './addAttachments.operation';

export { listFiles, listAttachments, downloadFile, addAttachments };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
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
			{
				name: 'Add Attachment',
				value: 'addAttachment',
				description: 'Attach an existing file to a record',
				action: 'Add attachment',
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
	...addAttachments.description,
];
