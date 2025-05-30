import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Module Name or ID',
		name: 'module',
		required: true,
		type: 'options',
		description:
			'Select the Axelor module you want to interact with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getModules',
		},
		default: '',
	},
	{
		displayName: 'Action Name or ID',
		name: 'action',
		required: true,
		type: 'options',
		description:
			'Select the action. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getActions',
			loadOptionsDependsOn: ['module'],
			refreshOn: ['module'],
		},
		default: '',
		displayOptions: {
			hide: {
				module: [''],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		typeOptions: {
			loadOptionsDependsOn: ['action'],
			resourceMapper: {
				resourceMapperMethod: 'loadActionBodyFields',
				valuesLabel: 'Body',
				mode: 'add',
				fieldWords: {
					singular: 'Field',
					plural: 'Fields',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
		displayOptions: {
			hide: {
				action: [''],
				module: [''],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['generic'],
		operation: ['businessServiceCall'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
