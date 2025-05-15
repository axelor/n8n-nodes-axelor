import type {
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	IExecuteFunctions,
} from 'n8n-workflow';
import { updateDisplayOptions, NodeApiError } from 'n8n-workflow';

import { getMetaFields } from '../../helpers/api-helper';
import { AXELOR_SELECTION_FIELDS } from '../../helpers/constants';
import { processAxelorError, wrapData } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		required: true,
		default: { mappingMode: 'defineBelow', value: null },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getMetaModelFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
			},
			loadOptionsDependsOn: ['model'],
		},
	},
];

const displayOptions = {
	show: {
		operation: ['create'],
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

	for (let i = 0; i < items.length; i++) {
		const model = this.getNodeParameter('model', i) as string;

		try {
			const mapping = this.getNodeParameter('fields', i, {}) as any;

			const fields = await getMetaFields.call(this, model);
			const validFieldNames = new Set(fields.map((f) => f.name));

			const data: IDataObject | any = {};
			Object.entries(mapping.value || {}).forEach(([key, value]) => {
				if (validFieldNames.has(key)) {
					const fieldMeta: any = fields.find((f) => f.name === key);

					if (AXELOR_SELECTION_FIELDS.includes(fieldMeta.type)) {
						data[key] = { id: value };
					} else {
						data[key] = value;
					}
				}
			});

			const responseData = await this.helpers.request!({
				method: 'POST',
				url: `/ws/rest/${encodeURIComponent(model)}`,
				baseURL: baseUrl,
				auth: { user: creds.username as string, pass: creds.password as string },
				body: { data },
				json: true,
			});

			const executionData = this.helpers.constructExecutionMetaData(
				wrapData(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
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
