import { AxelorTrigger } from '../AxelorTrigger.node';

describe('AxelorTrigger Node', () => {
	let node: AxelorTrigger;

	beforeEach(() => {
		node = new AxelorTrigger();
	});

	it('should have correct name', () => {
		expect(node.description.name).toBe('axelorTrigger');
	});

	it('should have correct displayName', () => {
		expect(node.description.displayName).toBe('Axelor Delete Trigger');
	});

	it('should be in trigger group', () => {
		expect(node.description.group).toContain('trigger');
	});

	it('should have no inputs', () => {
		expect(node.description.inputs).toHaveLength(0);
	});

	it('should have one output', () => {
		expect(node.description.outputs).toHaveLength(1);
	});

	it('should require axelorApi credentials', () => {
		const creds = node.description.credentials ?? [];
		expect(creds.some((c) => c.name === 'axelorApi')).toBe(true);
	});

	it('should have a default webhook defined', () => {
		const webhooks = node.description.webhooks ?? [];
		expect(webhooks.some((w) => w.name === 'default')).toBe(true);
	});

	it('should have webhookMethods defined', () => {
		expect(node.webhookMethods).toBeDefined();
	});

	it('should have loadOptions method', () => {
		expect(node.methods?.loadOptions).toBeDefined();
	});
});
