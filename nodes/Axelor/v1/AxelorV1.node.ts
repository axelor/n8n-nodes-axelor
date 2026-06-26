import type {
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	IExecuteFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { loadOptions, resourceMapping } from './methods';
import { router } from './actions/router';

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
