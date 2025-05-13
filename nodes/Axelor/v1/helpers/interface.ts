import { FieldType } from 'n8n-workflow';

export type TypesMap = Partial<Record<FieldType, string[]>>;

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
}
