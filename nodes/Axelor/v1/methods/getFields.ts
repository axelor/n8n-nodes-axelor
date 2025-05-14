import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

export async function getFields(this: IExecuteFunctions, model: string): Promise<string[]> {
	const { baseUrl, username, password } = (await this.getCredentials('axelorApi')) as {
		baseUrl: string;
		username: string;
		password: string;
	};

	if (!this.helpers.request) {
		throw new Error('Request helper not available');
	}

	try {
		const respFields = await this.helpers.request!({
			method: 'GET',
			url: `/ws/meta/fields/${encodeURIComponent(model)}`,
			baseURL: baseUrl,
			auth: { user: username as string, pass: password as string },
			json: true,
		});
		const infos: Array<{ name: string }> = respFields.data?.fields || [];
		return infos.map((f) => f.name);
	} catch (error) {
		throw new NodeOperationError(this.getNode(), 'Failed to fetch models', error);
	}
}
