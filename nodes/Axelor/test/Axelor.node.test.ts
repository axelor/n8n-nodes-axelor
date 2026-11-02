import { Axelor } from '../Axelor.node';

describe('Axelor Node', () => {
	let axelorNode: Axelor;

	beforeEach(() => {
		axelorNode = new Axelor();
	});

	it('should have correct name and displayName', () => {
		expect(axelorNode.description.name).toBe('axelor');
		expect(axelorNode.description.displayName).toBe('Axelor');
	});

	it('should be version 1', () => {
		expect(axelorNode.description.version).toBe(1);
	});

	it('should be a regular (non-trigger) node', () => {
		expect(axelorNode.description.group).toEqual(['input']);
		expect(axelorNode.description.inputs).toHaveLength(1);
		expect(axelorNode.description.outputs).toHaveLength(1);
	});

	it('should be usable as an AI tool', () => {
		expect(axelorNode.description.usableAsTool).toBe(true);
	});

	it('should require axelorApi credentials', () => {
		const creds = axelorNode.description.credentials ?? [];
		expect(creds.some((c) => c.name === 'axelorApi')).toBe(true);
	});

	it('should expose record, dms and generic resources', () => {
		const resource = axelorNode.description.properties.find((p) => p.name === 'resource');
		const values = (resource?.options ?? []).map((o) => (o as { value: string }).value);
		expect(values).toEqual(['record', 'dms', 'generic']);
	});

	it('should have loadOptions and resourceMapping methods', () => {
		expect(axelorNode.methods.loadOptions).toBeDefined();
		expect(axelorNode.methods.resourceMapping).toBeDefined();
	});
});
