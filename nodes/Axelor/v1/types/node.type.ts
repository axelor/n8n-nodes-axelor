import { AllEntities } from 'n8n-workflow';

type NodeMap = {
	record: 'create' | 'delete' | 'find' | 'search' | 'update' | 'read';
	dms: 'listFiles' | 'listAttachments' | 'downloadFile' | 'addAttachments' | 'uploadFile';
	generic: 'runAction';
};

export type AxelorType = AllEntities<NodeMap>;
