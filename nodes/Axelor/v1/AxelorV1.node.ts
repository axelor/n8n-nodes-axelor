import type {
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	IExecuteFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { loadOptions, resourceMapping } from './methods';
import { router } from './actions/router';
import * as record from './actions/record/Record.resource';
import * as dms from './actions/dms/Dms.resource';
import * as generic from './actions/generic/Generic.resource';

const versionDescription: INodeTypeDescription = {
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
					name: 'DMS File',
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

export class AxelorV1 implements INodeType {
	description: INodeTypeDescription = {
		...versionDescription,
		icon: { light: 'file:../axelor_light.svg', dark: 'file:../axelor_dark.svg' },
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		usableAsTool: true,
	};

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
			icon: { light: 'file:../axelor_light.svg', dark: 'file:../axelor_dark.svg' },
			usableAsTool: true,
		};
	}
	methods = {
		loadOptions,
		resourceMapping,
	};

	async execute(this: IExecuteFunctions) {
		try {
			return await router.call(this);
		} catch (error) {
			if (this.continueOnFail()) {
				return [this.helpers.returnJsonArray({ error: (error as Error).message })];
			}
			throw new NodeOperationError(this.getNode(), error as Error);
		}
	}
}
