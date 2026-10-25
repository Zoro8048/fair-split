import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DebtSimplifier } from '../src/domain/DebtSimplifier.js';

describe('DebtSimplifier - Min-Cash-Flow Algorithm', () => {
  const members = ['alice', 'bob', 'charlie'];

  test('calculateNetBalances correctly credits payer and debits participants', () => {
    const expenses = [
      {
        paidBy: 'alice',
        amount: 90,
        splits: { alice: 30, bob: 30, charlie: 30 },
      },
    ];

    const balances = DebtSimplifier.calculateNetBalances(members, expenses);
    assert.equal(balances.get('alice'), 60);
    assert.equal(balances.get('bob'), -30);
    assert.equal(balances.get('charlie'), -30);
  });

  test('calculateNetBalances accounts for recorded settlements', () => {
    const expenses = [
      {
        paidBy: 'alice',
        amount: 90,
        splits: { alice: 30, bob: 30, charlie: 30 },
      },
    ];
    const settlements = [
      {
        from: 'bob',
        to: 'alice',
        amount: 30,
      },
    ];

    const balances = DebtSimplifier.calculateNetBalances(members, expenses, settlements);
    assert.equal(balances.get('alice'), 30);
    assert.equal(balances.get('bob'), 0);
    assert.equal(balances.get('charlie'), -30);
  });

  test('simplifyDebts collapses 3-person chain into a single direct transfer', () => {
    // Alice paid $60 for Alice & Bob ($30 each) -> Alice +30, Bob -30
    // Bob paid $60 for Bob & Charlie ($30 each) -> Bob +30, Charlie -30
    // Net: Alice = +30, Bob = 0, Charlie = -30.
    const balances = new Map([
      ['alice', 30],
      ['bob', 0],
      ['charlie', -30],
    ]);

    const transfers = DebtSimplifier.simplifyDebts(balances);
    assert.equal(transfers.length, 1);
    assert.equal(transfers[0].from, 'charlie');
    assert.equal(transfers[0].to, 'alice');
    assert.equal(transfers[0].amount, 30);
  });

  test('simplifyDebts returns 0 transfers when cyclic IOUs cancel out', () => {
    // If net balances are all 0
    const balances = new Map([
      ['alice', 0],
      ['bob', 0],
      ['charlie', 0],
    ]);

    const transfers = DebtSimplifier.simplifyDebts(balances);
    assert.equal(transfers.length, 0);
  });

  test('simplifyDebts handles complex 4-person graph with multiple creditors & debtors', () => {
    const balances = new Map([
      ['m1', 120],  // Creditor 1
      ['m2', 80],   // Creditor 2
      ['m3', -150], // Debtor 1
      ['m4', -50],  // Debtor 2
    ]);

    const transfers = DebtSimplifier.simplifyDebts(balances);

    // Sum of amounts transferred should equal total positive balances (200)
    const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);
    assert.equal(Math.round(totalTransferred), 200);

    // Verify after transfers, everyone is net 0
    const testBalances = new Map(balances);
    for (const t of transfers) {
      testBalances.set(t.from, testBalances.get(t.from) + t.amount);
      testBalances.set(t.to, testBalances.get(t.to) - t.amount);
    }
    for (const [id, net] of testBalances.entries()) {
      assert.ok(Math.abs(net) < 0.01, `Member ${id} should be settled to 0`);
    }
  });

  test('formatShareSummary produces human-readable settlement text', () => {
    const memberMap = new Map([
      ['a', { id: 'a', name: 'Alice' }],
      ['b', { id: 'b', name: 'Bob' }],
    ]);
    const transfers = [{ from: 'b', to: 'a', amount: 45.5 }];

    const summary = DebtSimplifier.formatShareSummary('Tahoe Trip', '$', 91.0, transfers, memberMap);
    assert.ok(summary.includes('FairSplit • Tahoe Trip'));
    assert.ok(summary.includes('$91.00'));
    assert.ok(summary.includes('Bob pays Alice: $45.50'));
  });
});
