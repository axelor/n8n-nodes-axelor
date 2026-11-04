import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	updateDisplayOptions,
	NodeApiError,
} from 'n8n-workflow';
import { isValidResponse, processAxelorError, wrapData } from '../../helpers/utils';
import { getFields } from '../../helpers/api-helper';
import { searchRecords } from '../../helpers/pagination';
import { apiRequest } from '../../transport';
import { FIELD_TYPE, HTTP } from '../../helpers/constants';
import type { AxelorModelFieldSchema, FieldCategory } from '../../helpers/interface';

export const properties: INodeProperties[] = [
	{
		displayName: 'Find By ID',
		name: 'findById',
		type: FIELD_TYPE.BOOLEAN,
		default: false,
		description: 'Whether to find a record by ID',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: FIELD_TYPE.BOOLEAN,
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { findById: [false] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: FIELD_TYPE.NUMBER,
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { findById: [false], returnAll: [false] } },
	},
	{
		displayName: 'ID',
		name: 'recordId',
		type: FIELD_TYPE.STRING,
		default: '',
		description: 'ID of the record to find',
		displayOptions: { show: { findById: [true] } },
		required: true,
	},
];

const displayOptions = {
	show: {
		resource: ['record'],
		operation: ['find'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, items: INodeExecutionData[]) {
	const returnData: INodeExecutionData[] = [];

	const metaFieldCache: Record<string, Record<FieldCategory, AxelorModelFieldSchema[]>> = {};

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const findById = this.getNodeParameter('findById', i, false) as boolean;
			const recordId = this.getNodeParameter('recordId', i, null) as string;
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const limit = this.getNodeParameter('limit', i, 50) as number;

			let cacheData = metaFieldCache[model];
			if (!cacheData) {
				const data = await getFields.call(this, model);
				metaFieldCache[model] = data;
				cacheData = data;
			}
			const fields = [...(cacheData?.fields || [])];
			const fieldNames = fields.map((f: { name: string }) => f.name);

			let records: IDataObject[];

			if (findById) {
				const url = `/ws/rest/${encodeURIComponent(model)}/${recordId}/fetch`;
				const resp = await apiRequest.call(this, HTTP.POST, url, { fields: fieldNames });

				isValidResponse(resp);

				records = (resp.data as IDataObject[]) || [];
			} else {
				const body: IDataObject = {
					fields: fieldNames,
					sortBy: ['-updatedOn'],
					data: {},
				};

				records = await searchRecords.call(this, model, body, { returnAll, limit });
			}

			const executionData = this.helpers.constructExecutionMetaData(wrapData(records), {
				itemData: { item: i },
			});
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
