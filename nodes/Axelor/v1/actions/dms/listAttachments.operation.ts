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

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;
		const recordId = this.getNodeParameter('records', i) as number;

		try {
			const url = `/ws/dms/attachments/${encodeURIComponent(model)}/${encodeURIComponent(recordId)}`;
			const responseData = await apiRequest.call(this, HTTP.GET, url);

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
