import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getJsonFields, getNameColoumn, isValidResponse } from '../helpers/utils';
import { startCase, toLower } from '../helpers/lodash';
import { HTTP, MODEL, WEB_SERVICE } from '../helpers/constants';
import { apiRequest } from '../transport';

export async function getMetaModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const body = {
			fields: ['name', 'fullName'],
		};
		const url = `/ws/rest/${MODEL.META_MODEL}/search`;
		const response = await apiRequest.call(this, HTTP.POST, url, body);

		return Array.isArray(response.data)
			? response.data.map((model: IDataObject) => ({
					name: model.name as string,
					value: model.fullName as string,
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getMetaModelRecords(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const selectedModel = this.getCurrentNodeParameter('model') as string;

	if (!selectedModel) return [];

	try {
		const fieldsUrl = `/ws/meta/fields/${encodeURIComponent(selectedModel)}`;
		const respFields = await apiRequest.call(this, HTTP.GET, fieldsUrl);

		const nameColumn = getNameColoumn(respFields?.data as Record<string, unknown>);
		const fields = nameColumn && nameColumn !== 'id' ? ['id', nameColumn] : ['id'];

		const url = `/ws/rest/${encodeURIComponent(selectedModel)}/search`;
		const result = await apiRequest.call(this, HTTP.POST, url, { fields });

		return Array.isArray(result.data)
			? result.data.map((item: IDataObject) => ({
					name: item[nameColumn] ? String(item[nameColumn]) : `null(${item.id})`,
					value: item.id as number,
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch records', error);
	}
}

export async function loadMetaFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const selectedModel = this.getCurrentNodeParameter('model') as string;

	if (!selectedModel) return [];

	try {
		const url = `/ws/meta/fields/${encodeURIComponent(selectedModel)}`;
		const respFields = await apiRequest.call(this, HTTP.GET, url);

		if (respFields.status == -1) {
			throw new Error((respFields.data as IDataObject)?.message as string || 'Invalid response');
		}
		const attrs = ['title', 'autoTitle'];
		const jsonFields = getJsonFields((respFields?.data as IDataObject)?.jsonFields as Record<string, Record<string, IDataObject>>, attrs).map((item) => {
			const { title, autoTitle, attributeValue } = item;
			return {
				name: (title ? title : autoTitle) as string,
				value: attributeValue as string,
			};
		});

		const metaField = (
			((respFields.data as IDataObject)?.fields as Array<{ name: string; title?: string }>) ?? []
		).map((item) => ({
			name: item.title || startCase(toLower(item.name)),
			value: item.name,
		}));
		return [...metaField, ...jsonFields];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch Fields', error);
	}
}

export async function getModules(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	try {
		const url = '/ws/connect/connect-tags';
		const response = await apiRequest.call(this, HTTP.GET, url);

		return Array.isArray(response)
			? response.map((value: string) => ({
					name: value,
					value: value,
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getActions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const module = this.getNodeParameter('module') as string;

	const qs: IDataObject = {};

	if (module) {
		qs.tagName = module;
	}

	try {
		const url = WEB_SERVICE.CONNECT_WS;
		const body: IDataObject = {};
		const response = await apiRequest.call(this, HTTP.GET, url, body, qs);

		return Array.isArray(response)
			? response.map((item: { name: string; classFullyQualifiedName: string }) => ({
					name: item.name,
					value: JSON.stringify({
						name: item.name,
						classFullyQualifiedName: item.classFullyQualifiedName,
					}),
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getMetaJsonModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const body = {
			fields: ['name', 'title'],
		};

		const url = `/ws/rest/${MODEL.META_JSON_MODEL}/search`;

		const response = await apiRequest.call(this, HTTP.POST, url, body);

		return Array.isArray(response.data)
			? response.data.map((model: IDataObject) => ({
					name: model.title as string,
					value: model.name as string,
				}))
			: [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getMetaJsonRecords(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const selectedModel = this.getCurrentNodeParameter('customModel') as string;

	if (!selectedModel) return [];

	try {
		const data = {
			_domain: 'self.jsonModel = :jsonModel',
			_domainContext: {
				jsonModel: selectedModel,
			},
		};
		const body = { fields: ['attrs'], data };
		const url = `/ws/rest/${MODEL.META_JSON_RECORD}/search`;
		const response = await apiRequest.call(this, HTTP.POST, url, body);

		isValidResponse(response);

		const records: IDataObject[] = Array.isArray(response.data)
			? response.data.map((item: IDataObject) => {
					const properties = JSON.parse((item.attrs as string) || '{}') as IDataObject;
					return { id: item.id, ...properties };
				})
			: [];

		return records.map((item: IDataObject) => ({
			name: (item.name || item.id) as string,
			value: item.id as number,
		}));
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch records', error);
	}
}
