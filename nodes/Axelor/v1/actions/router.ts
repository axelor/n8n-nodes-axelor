import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import * as record from './record/Record.resource';

type RecordOperations = {
	[key: string]: {
		execute: (
			this: IExecuteFunctions,
			items: INodeExecutionData[],
		) => Promise<INodeExecutionData[]>;
	};
};

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const operation = this.getNodeParameter('operation', 0) as string;

	const typedRecord = record as unknown as RecordOperations;

	if (typedRecord[operation] && typeof typedRecord[operation].execute === 'function') {
		returnData = await typedRecord[operation].execute.call(this, items);
	} else {
		throw new Error(`Operation "${operation}" is not implemented!`);
	}

	return [returnData];
}
