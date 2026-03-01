import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookSystem } from '$lib/server/plugins/hooks.js';

// Always test HookSystem instances, never the global `hooks` singleton,
// to avoid state bleed between tests.

describe('HookSystem — actions', () => {
	let hs: HookSystem;

	beforeEach(() => {
		hs = new HookSystem();
	});

	it('does nothing for an unregistered action tag', async () => {
		// Should resolve without error
		await expect(hs.doAction('unknown_tag')).resolves.toBeUndefined();
	});

	it('calls a registered action callback', async () => {
		const callback = vi.fn();
		hs.addAction('save_post', callback);
		await hs.doAction('save_post');
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('passes arguments to the action callback', async () => {
		const callback = vi.fn();
		hs.addAction('save_post', callback);
		await hs.doAction('save_post', { id: 1, title: 'Test' });
		expect(callback).toHaveBeenCalledWith({ id: 1, title: 'Test' });
	});

	it('calls multiple callbacks registered to the same tag', async () => {
		const cb1 = vi.fn();
		const cb2 = vi.fn();
		hs.addAction('save_post', cb1);
		hs.addAction('save_post', cb2);
		await hs.doAction('save_post');
		expect(cb1).toHaveBeenCalledTimes(1);
		expect(cb2).toHaveBeenCalledTimes(1);
	});

	it('runs callbacks in priority order (lower number first)', async () => {
		const order: number[] = [];
		hs.addAction('save_post', () => { order.push(20); }, 20);
		hs.addAction('save_post', () => { order.push(5); }, 5);
		hs.addAction('save_post', () => { order.push(10); }, 10);
		await hs.doAction('save_post');
		expect(order).toEqual([5, 10, 20]);
	});

	it('uses priority 10 as the default', async () => {
		const order: number[] = [];
		hs.addAction('event', () => { order.push(10); });      // default = 10
		hs.addAction('event', () => { order.push(1); }, 1);
		await hs.doAction('event');
		expect(order).toEqual([1, 10]);
	});

	it('awaits async callbacks before proceeding to the next', async () => {
		const log: string[] = [];
		hs.addAction('async_event', async () => {
			await new Promise<void>((r) => setTimeout(r, 10));
			log.push('first');
		}, 1);
		hs.addAction('async_event', () => { log.push('second'); }, 2);
		await hs.doAction('async_event');
		expect(log).toEqual(['first', 'second']);
	});

	it('does not call callbacks registered to a different tag', async () => {
		const callback = vi.fn();
		hs.addAction('tag_a', callback);
		await hs.doAction('tag_b');
		expect(callback).not.toHaveBeenCalled();
	});

	describe('hasAction()', () => {
		it('returns false for a tag with no registered actions', () => {
			expect(hs.hasAction('nonexistent')).toBe(false);
		});

		it('returns true after an action is registered', () => {
			hs.addAction('save_post', vi.fn());
			expect(hs.hasAction('save_post')).toBe(true);
		});

		it('returns false after the only action is removed', () => {
			const cb = vi.fn();
			hs.addAction('save_post', cb);
			hs.removeAction('save_post', cb);
			expect(hs.hasAction('save_post')).toBe(false);
		});
	});

	describe('removeAction()', () => {
		it('removes only the specified callback, leaving others intact', async () => {
			const cb1 = vi.fn();
			const cb2 = vi.fn();
			hs.addAction('save_post', cb1);
			hs.addAction('save_post', cb2);
			hs.removeAction('save_post', cb1);
			await hs.doAction('save_post');
			expect(cb1).not.toHaveBeenCalled();
			expect(cb2).toHaveBeenCalledTimes(1);
		});

		it('is a no-op for an unregistered tag', () => {
			expect(() => hs.removeAction('nonexistent', vi.fn())).not.toThrow();
		});
	});
});

// ─── filters ─────────────────────────────────────────────────────────────────

describe('HookSystem — filters', () => {
	let hs: HookSystem;

	beforeEach(() => {
		hs = new HookSystem();
	});

	it('returns the original value when no filters are registered', async () => {
		const result = await hs.applyFilters('the_content', 'Hello World');
		expect(result).toBe('Hello World');
	});

	it('applies a single filter transformation', async () => {
		hs.addFilter('the_content', (content) => `<p>${content}</p>`);
		const result = await hs.applyFilters('the_content', 'Hello');
		expect(result).toBe('<p>Hello</p>');
	});

	it('chains multiple filters in registration order', async () => {
		hs.addFilter('the_content', (c) => `${c} World`, 5);
		hs.addFilter('the_content', (c) => `<p>${c}</p>`, 10);
		const result = await hs.applyFilters('the_content', 'Hello');
		expect(result).toBe('<p>Hello World</p>');
	});

	it('applies filters in priority order (lower number first)', async () => {
		const log: string[] = [];
		hs.addFilter('transform', (v) => { log.push('priority-20'); return v; }, 20);
		hs.addFilter('transform', (v) => { log.push('priority-5'); return v; }, 5);
		await hs.applyFilters('transform', 'value');
		expect(log).toEqual(['priority-5', 'priority-20']);
	});

	it('passes extra arguments to the filter callback', async () => {
		const callback = vi.fn((content) => content);
		hs.addFilter('the_content', callback);
		await hs.applyFilters('the_content', 'Hello', { postId: 42 });
		expect(callback).toHaveBeenCalledWith('Hello', { postId: 42 });
	});

	it('awaits async filter callbacks before chaining to the next', async () => {
		hs.addFilter('async_filter', async (v) => {
			await new Promise<void>((r) => setTimeout(r, 10));
			return `${v}-async`;
		}, 1);
		hs.addFilter('async_filter', (v) => `${v}-sync`, 2);
		const result = await hs.applyFilters('async_filter', 'start');
		expect(result).toBe('start-async-sync');
	});

	it('works correctly with numeric values', async () => {
		hs.addFilter('multiply', (v) => (v as number) * 2);
		const result = await hs.applyFilters('multiply', 5);
		expect(result).toBe(10);
	});

	it('does not apply filters registered to a different tag', async () => {
		hs.addFilter('tag_a', () => 'mutated');
		const result = await hs.applyFilters('tag_b', 'original');
		expect(result).toBe('original');
	});

	describe('hasFilter()', () => {
		it('returns false for a tag with no registered filters', () => {
			expect(hs.hasFilter('the_content')).toBe(false);
		});

		it('returns true after a filter is registered', () => {
			hs.addFilter('the_content', (v) => v);
			expect(hs.hasFilter('the_content')).toBe(true);
		});

		it('returns false after the only filter is removed', () => {
			const cb = (v: unknown) => v;
			hs.addFilter('the_content', cb);
			hs.removeFilter('the_content', cb);
			expect(hs.hasFilter('the_content')).toBe(false);
		});
	});

	describe('removeFilter()', () => {
		it('removes only the specified callback, leaving others intact', async () => {
			const keep = (v: unknown) => `${v}-kept`;
			const remove = (v: unknown) => `${v}-removed`;
			hs.addFilter('the_content', keep, 1);
			hs.addFilter('the_content', remove, 2);
			hs.removeFilter('the_content', remove);
			const result = await hs.applyFilters('the_content', 'start');
			expect(result).toBe('start-kept');
		});

		it('is a no-op for an unregistered tag', () => {
			expect(() => hs.removeFilter('nonexistent', vi.fn())).not.toThrow();
		});
	});
});
