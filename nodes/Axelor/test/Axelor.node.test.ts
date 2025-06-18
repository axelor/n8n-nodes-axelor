import { Axelor } from '../Axelor.node';
import { VersionedNodeType } from 'n8n-workflow';
import { AxelorV1 } from '../v1/AxelorV1.node';

describe('Axelor Node', () => {
	let axelorNode: Axelor;

	beforeEach(() => {
		axelorNode = new Axelor();
	});

	it('should be instance of VersionedNodeType', () => {
		expect(axelorNode).toBeInstanceOf(VersionedNodeType);
	});

	it('should have baseDescription with correct name', () => {
		expect(axelorNode.description.name).toBe('axelor');
		expect(axelorNode.description.displayName).toBe('Axelor');
	});

	it('should contain version 1', () => {
		expect(axelorNode.description.defaultVersion).toBe(1);
		expect(axelorNode.nodeVersions[1]).toBeInstanceOf(AxelorV1);
	});

	it('should pass baseDescription to versioned nodes', () => {
		const nodeV1 = axelorNode.nodeVersions[1] as AxelorV1;
		expect(nodeV1.description.displayName).toBe('Axelor');
	});
});
