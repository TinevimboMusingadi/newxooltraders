import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isDemoAccount, mapAccount } from './mapAccount.js';

describe('mapAccount', () => {
  it('maps DOT demo account correctly', () => {
    const a = mapAccount({ account_id: 'DOT93645570', loginid: 'DOT93645570', account_type: 'demo', currency: 'USD' });
    assert.equal(a.isVirtual, true);
    assert.equal(a.accountType, 'demo');
  });

  it('maps real account correctly', () => {
    const a = mapAccount({ account_id: 'CR123', loginid: 'CR123', account_type: 'real', currency: 'USD' });
    assert.equal(a.isVirtual, false);
    assert.equal(a.accountType, 'real');
  });
});

describe('isDemoAccount raw', () => {
  it('uses account_type', () => {
    assert.equal(isDemoAccount({ account_type: 'demo' }), true);
  });
});
