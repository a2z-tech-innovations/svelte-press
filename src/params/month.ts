export function match(value: string): boolean {
	return /^(0?[1-9]|1[0-2])$/.test(value);
}
