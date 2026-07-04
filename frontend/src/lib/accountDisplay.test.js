import { describe, expect, it } from 'vitest';
import {
  getAccountMode,
  getAccountTypeLabel,
  isDemoAccount,
} from './accountDisplay.js';

describe('isDemoAccount', () => {
  it('detects account_type demo (DOT accounts)', () => {
    expect(isDemoAccount({ accountType: 'demo', loginid: 'DOT93645570' })).toBe(true);
  });

  it('detects isVirtual legacy accounts', () => {
    expect(isDemoAccount({ isVirtual: true, loginid: 'VRTC123' })).toBe(true);
  });

  it('detects real accounts', () => {
    expect(isDemoAccount({ accountType: 'real', loginid: 'CR799393' })).toBe(false);
  });
});

describe('getAccountMode', () => {
  it('returns Practice for demo DOT', () => {
    const mode = getAccountMode({ accountType: 'demo', loginid: 'DOT93645570' }, 'DOT93645570');
    expect(mode.mode).toBe('demo');
    expect(mode.label).toBe('Practice');
    expect(mode.shortLabel).toBe('Demo');
  });

  it('returns Live for real', () => {
    const mode = getAccountMode({ accountType: 'real', isVirtual: false, loginid: 'CR123' }, 'CR123');
    expect(mode.mode).toBe('real');
    expect(mode.shortLabel).toBe('Real');
  });
});

describe('getAccountTypeLabel', () => {
  it('returns Demo for virtual', () => {
    expect(getAccountTypeLabel({ isVirtual: true, accountType: 'demo' })).toBe('Demo');
  });
});
