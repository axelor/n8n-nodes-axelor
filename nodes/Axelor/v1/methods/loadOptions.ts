import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getJsonFields, getNameColoumn, isValidResponse } from '../helpers/utils';
import { startCase, toLower } from 'lodash';
import { MODEL } from '../helpers/constants';

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
		const body = {
			fields: ['name', 'fullName'],
		};

		const response = await this.helpers.request({
			method: 'POST',
			url: '/ws/rest/com.axelor.meta.db.MetaModel/search',
			baseURL: baseUrl,
			auth: { user: username, pass: password },
			json: true,
			body,
		});

		return Array.isArray(response.data)
			? response.data.map((model: { name: string; fullName: string }) => ({
					name: model.name,
					value: model.fullName,
				}))
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

export async function loadMetaFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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

		if (respFields.status == -1) {
			throw new Error(respFields.data?.message || 'Invalid response');
		}
		const attrs = ['title', 'autoTitle'];
		const jsonFields = getJsonFields(respFields?.data.jsonFields, attrs).map((item) => {
			const { title, autoTitle, attributeValue } = item;
			return {
				name: title ? title : autoTitle,
				value: attributeValue,
			};
		});

		const metaField = respFields.data.fields.map((item: any) => ({
			name: item.title || startCase(toLower(item.name)),
			value: item.name,
		}));
		return [...metaField, ...jsonFields];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch Fields', error);
	}
}

export async function getMetaJsonModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const body = {
			fields: ['name', 'title'],
		};

		const response = await this.helpers.request({
			method: 'POST',
			url: `/ws/rest/${MODEL.META_JSON_MODEL}/search`,
			baseURL: baseUrl,
			auth: { user: username, pass: password },
			json: true,
			body,
		});

		return Array.isArray(response.data)
			? response.data.map((model: { name: string; title: string }) => ({
					name: model.title,
					value: model.name,
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getMetaJsonRecords(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};
	const selectedModel = this.getCurrentNodeParameter('customModel') as string;

	if (!selectedModel) return [];

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const data = {
			_domain: 'self.jsonModel = :jsonModel',
			_domainContext: {
				jsonModel: selectedModel,
			},
		};
		const response = await this.helpers.request!({
			method: 'POST',
			url: `/ws/rest/${MODEL.META_JSON_RECORD}/search`,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			body: { fields: ['attrs'], data },
			json: true,
		});

		isValidResponse(response);

		const records = response.data?.map((item: any) => {
			const properties = JSON.parse(item.attrs || '{}');
			return {
				id: item.id,
				...properties,
			};
		});

		return records.map((item: any) => ({
			name: item?.name || item?.id,
			value: item.id!,
		}));
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch records', error);
	}
}
