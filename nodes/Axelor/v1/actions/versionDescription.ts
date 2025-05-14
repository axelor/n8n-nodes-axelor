/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { type INodeTypeDescription } from 'n8n-workflow';

import * as record from './record/Record.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Axelor',
	name: 'axelor',
	icon: 'file:Axelor.svg',
	group: ['input'],
	version: 1,
	description: 'Integrate with Axelor Open Platform',
	defaults: {
		name: 'Axelor',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'axelorApi',
			required: true,
		},
	],
	properties: [...record.description],
} as INodeTypeDescription;
