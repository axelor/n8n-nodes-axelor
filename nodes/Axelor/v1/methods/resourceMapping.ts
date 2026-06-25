import {
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
	NodeOperationError,
	IDataObject,
} from 'n8n-workflow';
import type { FieldType, INodePropertyOptions } from 'n8n-workflow';
import {
	buildResourceField,
	constructOptions,
	excludeNonInputFields,
	getJsonFields,
	mapAxelorTypeToFieldType,
	normalizeKey,
	processCollectionFields,
} from '../helpers/utils';
import { AxelorModelFieldSchema } from '../helpers/interface';
import { isNull, startCase } from '../helpers/lodash';
import { getOptions } from '../helpers/api-helper';
import { apiRequest } from '../transport';
import {
	AXELOR_SELECTION_FIELDS,
	FIELD_TYPE,
	HTTP,
	MODEL,
	PARAMETER,
	WEB_SERVICE,
} from '../helpers/constants';

export async function getMetaModelFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const selectedModel = this.getCurrentNodeParameter('model') as string;

	if (!selectedModel) return { fields: [] };

	try {
		const url = `/ws/meta/fields/${encodeURIComponent(selectedModel)}`;
		const response = await apiRequest.call(this, HTTP.GET, url);
		const respData = response.data as IDataObject;

		const $fields: AxelorModelFieldSchema[] = (respData?.fields as AxelorModelFieldSchema[]) || [];

		const attrs = [
			'title',
			'required',
			'type',
			'selection',
			'selectionList',
			'target',
			'targetName',
			'autoTitle',
			'domain',
			'enumType',
		];
		const $jsonFields = (
			getJsonFields(respData?.jsonFields as Record<string, Record<string, IDataObject>>, attrs).map((item) => ({
				name: item.attributeValue,
				...item,
			})) as AxelorModelFieldSchema[]
		).filter(excludeNonInputFields);

		const mappedFields: ResourceMapperField[] = await Promise.all(
			[...$fields, ...$jsonFields].map(async (field) => {
				field['type'] = normalizeKey(field.type);

				let type: FieldType;
				let options: INodePropertyOptions[];
				if (field.selectionList) {
					type = FIELD_TYPE.OPTIONS as FieldType;
					options = constructOptions(field);
				} else {
					type = mapAxelorTypeToFieldType(field.type) || (FIELD_TYPE.STRING as FieldType);
					options = AXELOR_SELECTION_FIELDS.includes(field.type)
						? await getOptions.call(this, field)
						: [];
				}

				return {
					id: field.name,
					displayName: field.title || field.autoTitle || field.name,
					defaultMatch: false,
					required: field.required === true,
					display: true,
					removed: field.required === false,
					type,
					options,
				};
			}),
		);

		mappedFields.sort((a, b) => a.displayName.localeCompare(b.displayName));

		return { fields: mappedFields };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model fields', error);
	}
}

export async function getMetaJsonModelFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const selectedModel = this.getCurrentNodeParameter('customModel') as string;

	if (!selectedModel) return { fields: [] };

	try {
		const url = `/ws/meta/fields/${MODEL.META_JSON_RECORD}/?jsonModel=${selectedModel}`;
		const response = await apiRequest.call(this, HTTP.GET, url);
		const respData = response.data as IDataObject;

		const attrs = [
			'title',
			'required',
			'type',
			'selection',
			'selectionList',
			'target',
			'targetName',
			'autoTitle',
			'domain',
			'enumType',
		];
		const $jsonFields = (
			getJsonFields(respData?.jsonFields as Record<string, Record<string, IDataObject>>, attrs).map((item) => ({
				name: item.attributeValue,
				...item,
			})) as AxelorModelFieldSchema[]
		).filter(excludeNonInputFields);

		const mappedFields: ResourceMapperField[] = await Promise.all(
			$jsonFields.map(async (field) => {
				field['type'] = normalizeKey(field.type);

				let type: FieldType;
				let options: INodePropertyOptions[];
				if (field.selectionList) {
					type = FIELD_TYPE.OPTIONS as FieldType;
					options = constructOptions(field);
				} else {
					type = mapAxelorTypeToFieldType(field.type) || (FIELD_TYPE.STRING as FieldType);
					options = AXELOR_SELECTION_FIELDS.includes(field.type)
						? await getOptions.call(this, field)
						: [];
				}

				return {
					id: field.name,
					displayName: field.title || field.autoTitle || field.name,
					defaultMatch: false,
					required: field.required === true,
					display: true,
					removed: field.required === false,
					type,
					options,
				};
			}),
		);

		mappedFields.sort((a, b) => a.displayName.localeCompare(b.displayName));

		return { fields: mappedFields };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model fields', error);
	}
}

export async function loadActionBodyFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const module = this.getNodeParameter('module') as string;
	const actionRaw = this.getCurrentNodeParameter('action') as string;
	const actionData = JSON.parse(actionRaw);

	const action = actionData.name;
	const classFullyQualifiedName = actionData.classFullyQualifiedName;

	if (!module || !action) return { fields: [] };

	const qs: IDataObject = {};

	qs.classFullyQualifiedName = classFullyQualifiedName;
	qs.name = action;

	try {
		const url = WEB_SERVICE.CONNECT_WS_INFO;
		const response = await apiRequest.call(this, HTTP.GET, url, {}, qs);

		const serviceResponse = response as unknown as { requestBody?: { bodyParameters?: AxelorModelFieldSchema[] } };
		let $fields: AxelorModelFieldSchema[] = serviceResponse.requestBody?.bodyParameters || [];

		$fields = processCollectionFields($fields).filter((item) => item.name !== 'id');

		const headerParams =
			(response.headers as Array<{ name: string; value: string | null }>)
				?.filter((item) => isNull(item.value))
				?.map((item) => ({ name: item.name, type: 'string' })) || [];

		const $headerParameterField: AxelorModelFieldSchema[] = buildResourceField(
			headerParams,
			PARAMETER.header,
		);
		const $pathParameterField: AxelorModelFieldSchema[] =
			buildResourceField(response.pathParameters as AxelorModelFieldSchema[], PARAMETER.path) || [];
		const $queryParameterField =
			buildResourceField(response.queryParameters as AxelorModelFieldSchema[], PARAMETER.query) ||
			[];

		const mappedFields: ResourceMapperField[] = await Promise.all(
			[...$headerParameterField, ...$pathParameterField, ...$queryParameterField, ...$fields].map(
				async (field) => {
					field['type'] = normalizeKey(field.type);
					const type = mapAxelorTypeToFieldType(field.type);
					const relationFieldsResponse = await getOptions.call(this, field);

					const options = AXELOR_SELECTION_FIELDS.includes(field.type)
						? relationFieldsResponse
						: constructOptions(field);

					return {
						id: field.name,
						displayName: field.title || startCase(field.name),
						defaultMatch: false,
						required: field.required === true,
						display: true,
						removed: field.required === false,
						type,
						options,
					};
				},
			),
		);
		if (!mappedFields || mappedFields.length === 0)
			return { fields: [], emptyFieldsNotice: 'No Fields found in Axelor' };
		return { fields: mappedFields };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model fields', error);
	}
}
