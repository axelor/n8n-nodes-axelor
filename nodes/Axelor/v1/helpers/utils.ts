import { fromPairs, get, isEqual, join, set, startCase } from './lodash';
import {
	BINARY_ENCODING,
	FieldType,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
	INodePropertyOptions,
	IRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import { Readable } from 'stream';
import {
	AXELOR_FIELD_TYPE_MAP,
	AXELOR_SELECTION_FIELDS,
	FIELD_TYPE,
	NON_INPUT_FIELDS,
	PARAMETER,
	UPLOAD_CHUNK_SIZE,
} from './constants';
import { AxelorApiCredentials, AxelorModelFieldSchema, WebServiceInfo } from './interface';

export function normalizeKey(input: string) {
	if (input && !input.trim()) return input;
	return input.replace(/-/g, '_').toUpperCase();
}

export const mapAxelorTypeToFieldType = (axelorType: string): FieldType | undefined => {
	for (const [n8nType, axelorTypes] of Object.entries(AXELOR_FIELD_TYPE_MAP)) {
		if (axelorTypes?.includes(axelorType)) {
			return n8nType as FieldType;
		}
	}
	return 'string';
};

export const constructOptions = (field: AxelorModelFieldSchema) => {
	if (field?.selectionList?.length) {
		return field.selectionList.map((selection) => ({
			name: selection.title,
			value: selection.value,
		})) as INodePropertyOptions[];
	}

	return [];
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

export function buildRequestData(
	keys: string[],
	mapping: any,
	fields: any[],
	metaJsonFields: AxelorModelFieldSchema[],
): Record<string, any> {
	const data: Record<string, any> = {};
	const validFieldNames = new Set(fields.map((f: any) => f.name));
	const customFieldData: Record<string, any> = {};

	for (const key of keys) {
		if (!validFieldNames.has(key)) continue;

		const value = mapping.value?.[key];
		if (value === undefined) continue;

		const fieldMeta: any = fields.find((f) => f.name === key);
		if (!fieldMeta) continue;

		const [_, prefix, name] = key.match(/^([^_]+)_(.+)$/) || [];
		if (prefix && metaJsonFields.find((f) => isEqual(f.name, prefix))) {
			customFieldData[prefix] = {
				...(customFieldData[prefix] || {}),
				[name]: AXELOR_SELECTION_FIELDS.includes(fieldMeta.type) ? { id: value } : value,
			};
		} else {
			data[key] = AXELOR_SELECTION_FIELDS.includes(fieldMeta.type) ? { id: value } : value;
		}
	}

	for (const [key, value] of Object.entries(customFieldData)) {
		data[key] = JSON.stringify(value);
	}
	return data;
}

export function getSortByFields(this: IExecuteFunctions, i: number): Array<String> {
	const sortByValues = this.getNodeParameter('sortBy', i, {}) as {
		sortBy: { field: string; rule: string }[];
	};
	const sortByArray = get(sortByValues, 'sortBy', []);
	return sortByArray.length > 0
		? sortByArray.map((sort: any) => (sort.rule === 'desc' ? `-${sort.field}` : sort.field))
		: [];
}

export function getContextFields(this: IExecuteFunctions, i: number): Object {
	const contextValues = this.getNodeParameter('context', i, {}) as {
		context: { key: string; value: string }[];
	};
	const contextArray = get(contextValues, 'context', []);
	return fromPairs(contextArray.map((c: any) => [c.key, c.value]));
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

export function getJsonFields(jsonFields: Record<string, any>, fieldNames: Array<string> = []) {
	if (!jsonFields) return [];

	const jsonkeys = Object.keys(jsonFields);

	return jsonkeys.reduce((acc: Array<Record<string, any>>, key) => {
		const attrs = jsonFields[key];
		for (const attrKey in attrs) {
			const fields: Record<string, any> = {};
			const attr = attrs[attrKey];
			fields.attributeValue = `${key}_${attr?.name}`;

			if (fieldNames && fieldNames.length > 0) {
				fieldNames.forEach((f: string) => {
					fields[f] = attr[f] || '';
				});
			}
			acc.push(fields);
		}
		return acc;
	}, []);
}

export function manageCustomFieldData(
	data: Record<string, any>,
	record: Record<string, any>,
	metaJsonFields: AxelorModelFieldSchema[],
) {
	const fieldName = metaJsonFields.map((f) => f.name);
	for (const field of fieldName) {
		if (!data[field]) continue;
		const updated = JSON.parse(data[field] || '{}');
		const original = JSON.parse(record[field] || '{}');
		const merged = { ...original, ...updated };
		data[field] = JSON.stringify(merged);
	}
	return data;
}

export function filterFieldsByJson(fields: AxelorModelFieldSchema[]) {
	const { metaFields, metaJsonFields } = fields.reduce(
		(acc, field) => {
			(field.json ? acc.metaJsonFields : acc.metaFields).push(field);
			return acc;
		},
		{ metaFields: [], metaJsonFields: [] } as {
			metaFields: AxelorModelFieldSchema[];
			metaJsonFields: AxelorModelFieldSchema[];
		},
	);
	return { metaFields, metaJsonFields };
}

export function processSelectedFields(selectedFields: Array<String>) {
	const metaFields: Array<String> = [];
	const jsonFields = new Set();

	selectedFields.forEach((field) => {
		const [_, prefix] = field.match(/^([^_]+)_(.+)$/) || [];
		if (prefix) {
			jsonFields.add(prefix);
		} else {
			metaFields.push(field);
		}
	});
	return { fields: [...metaFields, ...Array.from(jsonFields)], jsonFields: Array.from(jsonFields) };
}

export function processCustomFieldResponse(
	record: Record<string, any>,
	selectedFields: Array<string>,
	jsonFields: Array<string> = [],
) {
	const result = { ...record };
	const customData: Record<string, any> = {};
	jsonFields.forEach((field) => {
		customData[field] = {};
	});

	selectedFields.forEach((field) => {
		const [_, prefix, name] = field.match(/^([^_]+)_(.+)$/) || [];
		if (prefix && jsonFields.includes(prefix)) {
			const data = JSON.parse(record[prefix] || '{}');
			customData[prefix][name] = data[name] || null;
		}
	});

	return { ...result, ...customData };
}

export const excludeNonInputFields = (field: any) => {
	return !NON_INPUT_FIELDS.includes(field?.type);
};

export const buildRequest = ({
	serviceInfo,
	credentials,
	values = {},
}: {
	serviceInfo: WebServiceInfo;
	credentials: AxelorApiCredentials;
	values: Record<string, string>;
}) => {
	const url = processUrl(serviceInfo.target, values);
	const headerParamerters = getParameter(values, PARAMETER.header);
	const qs = getParameter(values, PARAMETER.query);

	const request: IRequestOptions = {
		method: serviceInfo.httpMethod as IHttpRequestMethods,
		url,
		baseURL: credentials.baseUrl,
		headers: {
			Accept: '*/*',
			'Content-Type': 'application/json',
			...headerParamerters,
		},
		auth: {
			user: credentials.username,
			pass: credentials.password,
		},
		json: true,
		qs,
	};

	return request;
};

const processUrl = (url: string, value: Object) => {
	let processedUrl = replaceUrlParams(url, value, PARAMETER.path);
	return `/ws${processedUrl}`;
};

function replaceUrlParams(url: string, values: Record<string, any>, prefix: string) {
	const filteredValues = Object.fromEntries(
		Object.entries(values)
			.filter(([key]) => key.startsWith(prefix))
			.map(([key, value]) => [key.slice(prefix.length + 1), value]),
	);
	return url.replace(/{(\w+)}/g, (_, key) => {
		return filteredValues[key] !== undefined ? filteredValues[key] : `{${key}}`;
	});
}

export const buildResourceField = (
	fields: AxelorModelFieldSchema[],
	type: string,
): AxelorModelFieldSchema[] => {
	return fields?.map((field) => ({
		name: join([type, field.name], '_'),
		type: isEqual(field.type, FIELD_TYPE.COLLECTION) ? FIELD_TYPE.STRING : field.type,
		title: `${startCase(field.name)}   -${type}`,
		required: true,
	}));
};

export const getParameter = (values: Record<string, string> = {}, prefix: string) => {
	if (!values) return {};

	const parameter = Object.fromEntries(
		Object.entries(values)
			.filter(([key]) => key.startsWith(prefix))
			.map(([key, value]) => [key.slice(prefix.length + 1), value]),
	);

	return parameter;
};

export const processCollectionFields = (fields: AxelorModelFieldSchema[]) => {
	const $fields = fields.reduce((acc, curr) => {
		if (curr.type === 'collection') {
			const subParameters = curr?.subParameters || [];
			subParameters.forEach((item) => {
				acc.push({
					...item,
					name: join([curr.name, item.name], '_'),
					title: `${curr.name}'s ${item.name}`,
				});
			});
		} else {
			acc.push(curr);
		}
		return acc;
	}, [] as AxelorModelFieldSchema[]);
	return $fields;
};

export function buildBuisnessAPIRequestData(
	keys: string[],
	values: Record<string, any>,
	fields: any[],
): Record<string, any> {
	const data = Object.fromEntries(
		Object.entries(values || {}).filter(
			([key]) =>
				!key.startsWith(PARAMETER.header) &&
				!key.startsWith(PARAMETER.path) &&
				!key.startsWith(PARAMETER.query),
		),
	);

	const result: Record<string, any> = fields.reduce((acc, curr) => {
		if (curr.type === 'collection') {
			acc[curr.name] = {};
		}
		if (curr.type === 'array') {
			acc[curr.name] = [];
		}
		return acc;
	}, {});

	const prefixMap: Record<string, string[]> = {};

	for (const key of keys) {
		const match = key.match(/^([^_]+)_(.+)$/);
		if (match) {
			const [_, prefix, field] = match;
			if (!prefixMap[prefix]) prefixMap[prefix] = [];
			prefixMap[prefix].push(field);
		} else {
			result[key] = data?.[key];
		}
	}

	for (const prefix in prefixMap) {
		result[prefix] = {};
		for (const field of prefixMap[prefix]) {
			result[prefix][field] = data?.[`${prefix}_${field}`];
		}
	}

	return result;
}
