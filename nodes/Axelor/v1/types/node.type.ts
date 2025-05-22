import { AllEntities } from 'n8n-workflow';

type NodeMap = {
	record: 'create' | 'delete' | 'find' | 'search' | 'update' | 'read';
	dms: 'listFiles' | 'listAttachments' | 'downloadFile' | 'addAttachments' | 'uploadFile';
};

export type AxelorType = AllEntities<NodeMap>;
