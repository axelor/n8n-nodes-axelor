import type {
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import { LoggerProxy as Logger } from 'n8n-workflow';

const versionDescription: INodeTypeDescription = {
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
	properties: [],
} as INodeTypeDescription;

export class AxelorV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription?: INodeTypeBaseDescription) {
		this.description = {
			...versionDescription,
			...(baseDescription || {}),
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		Logger.info('Axelor:execute - start');
		const returnData: IDataObject[] = [];

		Logger.info('Axelor:execute - done');
		return [this.helpers.returnJsonArray(returnData)];
	}
}
