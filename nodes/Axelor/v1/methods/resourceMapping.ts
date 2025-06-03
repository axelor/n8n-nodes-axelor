import {
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
	NodeOperationError,
	IDataObject,
} from 'n8n-workflow';
import type { FieldType, INodePropertyOptions } from 'n8n-workflow';
import { isNull } from 'lodash';

import { AxelorModelFieldSchema } from '../helpers/interface';
import {
	buildResourceField,
	constructOptions,
	excludeNonInputFields,
	getJsonFields,
	mapAxelorTypeToFieldType,
	normalizeKey,
	processCollectionFields,
} from '../helpers/utils';
import { AXELOR_SELECTION_FIELDS, FIELD_TYPE, MODEL, PARAMETER } from '../helpers/constants';
import { getOptions } from '../helpers/api-helper';

export async function getMetaModelFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const credentials = await this.getCredentials('axelorApi');
	const selectedModel = this.getCurrentNodeParameter('model') as string;

	if (!selectedModel) return { fields: [] };

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `/ws/meta/fields/${encodeURIComponent(selectedModel)}`,
			baseURL: credentials.baseUrl as string,
			auth: { user: credentials.username as string, pass: credentials.password as string },
			json: true,
		});

		const $fields: AxelorModelFieldSchema[] = response.data?.fields || [];

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
		const $jsonFields = getJsonFields(response?.data.jsonFields, attrs)
			.map((item) => ({ name: item.attributeValue, ...item }))
			.filter(excludeNonInputFields) as AxelorModelFieldSchema[];

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
	const credentials = await this.getCredentials('axelorApi');
	const selectedModel = this.getCurrentNodeParameter('customModel') as string;

	if (!selectedModel) return { fields: [] };

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `/ws/meta/fields/${MODEL.META_JSON_RECORD}/?jsonModel=${selectedModel}`,
			baseURL: credentials.baseUrl as string,
			auth: { user: credentials.username as string, pass: credentials.password as string },
			json: true,
		});

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
		const $jsonFields = getJsonFields(response?.data.jsonFields, attrs)
			.map((item) => ({ name: item.attributeValue, ...item }))
			.filter(excludeNonInputFields) as AxelorModelFieldSchema[];

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
	const credentials = await this.getCredentials('axelorApi');

	const module = this.getNodeParameter('module') as string;
	const actionRaw = this.getCurrentNodeParameter('action') as string;
	const actionData = JSON.parse(actionRaw);

	const action = actionData.name;
	const classFullyQualifiedName = actionData.classFullyQualifiedName;

	if (!module || !action) return { fields: [] };

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	const qs: IDataObject = {};

	qs.classFullyQualifiedName = classFullyQualifiedName;
	qs.name = action;

	try {
		const response = await this.helpers.request({
			method: 'GET',
			url: `/ws/connect/connect-web-service-info`,
			baseURL: credentials.baseUrl as string,
			auth: {
				user: credentials.username as string,
				pass: credentials.password as string,
			},
			json: true,
			qs,
		});

		let $fields: AxelorModelFieldSchema[] = response.requestBody?.bodyParameters || [];

		$fields = processCollectionFields($fields);

		const headerParams =
			response.headers
				?.filter((item: any) => isNull(item.value))
				?.map((item: any) => ({ name: item.name, type: 'string' })) || [];

		const $headerParameterField: AxelorModelFieldSchema[] = buildResourceField(
			headerParams,
			PARAMETER.header,
		);
		const $pathParameterField: AxelorModelFieldSchema[] =
			buildResourceField(response.pathParameters, PARAMETER.path) || [];
		const $queryParameterField =
			buildResourceField(response.queryParameters, PARAMETER.query) || [];

		const mappedFields: ResourceMapperField[] = await Promise.all(
			[...$headerParameterField, ...$pathParameterField, ...$queryParameterField, ...$fields].map(
				async (field) => {
					const type = mapAxelorTypeToFieldType(field.type.toUpperCase());
					const relationFieldsResponse = await getOptions.call(this, field);

					const options = AXELOR_SELECTION_FIELDS.includes(field.type.toUpperCase())
						? relationFieldsResponse
						: constructOptions(field);

					return {
						id: field.name,
						displayName: field.title || field.name,
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

		return { fields: mappedFields };
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch model fields', error);
	}
}
