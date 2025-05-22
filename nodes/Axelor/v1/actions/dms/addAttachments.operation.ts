import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';

import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { AxelorApiCredentials } from '../../helpers/interface';

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
		description:
			'Select the record type. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		required: true,
		displayOptions: {
			hide: {
				model: [''],
			},
		},
	},
	{
		displayName: 'Upload IDs',
		name: 'uploadIds',
		placeholder: 'Add Item',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'values',
				displayName: 'O2M Field',
				values: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'number',
						description: 'Unique identifier of the file or record to be uploaded',
						default: '',
					},
				],
			},
		],
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
		operation: ['addAttachments'],
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
			const model = this.getNodeParameter('model', i) as string;
			const recordId = this.getNodeParameter('records', i) as number;
			const uploadIds = this.getNodeParameter('uploadIds.values', i, []) as IDataObject[];

			const responseData = await this.helpers.request!({
				method: 'PUT',
				url: `/ws/dms/attachments/${encodeURIComponent(model)}/${recordId}`,
				baseURL: baseUrl,
				auth: { user: username, pass: password },
				body: { records: uploadIds },
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
