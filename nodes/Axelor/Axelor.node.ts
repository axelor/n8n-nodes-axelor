import type { INodeType, INodeTypeDescription, IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { loadOptions, resourceMapping } from './v1/methods';
import { router } from './v1/actions/router';
import * as record from './v1/actions/record/Record.resource';
import * as dms from './v1/actions/dms/Dms.resource';
import * as generic from './v1/actions/generic/Generic.resource';

export class Axelor implements INodeType {
	description: INodeTypeDescription = {
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
		usableAsTool: true,
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
	};

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
