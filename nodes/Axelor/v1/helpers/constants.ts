/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { FieldType, NodePropertyTypes } from 'n8n-workflow';

export const AXELOR_SELECTION_FIELDS = ['ONE_TO_ONE', 'MANY_TO_ONE', 'MANY_TO_MANY', 'ONE_TO_MANY'];

type ExtendedFieldType = FieldType | NodePropertyTypes;

export type ExtendedTypesMap = Partial<Record<ExtendedFieldType, string[]>>;

export const AXELOR_FIELD_TYPE_MAP: Readonly<ExtendedTypesMap> = {
	string: ['TEXT', 'STRING', 'ENUM'],
	number: ['DECIMAL', 'INTEGER', 'NUMBER'],
	boolean: ['BOOLEAN'],
	dateTime: ['DATE', 'DATETIME'],
	time: [],
	object: [],
	options: ['MANY_TO_ONE', 'ONE_TO_ONE'],
	array: ['ONE_TO_MANY', 'MANY_TO_MANY', 'ARRAY'],
	fixedCollection: ['COLLECTION'],
};

export const MODEL = {
	CONNECT_DB_WEBHOOK: 'com.axelor.connect.db.Webhook',
	META_JSON_MODEL: 'com.axelor.meta.db.MetaJsonModel',
	META_JSON_RECORD: 'com.axelor.meta.db.MetaJsonRecord',
};

export const ARCHIVED_OPTIONS = [
	{
		name: 'Yes',
		value: true,
	},
	{
		name: 'No',
		value: false,
	},
	{
		name: 'Unset',
		value: 'unset',
	},
];

export const SORT_BY_OPTIONS = [
	{
		name: 'ASC',
		value: 'asc',
	},
	{
		name: 'DESC',
		value: 'desc',
	},
];
export const START_OPTIONS = [
	{
		name: 'Since specific date',
		value: 'sinceSpecificDate',
	},
	{
		name: 'All',
		value: 'all',
	},
];

export const UPLOAD_CHUNK_SIZE = 256 * 1024;

export const FIELD_ATTRIBUTES = [
	'title',
	'required',
	'type',
	'selectionList',
	'selectionList',
	'target',
	'targetName',
];

export const FIELD_TYPE = {
	OPTIONS: 'options',
	STRING: 'string',
};

export const NON_INPUT_FIELDS = ['button', 'panel', 'label', 'spacer', 'separator'];

// BusinessCall Parameter
export const PARAMETER = {
	path: 'pathParameter',
	query: 'queryParameter',
	header: 'headerParameter',
	body: 'bodyParameter',
};

export const HTTP_METHOD_OPTIONS = [
	{
		name: 'GET',
		value: 'GET',
	},
	{
		name: 'POST',
		value: 'POST',
	},
	{
		name: 'PUT',
		value: 'PUT',
	},
	{
		name: 'DELETE',
		value: 'DELETE',
	},
	{
		name: 'PATCH',
		value: 'PATCH',
	},
];
