import { fromPairs, get, set } from 'lodash';
import {
	FieldType,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	NodeApiError,
} from 'n8n-workflow';

import { AxelorModelFieldSchema } from './interface';
import { AXELOR_FIELD_TYPE_MAP, AXELOR_SELECTION_FIELDS } from './constants';

export const mapAxelorTypeToFieldType = (axelorType: string): FieldType | undefined => {
	for (const [n8nType, axelorTypes] of Object.entries(AXELOR_FIELD_TYPE_MAP)) {
		if (axelorTypes?.includes(axelorType)) {
			return n8nType as FieldType;
		}
	}
	return undefined;
};

export const constructOptions = (field: AxelorModelFieldSchema) => {
	if (field?.selectionList?.length) {
		return field.selectionList.map((selection) => ({
			name: selection.title,
			value: selection.value,
		})) as INodePropertyOptions[];
	}

	return undefined;
};

export function processAxelorError(error: NodeApiError, id?: string, itemIndex?: number) {
	if (error.description === 'NOT_FOUND' && id) {
		error.description = `${id} is not a valid Record ID`;
	}
	if (error.description?.includes('You must provide an array of up to 10 record objects') && id) {
		error.description = `${id} is not a valid Record ID`;
	}

	if (itemIndex !== undefined) {
		set(error, 'context.itemIndex', itemIndex);
	}

	return error;
}

export function getNameColoumn(data: Record<string, any>): string {
	const fields = data?.fields || [];

	const preferredOrder = [
		(f: any) => f.nameColumn === true,
		(f: any) => f.name === 'name',
		(f: any) => f.name === 'code',
	];

	for (const selector of preferredOrder) {
		const field = fields.find(selector);
		if (field) return field.name;
	}

	return 'id';
}

export function wrapData(data: IDataObject | IDataObject[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		return [{ json: data }];
	}
	return data.map((item) => ({
		json: item,
	}));
}

export function isValidResponse(response: any): boolean {
	if (response.status === -1) {
		throw new Error(response.data?.message || 'Invalid response');
	}

	return true;
}

export function getChangedFieldNames(mapping: any): string[] {
	return (mapping.schema || [])
		.filter((field: any) => !field.removed)
		.map((field: any) => field.id);
}

export function buildRequestData(keys: string[], mapping: any, fields: any[]): Record<string, any> {
	const data: Record<string, any> = {};
	const validFieldNames = new Set(fields.map((f: any) => f.name));

	for (const key of keys) {
		if (!validFieldNames.has(key)) continue;

		const value = mapping.value?.[key];
		if (value === undefined) continue;

		const fieldMeta: any = fields.find((f) => f.name === key);
		if (!fieldMeta) continue;

		data[key] = AXELOR_SELECTION_FIELDS.includes(fieldMeta.type) ? { id: value } : value;
	}

	return data;
}

export function getSortByFields(this: IExecuteFunctions, i: number): Array<String> {
	const sortByValues = this.getNodeParameter('sortBy', i, {}) as {
		sortBy: { field: string; rule: string }[];
	};
	const sortByArray = get(sortByValues, 'sortBy', []);
	return sortByArray.length > 0
		? sortByArray.map((sort) => (sort.rule === 'desc' ? `-${sort.field}` : sort.field))
		: [];
}

export function getContextFields(this: IExecuteFunctions, i: number): Object {
	const contextValues = this.getNodeParameter('context', i, {}) as {
		context: { key: string; value: string }[];
	};
	const contextArray = get(contextValues, 'context', []);
	return fromPairs(contextArray.map((c) => [c.key, c.value]));
}

export function getSelectedFields(this: IExecuteFunctions, i: number): Array<String> {
	return this.getNodeParameter('fields', i, []) as Array<String>;
}
