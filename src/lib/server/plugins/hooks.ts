type HookCallback = (...args: unknown[]) => unknown | Promise<unknown>;

interface HookEntry {
	callback: HookCallback;
	priority: number;
}

class HookSystem {
	private actions = new Map<string, HookEntry[]>();
	private filters = new Map<string, HookEntry[]>();

	addAction(tag: string, callback: HookCallback, priority = 10): void {
		if (!this.actions.has(tag)) this.actions.set(tag, []);
		const entries = this.actions.get(tag)!;
		entries.push({ callback, priority });
		entries.sort((a, b) => a.priority - b.priority);
	}

	async doAction(tag: string, ...args: unknown[]): Promise<void> {
		const entries = this.actions.get(tag) ?? [];
		for (const entry of entries) {
			await entry.callback(...args);
		}
	}

	addFilter(tag: string, callback: HookCallback, priority = 10): void {
		if (!this.filters.has(tag)) this.filters.set(tag, []);
		const entries = this.filters.get(tag)!;
		entries.push({ callback, priority });
		entries.sort((a, b) => a.priority - b.priority);
	}

	async applyFilters<T>(tag: string, value: T, ...args: unknown[]): Promise<T> {
		const entries = this.filters.get(tag) ?? [];
		let current: unknown = value;
		for (const entry of entries) {
			current = await entry.callback(current, ...args);
		}
		return current as T;
	}

	hasAction(tag: string): boolean {
		return (this.actions.get(tag)?.length ?? 0) > 0;
	}

	hasFilter(tag: string): boolean {
		return (this.filters.get(tag)?.length ?? 0) > 0;
	}

	removeAction(tag: string, callback: HookCallback): void {
		const entries = this.actions.get(tag);
		if (entries) {
			this.actions.set(
				tag,
				entries.filter((e) => e.callback !== callback)
			);
		}
	}

	removeFilter(tag: string, callback: HookCallback): void {
		const entries = this.filters.get(tag);
		if (entries) {
			this.filters.set(
				tag,
				entries.filter((e) => e.callback !== callback)
			);
		}
	}
}

export { HookSystem };

// Global singleton — shared across all server requests
export const hooks = new HookSystem();
