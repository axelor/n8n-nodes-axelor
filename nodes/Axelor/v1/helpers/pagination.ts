import type { IDataObject, IExecuteFunctions, IPollFunctions } from 'n8n-workflow';

import { HTTP } from './constants';
import { isValidResponse } from './utils';
import { apiRequest } from '../transport';

/** Number of records requested per search call when paging through results. */
export const PAGE_SIZE = 100;

export interface SearchRecordsOptions {
	/** When true, every matching record is fetched page by page. */
	returnAll: boolean;
	/** Maximum number of records to return when `returnAll` is false. */
	limit?: number;
}

/**
 * Appends `id` to the sort order unless it is already part of it.
 *
 * Offset-based paging is only stable when the sort order is total: with a
 * non-unique sort key (or no sort at all) the database may return a record
 * on two pages, or on none, as rows shift between requests.
 */
export function ensureStableSort(sortBy?: string[]): string[] {
	const sort = Array.isArray(sortBy) ? sortBy.filter((s) => typeof s === 'string' && s) : [];
	const hasId = sort.some((s) => s === 'id' || s === '-id');
	return hasId ? sort : [...sort, 'id'];
}

/**
 * Searches records of `model` using the given search `body` (fields, sortBy, data...),
 * fetching them in pages of {@link PAGE_SIZE} and collecting the results.
 *
 * - `returnAll: true` pages until Axelor reports no more records (`total` reached
 *   or a short page), regardless of how many there are.
 * - `returnAll: false` stops once `limit` records have been collected. Requests
 *   are still capped at {@link PAGE_SIZE} so a large limit never produces a
 *   single huge request.
 */
export async function searchRecords(
	this: IExecuteFunctions | IPollFunctions,
	model: string,
	body: IDataObject,
	options: SearchRecordsOptions,
): Promise<IDataObject[]> {
	const url = `/ws/rest/${encodeURIComponent(model)}/search`;
	const max = options.returnAll ? Number.POSITIVE_INFINITY : Math.max(1, options.limit ?? 50);

	const sortBy = ensureStableSort(body.sortBy as string[] | undefined);
	const results: IDataObject[] = [];
	let offset = 0;

	while (results.length < max) {
		const limit = Math.min(PAGE_SIZE, max - results.length);
		const response = await apiRequest.call(this, HTTP.POST, url, {
			...body,
			sortBy,
			offset,
			limit,
		});

		isValidResponse(response);

		const page = Array.isArray(response.data) ? (response.data as IDataObject[]) : [];
		results.push(...page);
		offset += page.length;

		// A short (or empty) page means there is nothing left to fetch.
		if (page.length < limit) break;
		// Axelor reports the total number of matching records on every page.
		if (typeof response.total === 'number' && offset >= response.total) break;
	}

	return results;
}
