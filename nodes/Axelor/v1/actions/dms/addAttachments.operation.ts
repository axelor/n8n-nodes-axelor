import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';
import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { apiRequest } from '../../transport';
import { FIELD_TYPE, HTTP } from '../../helpers/constants';

export const properties: INodeProperties[] = [
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: FIELD_TYPE.OPTIONS,
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
		type: FIELD_TYPE.OPTIONS,
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
		type: FIELD_TYPE.FIXED_COLLECTION,
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'values',
				displayName: 'Values',
				values: [
					{
						displayName: 'ID',
						name: 'id',
						type: FIELD_TYPE.NUMBER,
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

	for (let i = 0; i < items.length; i++) {
		try {
			const model = this.getNodeParameter('model', i) as string;
			const recordId = this.getNodeParameter('records', i) as number;
			const uploadIds = this.getNodeParameter('uploadIds.values', i, []) as IDataObject[];

			const url = `/ws/dms/attachments/${encodeURIComponent(model)}/${recordId}`;

			const responseData = await apiRequest.call(this, HTTP.PUT, url, { records: uploadIds });

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
