import { describe, expect, it } from 'vitest';
import { computeDigitDistribution, extractLastDigit, analyzePattern } from './digitsEngine.js';

describe('digitsEngine', () => {
  it('extracts last digit from quote', () => {
    expect(extractLastDigit(123.456, 2)).toBe(6);
    expect(extractLastDigit(780.93, 2)).toBe(3);
  });

  it('computes distribution summing to 100%', () => {
    const dist = computeDigitDistribution([1.10, 2.20, 3.30, 4.40]);
    const total = dist.reduce((s, d) => s + d.pct, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('analyzes O1U8 pattern', () => {
    const dist = Array.from({ length: 10 }, (_, digit) => ({
      digit,
      count: digit <= 1 ? 50 : 0,
      pct: digit <= 1 ? 50 : 0,
    }));
    const result = analyzePattern(dist, 'O1U8');
    expect(result).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
  });
});
