import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getNameColoumn } from '../helpers/utils';

export async function getMetaModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: '/ws/meta/models',
			baseURL: baseUrl,
			auth: { user: username, pass: password },
			json: true,
		});

		return Array.isArray(response.data)
			? response.data.map((model: string) => ({ name: model, value: model }))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getMetaModelRecords(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};
	const selectedModel = this.getCurrentNodeParameter('model') as string;

	if (!selectedModel) return [];

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const respFields = await this.helpers.request!({
			method: 'GET',
			url: `/ws/meta/fields/${encodeURIComponent(selectedModel)}`,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			json: true,
		});

		const nameColumn = getNameColoumn(respFields?.data);
		const fields = nameColumn && nameColumn !== 'id' ? ['id', nameColumn] : ['id'];

		const result = await this.helpers.request!({
			method: 'POST',
			url: `/ws/rest/${encodeURIComponent(selectedModel)}/search`,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			body: { fields },
			json: true,
		});

		return Array.isArray(result.data)
			? result.data.map((item: any) => ({
					name: item[nameColumn] ? item[nameColumn] : `null(${item.id})`,
					value: item.id!,
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch records', error);
	}
}
