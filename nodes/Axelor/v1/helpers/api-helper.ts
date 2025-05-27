import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import { FIELD_ATTRIBUTES, MODEL } from './constants';
import { AxelorModelFieldSchema, AxelorRecord, FieldCategory } from './interface';
import { filterFieldsByJson, getJsonFields, getNameColoumn, normalizeKey } from './utils';

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
		data: field.domain ? { _domain: field.domain } : {},
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
	options?: Record<string, any>,
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

	const url = options?.isCustomModel
		? `/ws/rest/${MODEL.META_JSON_RECORD}/${encodeURIComponent(recordId)}/fetch`
		: `/ws/rest/${encodeURIComponent(model)}/${encodeURIComponent(recordId)}/fetch`;

	try {
		const response = await this.helpers.request!({
			method: 'POST',
			url,
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

export async function getFields(
	this: IExecuteFunctions,
	model: string,
	options?: Record<string, any>,
): Promise<Record<FieldCategory, AxelorModelFieldSchema[]>> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	const url = options?.isCustomModel
		? `/ws/meta/fields/${MODEL.META_JSON_RECORD}/?jsonModel=${model}`
		: `/ws/meta/fields/${encodeURIComponent(model)}`;

	try {
		const respFields = await this.helpers.request!({
			method: 'GET',
			url,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			json: true,
		});
		const fields: AxelorModelFieldSchema[] = respFields.data?.fields || [];

		const { metaFields, metaJsonFields } = filterFieldsByJson(fields);

		const jsonFields = getJsonFields(respFields?.data.jsonFields, FIELD_ATTRIBUTES).map((item) => {
			return { ...item, name: item.attributeValue, type: normalizeKey(item?.type) };
		}) as AxelorModelFieldSchema[];
		return {
			fields,
			metaFields,
			metaJsonFields,
			jsonFields,
		};
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}
