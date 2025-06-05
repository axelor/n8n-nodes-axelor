import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import { isEqual } from './v1/helpers/lodash';
import { loadOptions } from './v1/methods';
import { START_OPTIONS } from './v1/helpers/constants';
import { createCriteria } from './v1/helpers/utils';
import { toUTCISOStringFromTZ } from './v1/helpers/dateUtils';

const ENABLED_ON = { show: { triggerOn: ['recordCreate', 'recordUpdate'] } };

export class AxelorPollTrigger implements INodeType {
	description: INodeTypeDescription;

	constructor() {
		this.description = {
			displayName: 'Axelor Poll Trigger',
			name: 'axelorPollTrigger',
			icon: 'file:axelor.svg',
			group: ['trigger'],
			version: 1,
			subtitle: '={{$parameter["triggerOn"]}}',
			description: 'Triggers when a new item created or updated',
			defaults: {
				name: 'Axelor Poll Trigger',
			},
			credentials: [{ name: 'axelorApi', required: true }],
			inputs: [],
			// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
			outputs: [NodeConnectionType.Main],
			polling: true,
			properties: [
				{
					displayName: 'Model Name or ID',
					name: 'model',
					type: 'options',
					typeOptions: { loadOptionsMethod: 'getMetaModels' },
					default: '',
					required: true,
					description:
						'Select the Axelor model to watch for changes. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Trigger On',
					name: 'triggerOn',
					type: 'options',
					required: true,
					default: 'recordCreate',
					options: [
						{
							name: 'Create',
							value: 'recordCreate',
							action: 'Watch a New Record',
						},
						{
							name: 'Update',
							value: 'recordUpdate',
							action: 'Watch New / Updated Records',
						},
					],
				},
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 50,
					description: 'Max number of results to return',
					hint: 'The maximum no. of records to be fetched in one internal request and total there can be max. 3200 internal request in one operation',
					displayOptions: {
						show: {
							triggerOn: ['recordCreate', 'recordUpdate'],
						},
					},
				},
				{
					displayName: 'Choose Where To Start',
					name: 'startPreference',
					type: 'options',
					options: START_OPTIONS,
					default: 'all',
					description: 'Whether the item is archived',
					displayOptions: ENABLED_ON,
					required: true,
				},
				{
					displayName: 'Date',
					name: 'startTime',
					type: 'dateTime',

					default: '',
					description: 'Select the time to start',
					required: true,
					displayOptions: {
						show: {
							startPreference: ['sinceSpecificDate'],
						},
					},
				},
			],
		};
	}

	methods = {
		loadOptions,
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const poolTimes = this.getNodeParameter('pollTimes.item', []) as IDataObject[];
		const model = this.getNodeParameter('model', '') as string;
		const triggerOn = this.getNodeParameter('triggerOn', '') as string;
		const limit = this.getNodeParameter('limit', 50) as number;
		const startPreference = this.getNodeParameter('startPreference', '') as string;

		let initialTimeStamp;

		const timezone = this.getTimezone();

		if (startPreference === 'sinceSpecificDate') {
			const startTime = this.getNodeParameter('startTime', '') as string;

			initialTimeStamp = toUTCISOStringFromTZ(startTime, timezone);
		} else if (startPreference === 'all') {
			initialTimeStamp = new Date(0).toISOString();
		}

		const webhookData = this.getWorkflowStaticData('node');

		if (!model) {
			throw new NodeOperationError(this.getNode(), 'No model selected');
		}

		if (poolTimes.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Please set a poll time');
		}

		try {
			const { baseUrl, username, password } = await this.getCredentials('axelorApi');

			const now = new Date().toISOString();
			const lastTimeStamp = (webhookData.lastTimeChecked as string) || (initialTimeStamp as string);
			const currentTimeStamp = now;

			const data: { criteria: any[] } = { criteria: [] };

			if (isEqual(triggerOn, 'recordCreate')) {
				data.criteria.push(createCriteria('createdOn', '>=', lastTimeStamp));
			} else {
				data.criteria.push({
					operator: 'or',
					criteria: [
						createCriteria('createdOn', '>=', lastTimeStamp),
						createCriteria('updatedOn', '>=', lastTimeStamp),
					],
				});
			}

			const response = await this.helpers.request({
				method: 'POST',
				url: `/ws/rest/${encodeURIComponent(model)}/search`,
				baseURL: baseUrl as string,
				auth: {
					user: username as string,
					pass: password as string,
				},
				json: true,
				body: { limit, data },
			});

			webhookData.lastTimeChecked = currentTimeStamp;

			if (!response.data || !response.data.length) {
				return null;
			}

			return [this.helpers.returnJsonArray(response.data)];
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Failed to poll for records', error);
		}
	}
}
