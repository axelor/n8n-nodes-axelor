import { AllEntities } from 'n8n-workflow';

type NodeMap = {
	record:
		| 'create'
		| 'delete'
		| 'find'
		| 'search'
		| 'update'
		| 'read'
		| 'createCustom'
		| 'updateCustom';
	dms: 'listFiles' | 'listAttachments' | 'downloadFile' | 'addAttachments' | 'uploadFile';
	generic: 'runAction' | 'businessServiceCall';
};

export type AxelorType = AllEntities<NodeMap>;
