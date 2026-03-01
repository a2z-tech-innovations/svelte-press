import { describe, it, expect } from 'vitest';
import { match as matchYear } from '../../src/params/year.js';
import { match as matchMonth } from '../../src/params/month.js';
import { match as matchDay } from '../../src/params/day.js';

// ─── year matcher (/^\d{4}$/) ────────────────────────────────────────────────

describe('year param matcher', () => {
	it('accepts a standard 4-digit year', () => {
		expect(matchYear('2026')).toBe(true);
	});

	it('accepts year 1900', () => {
		expect(matchYear('1900')).toBe(true);
	});

	it('accepts year 0000', () => {
		expect(matchYear('0000')).toBe(true);
	});

	it('accepts year 9999', () => {
		expect(matchYear('9999')).toBe(true);
	});

	it('rejects a 3-digit number', () => {
		expect(matchYear('999')).toBe(false);
	});

	it('rejects a 5-digit number', () => {
		expect(matchYear('20266')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(matchYear('')).toBe(false);
	});

	it('rejects alphabetic characters', () => {
		expect(matchYear('abcd')).toBe(false);
	});

	it('rejects a year with a leading slash', () => {
		expect(matchYear('/2026')).toBe(false);
	});

	it('rejects a year with a hyphen', () => {
		expect(matchYear('2026-01')).toBe(false);
	});

	it('rejects a float', () => {
		expect(matchYear('20.26')).toBe(false);
	});
});

// ─── month matcher (/^(0?[1-9]|1[0-2])$/) ───────────────────────────────────

describe('month param matcher', () => {
	it('accepts single-digit months without leading zero (1–9)', () => {
		for (let m = 1; m <= 9; m++) {
			expect(matchMonth(String(m))).toBe(true);
		}
	});

	it('accepts single-digit months with leading zero (01–09)', () => {
		for (let m = 1; m <= 9; m++) {
			expect(matchMonth(String(m).padStart(2, '0'))).toBe(true);
		}
	});

	it('accepts two-digit months (10, 11, 12)', () => {
		expect(matchMonth('10')).toBe(true);
		expect(matchMonth('11')).toBe(true);
		expect(matchMonth('12')).toBe(true);
	});

	it('rejects 0 (month cannot be zero)', () => {
		expect(matchMonth('0')).toBe(false);
	});

	it('rejects 00', () => {
		expect(matchMonth('00')).toBe(false);
	});

	it('rejects 13 (out of range)', () => {
		expect(matchMonth('13')).toBe(false);
	});

	it('rejects alphabetic values', () => {
		expect(matchMonth('jan')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(matchMonth('')).toBe(false);
	});

	it('rejects 3-digit values', () => {
		expect(matchMonth('012')).toBe(false);
	});
});

// ─── day matcher (/^(0?[1-9]|[12]\d|3[01])$/) ──────────────────────────────

describe('day param matcher', () => {
	it('accepts single-digit days without leading zero (1–9)', () => {
		for (let d = 1; d <= 9; d++) {
			expect(matchDay(String(d))).toBe(true);
		}
	});

	it('accepts single-digit days with leading zero (01–09)', () => {
		for (let d = 1; d <= 9; d++) {
			expect(matchDay(String(d).padStart(2, '0'))).toBe(true);
		}
	});

	it('accepts days in the 10–19 range', () => {
		for (let d = 10; d <= 19; d++) {
			expect(matchDay(String(d))).toBe(true);
		}
	});

	it('accepts days in the 20–29 range', () => {
		for (let d = 20; d <= 29; d++) {
			expect(matchDay(String(d))).toBe(true);
		}
	});

	it('accepts 30 and 31', () => {
		expect(matchDay('30')).toBe(true);
		expect(matchDay('31')).toBe(true);
	});

	it('rejects 0 (day cannot be zero)', () => {
		expect(matchDay('0')).toBe(false);
	});

	it('rejects 00', () => {
		expect(matchDay('00')).toBe(false);
	});

	it('rejects 32 (out of range)', () => {
		expect(matchDay('32')).toBe(false);
	});

	it('rejects 99', () => {
		expect(matchDay('99')).toBe(false);
	});

	it('rejects alphabetic values', () => {
		expect(matchDay('abc')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(matchDay('')).toBe(false);
	});

	it('rejects 3-digit values', () => {
		expect(matchDay('015')).toBe(false);
	});
});
