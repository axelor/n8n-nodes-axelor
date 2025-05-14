import { type INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from 'n8n-workflow';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		required: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMetaModelFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
			},
			loadOptionsDependsOn: ['model'],
		},
	},
];

const displayOptions = {
	show: {
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

// TODO
// export async function execute(
// 	this: IExecuteFunctions,
// 	items: INodeExecutionData[],
// 	base: string,
// 	table: string,
// ): Promise<INodeExecutionData[]> {}
