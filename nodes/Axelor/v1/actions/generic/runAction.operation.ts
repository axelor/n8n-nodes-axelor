import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import { fromPairs } from 'lodash';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { AxelorApiCredentials } from '../../helpers/interface';

export const properties: INodeProperties[] = [
	{
		displayName: 'Actions',
		name: 'actions',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add item',
		required: true,
		options: [
			{
				name: 'values',
				displayName: 'Values',
				values: [
					{
						displayName: 'Item',
						name: 'item',
						type: 'string',
						default: '',
						required: true,
					},
				],
			},
		],
		description:
			'Additional metadata or parameters passed as context to the operation. Supports multiple key-value pairs.',
	},
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getMetaModels' },
		placeholder: 'Select Axelor model',
		default: '',
	},
	{
		displayName: 'Context',
		name: 'context',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add item',
		options: [
			{
				name: 'values',
				displayName: 'Values',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['generic'],
		operation: ['runAction'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const { baseUrl, username, password } = (await this.getCredentials(
		'axelorApi',
	)) as AxelorApiCredentials;

	for (let i = 0; i < items.length; i++) {
		try {
			const actionsRaw = this.getNodeParameter('actions', i) as any;
			const model = this.getNodeParameter('model', i) as string;
			const contextRaw = this.getNodeParameter('context', i, {}) as {
				values?: Array<{ key: string; value: string }>;
			};

			if (!Object.keys(actionsRaw)?.length) {
				throw new NodeOperationError(this.getNode(), 'Missing required parameter: Actions');
			}

			const action = actionsRaw.values.map((a: any) => a.item).join(',');

			let context: Record<string, any> = {};
			if (contextRaw?.values?.length) {
				context = fromPairs(contextRaw.values.map(({ key, value }) => [key, value]));
			}

			const body = {
				action,
				model,
				data: {
					context,
				},
			};

			const responseData = await this.helpers.request!({
				method: 'POST',
				url: '/ws/action/',
				baseURL: baseUrl,
				auth: { user: username, pass: password },
				body,
				json: true,
			});

			isValidResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const processedError = processAxelorError(error as NodeApiError);

			if (this.continueOnFail()) {
				returnData.push({ json: { error: processedError.message } });
				continue;
			}

			throw processedError;
		}
	}

	return returnData;
}
