/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { type INodeTypeDescription, NodeConnectionTypes } from 'n8n-workflow';

import * as record from './record/Record.resource';
import * as dms from './dms/Dms.resource';
import * as generic from './generic/Generic.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Axelor',
	name: 'axelor',
	icon: { light: 'file:axelor_light.svg', dark: 'file:axelor_dark.svg' },
	group: ['input'],
	version: 1,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Integrate with Axelor Open Platform',
	defaults: {
		name: 'Axelor',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'axelorApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Record',
					value: 'record',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-resource-with-plural-option
					name: 'DMS',
					value: 'dms',
				},
				{
					name: 'Generic',
					value: 'generic',
				},
			],
			default: 'record',
		},
		...record.description,
		...dms.description,
		...generic.description,
	],
} as INodeTypeDescription;
