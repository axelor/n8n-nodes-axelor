import { TypesMap } from './interface';

export const FIELD_TYPE_MAP: Readonly<TypesMap> = {
	string: ['TEXT', 'STRING'],
	number: ['DECIMAL'],
	boolean: ['BOOLEAN'],
	dateTime: ['DATE'],
	time: [],
	object: [],
	options: ['MANY_TO_ONE', 'INTEGER'],
	array: ['ONE_TO_MANY', 'MANY_TO_MANY'],
};
