import { IExecuteFunctions, INodeExecutionData, NodeOperationError } from 'n8n-workflow';

import * as record from './record/Record.resource';
import * as dms from './dms/Dms.resource';
import * as generic from './generic/Generic.resource';

import type { AxelorType } from '../types/node.type';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const resource = this.getNodeParameter<AxelorType>('resource', 0);
	const operation = this.getNodeParameter('operation', 0) as string;

	const axelorNodeData = {
		resource,
		operation,
	} as AxelorType;

	try {
		switch (axelorNodeData.resource) {
			case 'record':
				returnData = await record[axelorNodeData.operation].execute.call(this, items);
				break;
			case 'dms':
				returnData = await dms[axelorNodeData.operation].execute.call(this, items);
				break;
			case 'generic':
				returnData = await generic[axelorNodeData.operation].execute.call(this, items);
				break;
			default:
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
		}
	} catch (error) {
		if (
			error.description &&
			(error.description as string).includes('cannot accept the provided value')
		) {
			error.description = `${error.description}. Consider using 'Typecast' option`;
		}
		throw error;
	}

	return [returnData];
}
