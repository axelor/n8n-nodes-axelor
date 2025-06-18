/**
 * Custom implementation of lodash functions to remove the dependency
 */

/**
 * Checks if two values are deeply equal
 */
export function isEqual(value: any, other: any): boolean {
	// Handle simple cases
	if (value === other) return true;
	if (value == null || other == null) return value === other;
	if (typeof value !== typeof other) return false;

	// Handle arrays
	if (Array.isArray(value) && Array.isArray(other)) {
		if (value.length !== other.length) return false;
		for (let i = 0; i < value.length; i++) {
			if (!isEqual(value[i], other[i])) return false;
		}
		return true;
	}

	// Handle objects
	if (typeof value === 'object') {
		const valueKeys = Object.keys(value);
		const otherKeys = Object.keys(other);

		if (valueKeys.length !== otherKeys.length) return false;

		for (const key of valueKeys) {
			if (!Object.prototype.hasOwnProperty.call(other, key) || !isEqual(value[key], other[key])) {
				return false;
			}
		}
		return true;
	}

	return false;
}

/**
 * Gets the value at path of object
 */
export function get(object: any, path: string | string[], defaultValue?: any): any {
	if (object == null) return defaultValue;

	const keys = Array.isArray(path) ? path : path.split('.');
	let result = object;

	for (const key of keys) {
		if (result == null || typeof result !== 'object') {
			return defaultValue;
		}
		result = result[key];
	}

	return result === undefined ? defaultValue : result;
}

/**
 * Sets the value at path of object
 */
export function set(object: any, path: string | string[], value: any): any {
	if (object == null) return object;

	const keys = Array.isArray(path) ? path : path.split('.');
	const lastKey = keys.pop()!;
	let current = object;

	for (const key of keys) {
		if (current[key] == null) {
			current[key] = /^\d+$/.test(keys[keys.indexOf(key) + 1] || '') ? [] : {};
		}
		current = current[key];
	}

	current[lastKey] = value;
	return object;
}

/**
 * Converts an array of key-value pairs to an object
 */
export function fromPairs(pairs: Array<[string, any]>): Record<string, any> {
	const result: Record<string, any> = {};

	for (const [key, value] of pairs) {
		result[key] = value;
	}

	return result;
}

/**
 * Joins array elements with the separator
 */
export function join(array: any[], separator: string = ','): string {
	if (!Array.isArray(array)) return '';
	return array.join(separator);
}

/**
 * Converts string to start case
 */
export function startCase(string: string): string {
	if (!string) return '';

	return string
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/[_-]+/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
		.trim();
}

/**
 * Custom isEmpty implementation
 */

export const isEmpty = (value: any): boolean => {
	if (value == null) return true;
	if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return false;
};

export const toLower = (str: string): string => str?.toLowerCase() || '';

export const isNull = (value: any): boolean => value === null;
