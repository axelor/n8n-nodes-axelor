import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { isValidResponse, processAxelorError } from '../../helpers/utils';
import { AxelorApiCredentials } from '../../helpers/interface';
import { HTTP } from '../../helpers/constants';

export const properties: INodeProperties[] = [
	{
		displayName: 'Delete Multiple Records',
		name: 'deleteMultiple',
		type: 'boolean',
		default: false,
		description: 'Whether to delete multiple records at once',
	},
	{
		displayName: 'Record Name or ID',
		name: 'singleRecordId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getMetaModelRecords',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
			refreshOnOpen: true,
		},
		default: '',
		required: true,
		displayOptions: {
			show: {
				deleteMultiple: [false],
			},
		},
	},
	{
		displayName: 'Records to Delete',
		name: 'recordIds',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getMetaModelRecords',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
			refreshOnOpen: true,
		},
		default: [],
		required: true,
		displayOptions: {
			show: {
				deleteMultiple: [true],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;
		const deleteMultiple = this.getNodeParameter('deleteMultiple', i, false) as boolean;

		try {
			const creds = (await this.getCredentials('axelorApi')) as AxelorApiCredentials;

			let recordIds = [];

			if (deleteMultiple) {
				const selectedRecords = this.getNodeParameter('recordIds', i) as number[];
				recordIds = selectedRecords.map((item) => ({ id: item }));
			} else {
				const selectedRecordId = this.getNodeParameter('singleRecordId', i) as number;
				recordIds.push({ id: selectedRecordId });
			}

			const resp = await this.helpers.request!({
				method: HTTP.POST,
				url: `/ws/rest/${encodeURIComponent(model)}/removeAll`,
				baseURL: creds.baseUrl,
				auth: { user: creds.username, pass: creds.password },
				body: { records: recordIds },
				json: true,
			});

			isValidResponse(resp);

			returnData.push({
				json: {
					success: true,
					message: `Successfully deleted ${recordIds.length} record(s)`,
					deletedIds: recordIds,
				},
			});
		} catch (error) {
			error = processAxelorError(error as NodeApiError, undefined, i);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}
	return returnData;
}
