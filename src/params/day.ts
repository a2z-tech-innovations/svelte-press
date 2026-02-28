export function match(value: string): boolean {
	// Accept 1-31, with or without leading zero
	return /^(0?[1-9]|[12]\d|3[01])$/.test(value);
}
