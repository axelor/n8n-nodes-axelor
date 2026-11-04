import type { IDataObject, IPollFunctions } from 'n8n-workflow';
import { AxelorPollTrigger } from '../AxelorPollTrigger.node';
import * as transport from '../v1/transport';

jest.mock('../v1/transport', () => {
	const originalModule = jest.requireActual('../v1/transport');
	return { ...originalModule, apiRequest: jest.fn() };
});

type MockPollFunctions = {
	getNodeParameter: jest.Mock;
	getNode: jest.Mock;
	getTimezone: jest.Mock;
	getWorkflowStaticData: jest.Mock;
	helpers: { returnJsonArray: jest.Mock };
};

const model = 'com.axelor.test.Model';
const url = `/ws/rest/${encodeURIComponent(model)}/search`;

const record = (id: number) => ({ id, name: `record ${id}` });
const records = (from: number, count: number) =>
	Array.from({ length: count }, (_, i) => record(from + i));

describe('AxelorPollTrigger Node', () => {
	let node: AxelorPollTrigger;
	let staticData: IDataObject;
	let mock: MockPollFunctions;
	let params: Record<string, unknown>;

	beforeEach(() => {
		jest.clearAllMocks();
		node = new AxelorPollTrigger();
		staticData = {};
		params = {
			'pollTimes.item': [{ mode: 'everyMinute' }],
			model,
			triggerOn: 'recordCreate',
			startPreference: 'all',
		};
		mock = {
			getNodeParameter: jest.fn((name: string, fallback: unknown) => params[name] ?? fallback),
			getNode: jest.fn(() => ({ name: 'Axelor Poll Trigger' })),
			getTimezone: jest.fn(() => 'UTC'),
			getWorkflowStaticData: jest.fn(() => staticData),
			helpers: {
				returnJsonArray: jest.fn((data: IDataObject[]) => data.map((json) => ({ json }))),
			},
		};
	});

	const poll = () => node.poll.call(mock as unknown as IPollFunctions);

	it('should not expose a Limit parameter', () => {
		expect(node.description.properties.some((p) => p.name === 'limit')).toBe(false);
	});

	it('should page through every record created since the last poll, sorted by id', async () => {
		staticData.lastTimeChecked = '2026-11-01T00:00:00.000Z';
		(transport.apiRequest as jest.Mock)
			.mockResolvedValueOnce({ status: 0, offset: 0, total: 120, data: records(1, 100) })
			.mockResolvedValueOnce({ status: 0, offset: 100, total: 120, data: records(101, 20) });

		const result = await poll();

		expect(transport.apiRequest).toHaveBeenCalledTimes(2);
		expect(transport.apiRequest).toHaveBeenNthCalledWith(1, 'POST', url, {
			sortBy: ['id'],
			offset: 0,
			limit: 100,
			data: {
				criteria: [{ fieldName: 'createdOn', operator: '>=', value: '2026-11-01T00:00:00.000Z' }],
			},
		});
		expect(transport.apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			url,
			expect.objectContaining({ offset: 100, limit: 100 }),
		);
		expect(result).toHaveLength(1);
		expect(result?.[0]).toHaveLength(120);
		expect(result?.[0][0].json).toEqual(record(1));
		expect(result?.[0][119].json).toEqual(record(120));
	});

	it('should advance lastTimeChecked to the time the poll started', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValue({ status: 0, total: 0, data: [] });
		const before = Date.now();

		const result = await poll();

		expect(result).toBeNull();
		const checked = Date.parse(staticData.lastTimeChecked as string);
		expect(checked).toBeGreaterThanOrEqual(before);
		expect(checked).toBeLessThanOrEqual(Date.now());
	});

	it('should look at createdOn or updatedOn when triggering on update', async () => {
		params.triggerOn = 'recordUpdate';
		staticData.lastTimeChecked = '2026-11-01T00:00:00.000Z';
		(transport.apiRequest as jest.Mock).mockResolvedValue({
			status: 0,
			total: 1,
			data: [record(7)],
		});

		const result = await poll();

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			url,
			expect.objectContaining({
				data: {
					criteria: [
						{
							operator: 'or',
							criteria: [
								{ fieldName: 'createdOn', operator: '>=', value: '2026-11-01T00:00:00.000Z' },
								{ fieldName: 'updatedOn', operator: '>=', value: '2026-11-01T00:00:00.000Z' },
							],
						},
					],
				},
			}),
		);
		expect(result?.[0]).toEqual([{ json: record(7) }]);
	});

	it('should start from the epoch on the first poll when starting from all records', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValue({ status: 0, total: 0, data: [] });

		await poll();

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			url,
			expect.objectContaining({
				data: {
					criteria: [{ fieldName: 'createdOn', operator: '>=', value: '1970-01-01T00:00:00.000Z' }],
				},
			}),
		);
	});

	it('should fail when no model is selected', async () => {
		params.model = '';
		await expect(poll()).rejects.toThrow('No model selected');
	});
});
