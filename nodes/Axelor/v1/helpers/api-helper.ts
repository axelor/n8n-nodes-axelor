import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { AxelorModelFieldSchema } from './interface';

export async function getOptions(
	this: ILoadOptionsFunctions,
	field: AxelorModelFieldSchema,
): Promise<INodePropertyOptions[]> {
	const { target, targetName = 'id' } = field;

	if (!target) return [];

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	const credentials = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	const body = {
		data: {},
		fields: [targetName],
	};

	try {
		const response = await this.helpers.request({
			method: 'POST',
			url: `/ws/rest/${target}/search`,
			baseURL: credentials.baseUrl,
			auth: {
				user: credentials.username,
				pass: credentials.password,
			},
			json: true,
			body,
		});

		const records = Array.isArray(response.data) ? response.data : [];

		return records.map((record: any) => ({
			name: targetName ? record[targetName] : record.id,
			value: record.id,
		}));
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model options', error);
	}
}

export async function getMetaFields(
	this: IExecuteFunctions,
	model: string,
): Promise<AxelorModelFieldSchema[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const respFields = await this.helpers.request!({
			method: 'GET',
			url: `/ws/meta/fields/${encodeURIComponent(model)}`,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			json: true,
		});
		const fields: AxelorModelFieldSchema[] = respFields.data?.fields || [];
		return fields;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}
