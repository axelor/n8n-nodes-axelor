import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as find from './find.operation';
import * as search from './search.operation';
import * as read from './read.operation';
import * as deleteOp from './delete.operation';

export { find, search, read, create, deleteOp as delete };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Create Record',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Find Records',
				value: 'find',
				description: 'Find existing records',
				action: 'Find records',
			},
			{
				name: 'Read Records',
				value: 'read',
				description: 'Read records in the system',
				action: 'Read records',
			},
			{
				name: 'Search Records',
				value: 'search',
				description: 'Search records by criteria',
				action: 'Search records',
			},
			{
				name: 'Delete Record',
				value: 'delete',
				description: 'Delete a record',
				action: 'Delete a record',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getMetaModels' },
		placeholder: 'Select Axelor model',
		required: true,
		default: '',
	},
	...create.description,
	...find.description,
	...search.description,
	...read.description,
	...deleteOp.description,
];
