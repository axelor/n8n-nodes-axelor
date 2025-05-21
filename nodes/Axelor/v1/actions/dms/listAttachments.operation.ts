import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getMetaModels' },
		placeholder: 'Select Axelor model',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		noDataExpression: true,
	},
	{
		displayName: 'Records Name or ID',
		name: 'records',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getMetaModelRecords',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
		},
		default: '',
		noDataExpression: true,
		description:
			'Select the record type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
		displayOptions: {
			hide: {
				model: [''],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['dms'],
		operation: ['listAttachments'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const creds = await this.getCredentials('axelorApi');
	const baseUrl = creds.baseUrl as string;

	const auth = {
		user: creds.username as string,
		pass: creds.password as string,
	};

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;
		const recordId = this.getNodeParameter('records', i) as number;

		try {
			const responseData = await this.helpers.request!({
				method: 'GET',
				baseURL: baseUrl,
				url: `/ws/dms/attachments/${model}/${recordId}`,
				auth,
				json: true,
			});

			isValidResponse(responseData);

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const handledError = processAxelorError(error as NodeApiError);

			if (this.continueOnFail()) {
				returnData.push({ json: { error: handledError.message } });
				continue;
			}

			throw handledError;
		}
	}

	return returnData;
}
