import { INodeProperties, ICredentialType, IAuthenticateGeneric, Icon } from 'n8n-workflow';

export class AxelorApi implements ICredentialType {
	name = 'axelorApi';
	displayName = 'Axelor API';
	documentationUrl = 'http://example.com/docs/auth';
	icon: Icon = 'file:axelor.svg';
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://localhost:8080',
			placeholder: 'http://example.com',
			required: true,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}
