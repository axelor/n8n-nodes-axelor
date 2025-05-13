import {
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
	NodeOperationError,
} from 'n8n-workflow';

import { AxelorModelFieldSchema } from '../helpers/interface';
import { constructOptions, mapAxelorTypeToFieldType } from '../helpers/utils';

export async function getModelFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const credentials = await this.getCredentials('axelorApi');
	const selectedModel = this.getCurrentNodeParameter('model') as string;

	if (!selectedModel) return { fields: [] };

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `/ws/meta/fields/${encodeURIComponent(selectedModel)}`,
			baseURL: credentials.baseUrl as string,
			auth: { user: credentials.username as string, pass: credentials.password as string },
			json: true,
		});

		const $fields: AxelorModelFieldSchema[] = response.data?.fields || [];

		const mappedFields: ResourceMapperField[] = $fields.map((field) => {
			const type = mapAxelorTypeToFieldType(field.type);

			// TODO: fetch options based on field type
			// M2O, O2M, M2M
			const options = constructOptions(field);

			return {
				id: field.name,
				displayName: field.title || field.name,
				defaultMatch: false,
				required: field.required === true,
				display: true,
				removed: field.required === false,
				type,
				options,
			};
		});

		return { fields: mappedFields };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model fields', error);
	}
}
