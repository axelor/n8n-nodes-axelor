import { FieldType, INodePropertyOptions } from 'n8n-workflow';

import { AxelorModelFieldSchema } from './interface';
import { FIELD_TYPE_MAP } from './constants';

export const mapAxelorTypeToFieldType = (axelorType: string): FieldType | undefined => {
	for (const [n8nType, axelorTypes] of Object.entries(FIELD_TYPE_MAP)) {
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
