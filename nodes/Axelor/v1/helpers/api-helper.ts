import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { AxelorModelFieldSchema, AxelorRecord } from './interface';
import { getJsonFields, getNameColoumn, isValidResponse, normalizeKey } from './utils';
import { MODEL } from './constants';

export async function getOptions(
	this: ILoadOptionsFunctions,
	field: AxelorModelFieldSchema,
): Promise<INodePropertyOptions[]> {
	const { target, targetName } = field;

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
		fields: [targetName ?? 'id'],
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
	options?: Record<string, any>,
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

		if (!options?.jsonMetaFields) {
			return fields;
		}
		const attrs = [
			'title',
			'required',
			'type',
			'selectionList',
			'selectionList',
			'target',
			'targetName',
		];
		const jsonFields = getJsonFields(respFields?.data.jsonFields, attrs).map((item) => {
			return { ...item, name: item.attributeValue, type: normalizeKey(item?.type) };
		}) as AxelorModelFieldSchema[];

		return [...fields, ...jsonFields];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getMetaModelFieldRecord(
	this: IExecuteFunctions,
	model: string,
	recordId: number,
): Promise<AxelorRecord | null> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!model || !recordId) {
		throw new NodeOperationError(
			this.getNode(),
			'Model and recordId are required to fetch the record.',
		);
	}

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const response = await this.helpers.request!({
			method: 'POST',
			url: `/ws/rest/${encodeURIComponent(model)}/${encodeURIComponent(recordId)}/fetch`,
			baseURL: baseUrl,
			auth: { user: username, pass: password },
			json: true,
			body: {},
		});

		return response.data?.[0] || {};
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch fields for the record', error);
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

export async function getModelCustomFields(
	this: IExecuteFunctions,
	model: string,
	options?: Record<string, any>,
): Promise<AxelorModelFieldSchema[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	const data = {
		_domain: 'self.json = true AND self.metaModel.fullName=:model',
		_domainContext: { model },
	};

	try {
		const response = await this.helpers.request!({
			method: 'POST',
			url: `/ws/rest/com.axelor.meta.db.MetaField/search`,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			json: true,
			body: {
				data,
				fields: options?.fields ? options.fields : ['id', 'name'],
				limit: 50,
			},
		});
		isValidResponse(response);
		return response.data || [];
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}

export async function getCustomModelFields(
	this: IExecuteFunctions,
	model: string,
	options?: Record<string, any>,
): Promise<AxelorModelFieldSchema[]> {
	const credentials = (await this.getCredentials('axelorApi')) as {
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
			url: `/ws/meta/fields/${MODEL.META_JSON_RECORD}/?jsonModel=${model}`,
			baseURL: credentials.baseUrl as string,
			auth: {
				user: credentials.username,
				pass: credentials.password,
			},
			json: true,
		});

		const attrs = [
			'title',
			'required',
			'type',
			'selectionList',
			'selectionList',
			'target',
			'targetName',
		];
		const jsonFields = getJsonFields(response?.data.jsonFields, attrs).map((item) => {
			return { ...item, name: item.attributeValue, type: normalizeKey(item?.type) };
		}) as AxelorModelFieldSchema[];

		return jsonFields;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}
