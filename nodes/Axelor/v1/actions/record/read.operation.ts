import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeApiError,
	updateDisplayOptions,
} from 'n8n-workflow';
import {
	getSelectedFields,
	isValidResponse,
	processAxelorError,
	wrapData,
} from '../../helpers/utils';
import { getMetaFields } from '../../helpers/api-helper';

const ENABLED_ON_ADVANCED_SETTING = { show: { advancedSettings: [true] } };

const properties: INodeProperties[] = [
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
		displayName: 'Advanced Settings',
		name: 'advancedSettings',
		type: 'boolean',
		default: false,
		description: 'Whether to show advanced options',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Select Fields',
		name: 'fields',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: [],
		typeOptions: {
			loadOptionsMethod: 'loadMetaFields',
			loadOptionsDependsOn: ['model'],
			refreshOn: ['model'],
		},
		displayOptions: ENABLED_ON_ADVANCED_SETTING,
	},
];

const displayOptions = { show: { operation: ['read'] } };
export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items?.length || 0; i++) {
		const model = this.getNodeParameter('model', i) as string;
		try {
			const creds = await this.getCredentials('axelorApi');
			const baseUrl = creds.baseUrl as string;
			const fields = await getMetaFields.call(this, model);
			const fieldNames = fields.map((f) => f.name);
			const recordId = this.getNodeParameter('records', i) as string;
			const enableAdvancedSettings = this.getNodeParameter('advancedSettings', i) as boolean;

			const body: any = { fields: fieldNames, data: {} };

			if (enableAdvancedSettings) {
				const selectedFiels = getSelectedFields.call(this, i);

				if (selectedFiels.length > 0) {
					body.fields = selectedFiels;
				}
			}

			const resp = await this.helpers.request!({
				method: 'POST',
				url: `/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`,
				baseURL: baseUrl,
				auth: { user: creds.username as string, pass: creds.password as string },
				body,
				json: true,
			});

			if (isValidResponse(resp)) {
				returnData.push(...wrapData(resp.data || []));
			}
		} catch (error) {
			error = processAxelorError(error as NodeApiError);
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message } });
				continue;
			}
			throw error;
		}
	}
	return returnData;
}
