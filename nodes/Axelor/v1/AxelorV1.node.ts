import type {
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import { LoggerProxy as Logger } from 'n8n-workflow';

import { versionDescription } from './actions/versionDescription';
import { loadOptions, resourceMapping } from './methods';

export class AxelorV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription?: INodeTypeBaseDescription) {
		this.description = {
			...(baseDescription || {}),
			...versionDescription,
		};
	}

	methods = {
		loadOptions,
		resourceMapping,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		Logger.info('Axelor:execute - start');
		const returnData: IDataObject[] = [];

		Logger.info('Axelor:execute - done');
		return [this.helpers.returnJsonArray(returnData)];
	}
}
