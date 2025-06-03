import { FieldType } from 'n8n-workflow';

export type TypesMap = Partial<Record<FieldType, string[]>>;
export type FieldCategory = 'fields' | 'metaFields' | 'metaJsonFields' | 'jsonFields';

export interface AxelorSelectionOption {
	value: string;
	icon: string | null;
	color: string | null;
	order: number;
	hidden: boolean;
	data: any;
	title: string;
}

export interface AxelorModelFieldSchema {
	name: string;
	title?: string;
	required?: boolean;
	type: string;
	selectionList?: AxelorSelectionOption[];
	target?: string;
	targetName?: string;
	autoTitle?: string;
	selection?: string;
	json?: boolean;
	domain?: string;
	enumType?: string;
}

export interface AxelorRecord {
	id: number;
	version: number;
	[key: string]: any;
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

export interface WorkflowCredentials {
	baseUrl: string;
	username: string;
	password: string;
}
