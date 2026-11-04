import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import * as transport from '../../../v1/transport';
import { ensureStableSort, PAGE_SIZE, searchRecords } from '../../../v1/helpers/pagination';

jest.mock('../../../v1/transport', () => {
	const originalModule = jest.requireActual('../../../v1/transport');
	return { ...originalModule, apiRequest: jest.fn() };
});

const model = 'com.axelor.test.Model';
const url = `/ws/rest/${encodeURIComponent(model)}/search`;

function makeRecords(from: number, count: number): IDataObject[] {
	return Array.from({ length: count }, (_, i) => ({ id: from + i }));
}

describe('ensureStableSort', () => {
	test('appends id when no sort is given', () => {
		expect(ensureStableSort(undefined)).toEqual(['id']);
		expect(ensureStableSort([])).toEqual(['id']);
	});

	test('appends id after the user sort', () => {
		expect(ensureStableSort(['-updatedOn', 'name'])).toEqual(['-updatedOn', 'name', 'id']);
	});

	test('keeps the sort unchanged when id is already part of it', () => {
		expect(ensureStableSort(['-id'])).toEqual(['-id']);
		expect(ensureStableSort(['name', 'id'])).toEqual(['name', 'id']);
	});
});

describe('searchRecords', () => {
	const context = {} as IExecuteFunctions;
	const apiRequest = transport.apiRequest as jest.Mock;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('fetches every page when returnAll is true', async () => {
		const total = 250;
		apiRequest
			.mockResolvedValueOnce({ status: 0, total, offset: 0, data: makeRecords(0, 100) })
			.mockResolvedValueOnce({ status: 0, total, offset: 100, data: makeRecords(100, 100) })
			.mockResolvedValueOnce({ status: 0, total, offset: 200, data: makeRecords(200, 50) });

		const body = { fields: ['id'], data: {} };
		const result = await searchRecords.call(context, model, body, { returnAll: true });

		expect(result).toHaveLength(total);
		expect(result[0]).toEqual({ id: 0 });
		expect(result[249]).toEqual({ id: 249 });

		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(apiRequest).toHaveBeenNthCalledWith(1, 'POST', url, {
			fields: ['id'],
			data: {},
			sortBy: ['id'],
			offset: 0,
			limit: PAGE_SIZE,
		});
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			url,
			expect.objectContaining({ offset: 100 }),
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			url,
			expect.objectContaining({ offset: 200 }),
		);
	});

	test('stops after a full page when total is reached', async () => {
		apiRequest.mockResolvedValueOnce({
			status: 0,
			total: 100,
			offset: 0,
			data: makeRecords(0, 100),
		});

		const result = await searchRecords.call(context, model, {}, { returnAll: true });

		expect(result).toHaveLength(100);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	test('stops on an empty first page', async () => {
		apiRequest.mockResolvedValueOnce({ status: 0, total: 0, offset: 0, data: [] });

		const result = await searchRecords.call(context, model, {}, { returnAll: true });

		expect(result).toEqual([]);
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	test('sends a single request when the limit fits in one page', async () => {
		apiRequest.mockResolvedValueOnce({
			status: 0,
			total: 1000,
			offset: 0,
			data: makeRecords(0, 30),
		});

		const result = await searchRecords.call(context, model, {}, { returnAll: false, limit: 30 });

		expect(result).toHaveLength(30);
		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			url,
			expect.objectContaining({ offset: 0, limit: 30 }),
		);
	});

	test('pages up to the limit without exceeding the page size', async () => {
		apiRequest
			.mockResolvedValueOnce({ status: 0, total: 1000, offset: 0, data: makeRecords(0, 100) })
			.mockResolvedValueOnce({ status: 0, total: 1000, offset: 100, data: makeRecords(100, 100) })
			.mockResolvedValueOnce({ status: 0, total: 1000, offset: 200, data: makeRecords(200, 50) });

		const result = await searchRecords.call(context, model, {}, { returnAll: false, limit: 250 });

		expect(result).toHaveLength(250);
		expect(apiRequest).toHaveBeenCalledTimes(3);
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			url,
			expect.objectContaining({ offset: 0, limit: 100 }),
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			url,
			expect.objectContaining({ offset: 100, limit: 100 }),
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			3,
			'POST',
			url,
			expect.objectContaining({ offset: 200, limit: 50 }),
		);
	});

	test('keeps the user sort and adds id as a tiebreaker', async () => {
		apiRequest.mockResolvedValueOnce({ status: 0, total: 1, offset: 0, data: makeRecords(0, 1) });

		await searchRecords.call(
			context,
			model,
			{ sortBy: ['-updatedOn'] },
			{ returnAll: false, limit: 50 },
		);

		expect(apiRequest).toHaveBeenCalledWith(
			'POST',
			url,
			expect.objectContaining({ sortBy: ['-updatedOn', 'id'] }),
		);
	});

	test('throws when Axelor reports an error', async () => {
		apiRequest.mockResolvedValueOnce({ status: -1, data: { message: 'Boom' } });

		await expect(searchRecords.call(context, model, {}, { returnAll: true })).rejects.toThrow(
			'Boom',
		);
	});
});
