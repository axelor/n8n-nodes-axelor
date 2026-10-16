import type { INodeProperties } from 'n8n-workflow';
import * as listFiles from './listFiles.operation';
import * as listAttachments from './listAttachments.operation';
import * as downloadFile from './downloadFile.operation';
import * as addAttachments from './addAttachments.operation';
import * as uploadFile from './uploadFile.operation';

export { listFiles, listAttachments, downloadFile, addAttachments, uploadFile };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Add Attachment',
				value: 'addAttachments',
				description: 'Attach an existing file to a record',
				action: 'Add attachment',
			},

			{
				name: 'Download File',
				value: 'downloadFile',
				description: 'Download a file by its DMS ID',
				action: 'Download a file',
			},
			{
				name: 'List Attachments',
				value: 'listAttachments',
				description: 'List the attachments of a record',
				action: 'List attachments',
			},
			{
				name: 'List Files',
				value: 'listFiles',
				description: 'List files in the DMS',
				action: 'List files',
			},

			{
				name: 'Upload File',
				value: 'uploadFile',
				description: 'Upload a file to the DMS',
				action: 'Upload file',
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
	...uploadFile.description,
];
