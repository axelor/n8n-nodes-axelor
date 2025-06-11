/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/test/**/downloadFile.test.ts'],
	collectCoverage: false,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['nodes/Axelor/**/*.ts', '!**/*.d.ts'],

	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
	},
};
