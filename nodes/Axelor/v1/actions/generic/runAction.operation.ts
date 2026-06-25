import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
	updateDisplayOptions,
} from 'n8n-workflow';
import { fromPairs } from '../../helpers/lodash';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { FIELD_TYPE, HTTP } from '../../helpers/constants';

export const properties: INodeProperties[] = [
	{
		displayName: 'Actions',
		name: 'actions',
		type: FIELD_TYPE.FIXED_COLLECTION,
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
						type: FIELD_TYPE.STRING,
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
		type: FIELD_TYPE.OPTIONS,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getMetaModels' },
		placeholder: 'Select Axelor model',
		default: '',
	},
	{
		displayName: 'Context',
		name: 'context',
		type: FIELD_TYPE.FIXED_COLLECTION,
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
						type: FIELD_TYPE.STRING,
						default: '',
						required: true,
					},
					{
						displayName: 'Value',
						name: 'value',
						type: FIELD_TYPE.STRING,
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

	for (let i = 0; i < items.length; i++) {
		try {
			const actionsRaw = this.getNodeParameter('actions', i) as {
				values?: Array<{ item: string }>;
			};
			const model = this.getNodeParameter('model', i) as string;
			const contextRaw = this.getNodeParameter('context', i, {}) as {
				values?: Array<{ key: string; value: string }>;
			};

			if (!Object.keys(actionsRaw)?.length) {
				throw new NodeOperationError(this.getNode(), 'Missing required parameter: Actions');
			}

			const action = (actionsRaw.values || []).map((a) => a.item).join(',');

			let context: Record<string, string> = {};
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

			const url = '/ws/action/';
			const responseData = await apiRequest.call(this, HTTP.POST, url, body);

			isValidResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData.data as IDataObject[]),
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
