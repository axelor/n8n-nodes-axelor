import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AxelorV1 } from './v1/AxelorV1.node';

export class Axelor extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Axelor',
			name: 'axelor',
			icon: 'file:axelor.svg',
			group: ['input'],
			description: 'Integrate with Axelor Open Platform',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new AxelorV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
