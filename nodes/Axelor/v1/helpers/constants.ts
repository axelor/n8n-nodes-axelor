import { TypesMap } from './interface';

export const AXELOR_SELECTION_FIELDS = ['ONE_TO_ONE', 'MANY_TO_ONE', 'MANY_TO_MANY', 'ONE_TO_MANY'];

export const AXELOR_FIELD_TYPE_MAP: Readonly<TypesMap> = {
	string: ['TEXT', 'STRING'],
	number: ['DECIMAL'],
	boolean: ['BOOLEAN'],
	dateTime: ['DATE'],
	time: [],
	object: [],
	options: ['MANY_TO_ONE', 'INTEGER', 'ONE_TO_ONE'],
	// We are not able to see the field array values
	array: ['ONE_TO_MANY', 'MANY_TO_MANY'],
};
