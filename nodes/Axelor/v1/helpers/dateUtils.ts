/**
 * Utility functions for date handling without moment-timezone dependency
 */

export function toUTCISOStringFromTZ(localDateTime: string, timeZone: string): string {
	const [datePart, timePart] = localDateTime.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hour, minute, second] = timePart.split(':').map(Number);

	const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

	const offsetMinutes = getTimeZoneOffsetMinutes(utcDate, timeZone);

	const correctedUTC = new Date(utcDate.getTime() - offsetMinutes * 60000);

	return correctedUTC.toISOString();
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
	const locale = 'en-US';
	const dtf = new Intl.DateTimeFormat(locale, {
		timeZone,
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
	const parts = dtf.formatToParts(date);
	const map: Record<string, string> = {};
	parts.forEach(({ type, value }) => {
		if (type !== 'literal') map[type] = value;
	});

	const localTime = Date.UTC(
		parseInt(map.year),
		parseInt(map.month) - 1,
		parseInt(map.day),
		parseInt(map.hour),
		parseInt(map.minute),
		parseInt(map.second),
	);

	return (localTime - date.getTime()) / 60000;
}
