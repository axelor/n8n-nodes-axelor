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
				name: 'File Downlaod',
				value: 'downloadFile',
				description: 'Download file from DMS ID',
				action: 'File download',
			},
			{
				name: 'List Attachment',
				value: 'listAttachments',
				description: 'List all the attachments',
				action: 'List attachments',
			},
			{
				name: 'List File',
				value: 'listFiles',
				description: 'List all the files',
				action: 'File listing',
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
