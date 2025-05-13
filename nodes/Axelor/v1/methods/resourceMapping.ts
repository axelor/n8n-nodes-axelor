import {
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
	NodeOperationError,
} from 'n8n-workflow';

import { AxelorField } from '@/nodes/Axelor/v1/types';

export async function getFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const creds = await this.getCredentials('axelorApi');
	const model = this.getCurrentNodeParameter('model') as string;

	if (!model) return { fields: [] };

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const resp = await this.helpers.request({
			method: 'GET',
			url: `/ws/meta/fields/${encodeURIComponent(model)}`,
			baseURL: creds.baseUrl as string,
			auth: { user: creds.username as string, pass: creds.password as string },
			json: true,
		});

		const infos: Array<AxelorField> = resp.data?.fields || [];
		const options: ResourceMapperField[] = infos.map((f) => ({
			id: f.name,
			displayName: f.title || f.name,
			defaultMatch: false,
			required: f.required === true,
			display: true,
			removed: f.required === false,
		}));

		return { fields: options };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model fields', error);
	}
}
