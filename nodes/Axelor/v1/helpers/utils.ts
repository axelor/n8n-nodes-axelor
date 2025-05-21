import { fromPairs, get, set } from 'lodash';
import {
	BINARY_ENCODING,
	FieldType,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import { Readable } from 'stream';

import { AxelorModelFieldSchema } from './interface';
import { AXELOR_FIELD_TYPE_MAP, AXELOR_SELECTION_FIELDS, UPLOAD_CHUNK_SIZE } from './constants';

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

export function createCriteria(fieldName: string, operator: string, value: string) {
	return {
		fieldName,
		operator,
		value,
	};
}

export async function getItemBinaryData(
	this: IExecuteFunctions,
	inputDataFieldName: string,
	i: number,
	chunkSize = UPLOAD_CHUNK_SIZE,
) {
	let contentLength: number;
	let fileContent: Buffer | Readable;
	let originalFilename: string | undefined;
	let mimeType;

	if (!inputDataFieldName) {
		throw new NodeOperationError(
			this.getNode(),
			'The name of the input field containing the binary file data must be set',
			{
				itemIndex: i,
			},
		);
	}
	const binaryData = this.helpers.assertBinaryData(i, inputDataFieldName);

	if (binaryData.id) {
		// Stream data in 256KB chunks, and upload the via the resumable upload api
		fileContent = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
		const metadata = await this.helpers.getBinaryMetadata(binaryData.id);
		contentLength = metadata.fileSize;
		originalFilename = metadata.fileName;
		if (metadata.mimeType) mimeType = binaryData.mimeType;
	} else {
		fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
		contentLength = fileContent.length;
		originalFilename = binaryData.fileName;
		mimeType = binaryData.mimeType;
	}

	return {
		contentLength,
		fileContent,
		originalFilename,
		mimeType,
	};
}

export function getJsonFields(jsonFields: Record<string, any>) {
	if (!jsonFields) return [];

	const jsonkeys = Object.keys(jsonFields);

	return jsonkeys.reduce((acc: Array<{ name: string; value: string }>, key) => {
		const attrs = jsonFields[key];
		for (const attrKey in attrs) {
			const attr = attrs[attrKey];
			const name = attr?.title || attr?.autoTitle;
			const value = `${key}_${attr?.name}`;
			acc.push({ name, value });
		}
		return acc;
	}, []);
}
