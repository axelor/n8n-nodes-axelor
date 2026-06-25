import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import { isEqual } from './v1/helpers/lodash';
import { loadOptions } from './v1/methods';
import { HTTP, START_OPTIONS } from './v1/helpers/constants';
import { createCriteria } from './v1/helpers/utils';
import { toUTCISOStringFromTZ } from './v1/helpers/dateUtils';
import { apiRequest } from './v1/transport';

const ENABLED_ON = { show: { triggerOn: ['recordCreate', 'recordUpdate'] } };

export class AxelorPollTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Axelor Poll Trigger',
		name: 'axelorPollTrigger',
		icon: {
			dark:'file:axelor_dark.svg',
			light:'file:axelor_light.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["triggerOn"]}}',
		description: 'Triggers when a new item created or updated',
		defaults: {
			name: 'Axelor Poll Trigger',
		},
		credentials: [{ name: 'axelorApi', required: true }],
		inputs: [],
		 
		outputs: [NodeConnectionTypes.Main],
		polling: true,
		usableAsTool: true,
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
			const now = new Date().toISOString();
			const lastTimeStamp = (webhookData.lastTimeChecked as string) || (initialTimeStamp as string);
			const currentTimeStamp = now;

			type SimpleCriterion = { fieldName: string; operator: string; value: string };
			type CompoundCriterion = { operator: string; criteria: SimpleCriterion[] };
			const data: { criteria: Array<SimpleCriterion | CompoundCriterion> } = { criteria: [] };

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

			const url = `/ws/rest/${encodeURIComponent(model)}/search`;
			const body = { limit, data };
			const response = await apiRequest.call(this, HTTP.POST, url, body);

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
