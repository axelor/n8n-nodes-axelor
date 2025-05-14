import { set } from 'lodash';
import {
	FieldType,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	NodeApiError,
} from 'n8n-workflow';

import { AxelorModelFieldSchema } from './interface';
import { AXELOR_FIELD_TYPE_MAP } from './constants';

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
	const fields = data?.fields || {};

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
