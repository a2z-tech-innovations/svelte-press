export function match(value: string): boolean {
	return /^\d{4}$/.test(value);
}
