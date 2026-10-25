import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { QrSyncEngine } from '../src/domain/QrSyncEngine.js';

describe('QrSyncEngine - Zero-Backend P2P Sync', () => {
  const sampleGroup = {
    id: 'group-hawaii',
    name: 'Hawaii Vacation',
    currency: 'USD',
    members: [
      { id: 'm-1', name: 'Keerthan', color: '#0a84ff' },
      { id: 'm-2', name: 'Maya', color: '#30d158' },
    ],
    expenses: [
      {
        id: 'exp-101',
        title: 'Snorkeling Gear Rental',
        amount: 88.0,
        paidBy: 'm-1',
        category: 'tickets',
        date: '2026-10-24T10:00:00Z',
        splits: { 'm-1': 44.0, 'm-2': 44.0 },
      },
    ],
    settlements: [
      {
        id: 'set-201',
        from: 'm-2',
        to: 'm-1',
        amount: 44.0,
        date: '2026-10-24T18:00:00Z',
      },
    ],
  };

  test('serializeGroup creates compact portable JSON with fairsplit tag', () => {
    const serialized = QrSyncEngine.serializeGroup(sampleGroup);
    assert.equal(typeof serialized, 'string');

    const parsed = JSON.parse(serialized);
    assert.equal(parsed.app, 'fairsplit');
    assert.equal(parsed.v, 1);
    assert.equal(parsed.name, 'Hawaii Vacation');
    assert.equal(parsed.members.length, 2);
    assert.equal(parsed.expenses.length, 1);
    assert.equal(parsed.settlements.length, 1);
  });

  test('deserializeGroup reconstitutes valid group state from JSON', () => {
    const serialized = QrSyncEngine.serializeGroup(sampleGroup);
    const result = QrSyncEngine.deserializeGroup(serialized);

    assert.equal(result.success, true);
    assert.ok(result.group);
    assert.equal(result.group.name, 'Hawaii Vacation');
    assert.equal(result.group.currency, 'USD');
    assert.equal(result.group.members.length, 2);
    assert.equal(result.group.members[0].name, 'Keerthan');
    assert.equal(result.group.expenses[0].title, 'Snorkeling Gear Rental');
    assert.equal(result.group.expenses[0].amount, 88.0);
    assert.equal(result.group.settlements[0].amount, 44.0);
  });

  test('deserializeGroup rejects invalid or corrupted payloads gracefully', () => {
    // Malformed JSON
    const badJson = QrSyncEngine.deserializeGroup('{ invalid json');
    assert.equal(badJson.success, false);
    assert.ok(badJson.error);

    // Missing required fields
    const missingFields = QrSyncEngine.deserializeGroup(JSON.stringify({ app: 'otherApp' }));
    assert.equal(missingFields.success, false);
  });
});
