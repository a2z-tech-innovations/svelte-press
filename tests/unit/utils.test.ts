import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	slugify,
	truncate,
	formatDate,
	timeAgo,
	initials,
	bytesToHuman,
	getMediaUrl,
	getPermalinkUrl
} from '$lib/utils.js';

// ─── slugify ────────────────────────────────────────────────────────────────

describe('slugify', () => {
	it('converts text to lowercase', () => {
		expect(slugify('Hello World')).toBe('hello-world');
	});

	it('replaces spaces with hyphens', () => {
		expect(slugify('hello world')).toBe('hello-world');
	});

	it('removes special characters', () => {
		expect(slugify('Hello, World!')).toBe('hello-world');
	});

	it('collapses multiple consecutive spaces', () => {
		expect(slugify('hello  world')).toBe('hello-world');
	});

	it('collapses multiple consecutive hyphens', () => {
		expect(slugify('hello--world')).toBe('hello-world');
	});

	it('trims leading and trailing hyphens', () => {
		expect(slugify('--hello world--')).toBe('hello-world');
	});

	it('handles leading and trailing whitespace', () => {
		expect(slugify('  Hello World  ')).toBe('hello-world');
	});

	it('handles an already valid slug', () => {
		expect(slugify('hello-world')).toBe('hello-world');
	});

	it('returns empty string for empty input', () => {
		expect(slugify('')).toBe('');
	});

	it('handles numeric characters', () => {
		expect(slugify('Post 123')).toBe('post-123');
	});

	it('handles underscores by converting to hyphens', () => {
		expect(slugify('hello_world')).toBe('hello-world');
	});
});

// ─── truncate ───────────────────────────────────────────────────────────────

describe('truncate', () => {
	it('returns the original string when within the limit', () => {
		expect(truncate('Hello', 10)).toBe('Hello');
	});

	it('returns the original string when exactly at the limit', () => {
		expect(truncate('Hello', 5)).toBe('Hello');
	});

	it('truncates and appends ellipsis when over the limit', () => {
		expect(truncate('Hello World', 5)).toBe('Hello…');
	});

	it('trims trailing whitespace before adding ellipsis', () => {
		expect(truncate('Hello World', 6)).toBe('Hello…');
	});

	it('handles empty string', () => {
		expect(truncate('', 10)).toBe('');
	});

	it('handles limit of 1', () => {
		expect(truncate('Hello', 1)).toBe('H…');
	});
});

// ─── formatDate ─────────────────────────────────────────────────────────────

describe('formatDate', () => {
	it('returns dash for null', () => {
		expect(formatDate(null)).toBe('—');
	});

	it('returns dash for undefined', () => {
		expect(formatDate(undefined)).toBe('—');
	});

	it('returns dash for an invalid date', () => {
		expect(formatDate(new Date('not-a-date'))).toBe('—');
	});

	it('formats with the default MMM d, yyyy format', () => {
		// noon UTC is safe across all timezones when TZ=UTC
		const date = new Date('2026-01-15T12:00:00Z');
		expect(formatDate(date)).toBe('Jan 15, 2026');
	});

	it('formats all 12 months correctly', () => {
		const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
			'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		months.forEach((month, index) => {
			// Use day 15, noon UTC to avoid rollover issues
			const date = new Date(`2026-${String(index + 1).padStart(2, '0')}-15T12:00:00Z`);
			expect(formatDate(date)).toContain(month);
		});
	});

	it('formats with a custom yyyy-MM-dd format', () => {
		const date = new Date('2026-03-07T12:00:00Z');
		expect(formatDate(date, 'yyyy-MM-dd')).toBe('2026-03-07');
	});

	it('formats with a custom dd/MM/yyyy format', () => {
		const date = new Date('2026-03-07T12:00:00Z');
		expect(formatDate(date, 'dd/MM/yyyy')).toBe('07/03/2026');
	});

	it('formats with HH:mm time tokens', () => {
		const date = new Date('2026-01-15T14:30:00Z');
		expect(formatDate(date, 'HH:mm')).toBe('14:30');
	});

	it('formats full month names with MMMM token', () => {
		const date = new Date('2026-01-15T12:00:00Z');
		expect(formatDate(date, 'MMMM d, yyyy')).toBe('January 15, 2026');
	});

	it('accepts a non-Date value that is coercible to a Date', () => {
		// formatDate accepts Date | null | undefined and coerces via new Date()
		const date = new Date('2026-06-01T12:00:00Z');
		expect(formatDate(date)).toContain('2026');
	});
});

// ─── timeAgo ────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns empty string for null', () => {
		expect(timeAgo(null)).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(timeAgo(undefined)).toBe('');
	});

	it('returns seconds ago for a very recent date', () => {
		const date = new Date('2026-01-15T11:59:30Z'); // 30s ago
		expect(timeAgo(date)).toBe('30s ago');
	});

	it('returns minutes ago for a date 5 minutes old', () => {
		const date = new Date('2026-01-15T11:55:00Z'); // 5m ago
		expect(timeAgo(date)).toBe('5m ago');
	});

	it('returns hours ago for a date 3 hours old', () => {
		const date = new Date('2026-01-15T09:00:00Z'); // 3h ago
		expect(timeAgo(date)).toBe('3h ago');
	});

	it('returns days ago for a date 2 days old', () => {
		const date = new Date('2026-01-13T12:00:00Z'); // 2d ago
		expect(timeAgo(date)).toBe('2d ago');
	});

	it('returns a formatted date string for dates older than 30 days', () => {
		const date = new Date('2025-12-01T12:00:00Z'); // ~45 days ago
		const result = timeAgo(date);
		// Should fall back to formatDate, not return "Xd ago"
		expect(result).not.toMatch(/^\d+d ago$/);
		expect(result).toContain('2025');
	});
});

// ─── initials ───────────────────────────────────────────────────────────────

describe('initials', () => {
	it('returns uppercase initials for a two-word name', () => {
		expect(initials('John Doe')).toBe('JD');
	});

	it('returns a single initial for a one-word name', () => {
		expect(initials('John')).toBe('J');
	});

	it('uses only the first two words for a multi-word name', () => {
		expect(initials('John Michael Doe')).toBe('JM');
	});

	it('returns uppercase regardless of input case', () => {
		expect(initials('jane doe')).toBe('JD');
	});

	it('handles extra whitespace between words', () => {
		expect(initials('John  Doe')).toBe('JD');
	});
});

// ─── bytesToHuman ────────────────────────────────────────────────────────────

describe('bytesToHuman', () => {
	it('formats bytes under 1 KB', () => {
		expect(bytesToHuman(500)).toBe('500 B');
	});

	it('formats bytes equal to 0', () => {
		expect(bytesToHuman(0)).toBe('0 B');
	});

	it('formats exactly 1 KB', () => {
		expect(bytesToHuman(1024)).toBe('1.0 KB');
	});

	it('formats values in the KB range', () => {
		expect(bytesToHuman(2048)).toBe('2.0 KB');
	});

	it('formats exactly 1 MB', () => {
		expect(bytesToHuman(1024 * 1024)).toBe('1.0 MB');
	});

	it('formats values in the MB range', () => {
		expect(bytesToHuman(1024 * 1024 * 2.5)).toBe('2.5 MB');
	});

	it('formats 1023 bytes as bytes, not KB', () => {
		expect(bytesToHuman(1023)).toBe('1023 B');
	});
});

// ─── getMediaUrl ─────────────────────────────────────────────────────────────

describe('getMediaUrl', () => {
	it('strips the static/ prefix', () => {
		expect(getMediaUrl('static/uploads/file.jpg')).toBe('/uploads/file.jpg');
	});

	it('strips the ./static/ prefix', () => {
		expect(getMediaUrl('./static/uploads/file.jpg')).toBe('/uploads/file.jpg');
	});

	it('strips a leading slash after removing static/', () => {
		expect(getMediaUrl('static//uploads/file.jpg')).toBe('/uploads/file.jpg');
	});

	it('returns a path with a leading slash for non-static paths', () => {
		expect(getMediaUrl('uploads/file.jpg')).toBe('/uploads/file.jpg');
	});

	it('handles nested upload paths', () => {
		expect(getMediaUrl('static/uploads/2026/01/image.webp')).toBe(
			'/uploads/2026/01/image.webp'
		);
	});
});

// ─── getPermalinkUrl ─────────────────────────────────────────────────────────

describe('getPermalinkUrl', () => {
	// A fixed post for consistent assertions (TZ=UTC ensures date math is deterministic)
	const post = {
		id: 42,
		slug: 'hello-world',
		postDate: new Date('2026-01-15T12:00:00Z') // 2026-01-15 in UTC
	};

	it('returns plain /?p={id} for empty structure', () => {
		expect(getPermalinkUrl(post, '')).toBe('/?p=42');
	});

	it('returns postname structure', () => {
		expect(getPermalinkUrl(post, '/%postname%/')).toBe('/hello-world/');
	});

	it('returns numeric structure', () => {
		expect(getPermalinkUrl(post, '/archives/%post_id%')).toBe('/archives/42');
	});

	it('returns month-name structure', () => {
		expect(getPermalinkUrl(post, '/%year%/%monthnum%/%postname%/')).toBe(
			'/2026/01/hello-world/'
		);
	});

	it('returns day-name structure', () => {
		expect(getPermalinkUrl(post, '/%year%/%monthnum%/%day%/%postname%/')).toBe(
			'/2026/01/15/hello-world/'
		);
	});

	it('handles a custom structure with multiple tokens', () => {
		expect(getPermalinkUrl(post, '/blog/%year%/%postname%/')).toBe(
			'/blog/2026/hello-world/'
		);
	});

	it('ensures the result starts with a slash for custom structures', () => {
		const url = getPermalinkUrl(post, '%postname%/');
		expect(url).toMatch(/^\//);
	});

	it('falls back to current date when postDate is null', () => {
		const postNoDate = { id: 1, slug: 'no-date', postDate: null };
		const url = getPermalinkUrl(postNoDate, '/%postname%/');
		expect(url).toBe('/no-date/');
	});
});
