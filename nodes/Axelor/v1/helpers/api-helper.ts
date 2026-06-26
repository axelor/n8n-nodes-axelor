import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeOperationError,
} from 'n8n-workflow';
import type { AxelorModelFieldSchema, AxelorRecord, FieldCategory } from './interface';

type ApiHelperOptions = {
	isCustomModel?: boolean;
	jsonMetaFields?: boolean;
};
import { filterFieldsByJson, getJsonFields, getNameColoumn, normalizeKey } from './utils';
import { FIELD_ATTRIBUTES, HTTP, MODEL } from './constants';
import { apiRequest } from '../transport';

export async function getOptions(
	this: ILoadOptionsFunctions,
	field: AxelorModelFieldSchema,
): Promise<INodePropertyOptions[]> {
	const { target, targetName } = field;

	if (!target) return [];

	const body = {
		data: field.domain ? { _domain: field.domain } : {},
		fields: [targetName ?? 'id'],
	};

	try {
		const url = `/ws/rest/${target}/search`;
		const response = await apiRequest.call(this, HTTP.POST, url, body);

		const records = (Array.isArray(response.data) ? response.data : []) as AxelorRecord[];

		return records.map((record) => ({
			name: String(targetName ? record[targetName] ?? '' : record.id),
			value: record.id,
		}));
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model options', error);
	}
}

export async function getMetaFields(
	this: IExecuteFunctions,
	model: string,
	options?: ApiHelperOptions,
): Promise<AxelorModelFieldSchema[]> {
	try {
		const url = `/ws/meta/fields/${encodeURIComponent(model)}`;
		const respFields = await apiRequest.call(this, HTTP.GET, url);
		const respData = respFields.data as IDataObject;

		const fields: AxelorModelFieldSchema[] = (respData?.fields as AxelorModelFieldSchema[]) || [];

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
		const jsonFields = getJsonFields(respData?.jsonFields as Record<string, Record<string, IDataObject>>, attrs).map((item) => {
			return { ...item, name: item.attributeValue, type: normalizeKey(item?.type as string) };
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
	options?: ApiHelperOptions,
): Promise<AxelorRecord | null> {
	if (!model || !recordId) {
		throw new NodeOperationError(
			this.getNode(),
			'Model and recordId are required to fetch the record.',
		);
	}

	const url = options?.isCustomModel
		? `/ws/rest/${MODEL.META_JSON_RECORD}/${encodeURIComponent(recordId)}/fetch`
		: `/ws/rest/${encodeURIComponent(model)}/${encodeURIComponent(recordId)}/fetch`;

	try {
		const response = await apiRequest.call(this, HTTP.POST, url);

		const record = Array.isArray(response.data) ? response.data[0] : response.data;
		return (record as AxelorRecord) || null;
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch fields for the record', error);
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

		const nameColumn = getNameColoumn(respFields?.data as IDataObject);

		const fields = nameColumn && nameColumn !== 'id' ? ['id', nameColumn] : ['id'];

		const searchUrl = `/ws/rest/${encodeURIComponent(selectedModel)}/search`;
		const body = { fields };
		const result = await apiRequest.call(this, HTTP.POST, searchUrl, body);

		return Array.isArray(result.data)
			? (result.data as AxelorRecord[]).map((item) => ({
					name: item[nameColumn] ? String(item[nameColumn]) : `null(${item.id})`,
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
	options?: ApiHelperOptions,
): Promise<Record<FieldCategory, AxelorModelFieldSchema[]>> {
	const url = options?.isCustomModel
		? `/ws/meta/fields/${MODEL.META_JSON_RECORD}/?jsonModel=${model}`
		: `/ws/meta/fields/${encodeURIComponent(model)}`;

	try {
		const respFields = await apiRequest.call(this, HTTP.GET, url);
		const respData = respFields.data as IDataObject;

		const fields: AxelorModelFieldSchema[] = (respData?.fields as AxelorModelFieldSchema[]) || [];

		const { metaFields, metaJsonFields } = filterFieldsByJson(fields);

		const jsonFields = getJsonFields(respData?.jsonFields as Record<string, Record<string, IDataObject>>, FIELD_ATTRIBUTES).map((item) => {
			return { ...item, name: item.attributeValue, type: normalizeKey(item?.type as string) };
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
