import type { IExecuteFunctions } from 'n8n-workflow';
import { getItemBinaryData } from '../../../v1/helpers/utils';

type MockHelpers = {
	assertBinaryData: jest.Mock;
	getBinaryDataBuffer: jest.Mock;
	getBinaryMetadata: jest.Mock;
};

describe('getItemBinaryData', () => {
	let helpers: MockHelpers;
	let context: IExecuteFunctions;
	const bytes = Buffer.from('hello world');

	beforeEach(() => {
		helpers = {
			assertBinaryData: jest.fn(),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(bytes),
			getBinaryMetadata: jest.fn(),
		};
		context = {
			helpers,
			getNode: () => ({ name: 'Axelor' }),
		} as unknown as IExecuteFunctions;
	});

	test('returns the buffer and metadata in memory mode', async () => {
		helpers.assertBinaryData.mockReturnValue({
			data: bytes.toString('base64'),
			fileName: 'memo.txt',
			mimeType: 'text/plain',
		});

		const result = await getItemBinaryData.call(context, 'data', 0);

		expect(helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		expect(helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		expect(helpers.getBinaryMetadata).not.toHaveBeenCalled();
		expect(result).toEqual({
			contentLength: bytes.length,
			fileContent: bytes,
			originalFilename: 'memo.txt',
			mimeType: 'text/plain',
		});
	});

	test('returns a buffer in filesystem mode, where the item only carries an id', async () => {
		helpers.assertBinaryData.mockReturnValue({
			id: 'filesystem-v2:workflows/1/executions/2/binary_data/abc',
			fileName: 'documents.zip',
			mimeType: 'application/zip',
		});
		helpers.getBinaryMetadata.mockResolvedValue({
			fileSize: 279000,
			fileName: 'documents-2026-11-04.zip',
			mimeType: 'application/zip',
		});

		const result = await getItemBinaryData.call(context, 'data', 3);

		expect(helpers.getBinaryDataBuffer).toHaveBeenCalledWith(3, 'data');
		expect(Buffer.isBuffer(result.fileContent)).toBe(true);
		expect(result).toEqual({
			contentLength: 279000,
			fileContent: bytes,
			originalFilename: 'documents-2026-11-04.zip',
			mimeType: 'application/zip',
		});
	});

	test('throws when the input field name is empty', async () => {
		await expect(getItemBinaryData.call(context, '', 0)).rejects.toThrow(
			'The name of the input field containing the binary file data must be set',
		);
	});
});
