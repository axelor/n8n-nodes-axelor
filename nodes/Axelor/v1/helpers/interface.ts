import type { FieldType, IDataObject } from 'n8n-workflow';

export type TypesMap = Partial<Record<FieldType, string[]>>;
export type FieldCategory = 'fields' | 'metaFields' | 'metaJsonFields' | 'jsonFields';

export interface AxelorSelectionOption {
	value: string;
	icon: string | null;
	color: string | null;
	order: number;
	hidden: boolean;
	data: unknown;
	title: string;
}

export interface AxelorModelFieldSchema {
	name: string;
	title?: string;
	required?: boolean;
	type: string;
	nameColumn?: boolean;
	selectionList?: AxelorSelectionOption[];
	target?: string;
	targetName?: string;
	autoTitle?: string;
	selection?: string;
	json?: boolean;
	domain?: string;
	enumType?: string;
	subParameters?: AxelorModelFieldSchema[];
}

export interface AxelorRecord extends IDataObject {
	id: number;
	version: number;
}

export interface AxelorApiCredentials {
	baseUrl: string;
	username: string;
	password: string;
}

export interface WebServiceInfo {
	target: string;
	httpMethod: string;
}

export interface AxelorApiResponse {
	status: number;
	data?: IDataObject | IDataObject[];
	offset?: number;
	total?: number;
	[key: string]: unknown;
}
