import type {
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	IExecuteFunctions,
} from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { loadOptions, resourceMapping } from './methods';
import { router } from './actions/router';

export class AxelorV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
			usableAsTool: true,
		};
	}
	methods = {
		loadOptions,
		resourceMapping,
	};

	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
