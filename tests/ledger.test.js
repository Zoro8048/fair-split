import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ExpenseLedger, SPLIT_MODES } from '../src/domain/ExpenseLedger.js';

describe('ExpenseLedger - State & Split Engine', () => {
  test('calculateSplit in EQUAL mode distributes odd cents without loss', () => {
    const ledger = new ExpenseLedger();
    const participants = ['m1', 'm2', 'm3'];
    const splits = ledger.calculateSplit(10.0, participants, SPLIT_MODES.EQUAL);

    const sum = Object.values(splits).reduce((a, b) => a + b, 0);
    assert.equal(Math.round(sum * 100) / 100, 10.0);
    assert.equal(splits['m1'], 3.34);
    assert.equal(splits['m2'], 3.33);
    assert.equal(splits['m3'], 3.33);
  });

  test('calculateSplit in PERCENT mode splits according to percentages', () => {
    const ledger = new ExpenseLedger();
    const participants = ['m1', 'm2'];
    const splits = ledger.calculateSplit(150.0, participants, SPLIT_MODES.PERCENT, {
      m1: 60,
      m2: 40,
    });

    assert.equal(splits['m1'], 90.0);
    assert.equal(splits['m2'], 60.0);
  });

  test('calculateSplit in SHARES mode splits proportional to share counts', () => {
    const ledger = new ExpenseLedger();
    const participants = ['m1', 'm2'];
    const splits = ledger.calculateSplit(90.0, participants, SPLIT_MODES.SHARES, {
      m1: 2,
      m2: 1,
    });

    assert.equal(splits['m1'], 60.0);
    assert.equal(splits['m2'], 30.0);
  });

  test('calculateSplit in EXACT mode uses explicit dollar amounts', () => {
    const ledger = new ExpenseLedger();
    const participants = ['m1', 'm2'];
    const splits = ledger.calculateSplit(50.0, participants, SPLIT_MODES.EXACT, {
      m1: 32.5,
      m2: 17.5,
    });

    assert.equal(splits['m1'], 32.5);
    assert.equal(splits['m2'], 17.5);
  });

  test('addMember assigns available color and appends to active group', () => {
    const ledger = new ExpenseLedger();
    const group = ledger.getActiveGroup();
    const initialCount = group.members.length;

    const added = ledger.addMember('Elena');
    assert.equal(added.name, 'Elena');
    assert.ok(added.color);
    assert.equal(group.members.length, initialCount + 1);
  });

  test('removeMember prevents deletion if member has linked expenses', () => {
    const ledger = new ExpenseLedger();
    const group = ledger.getActiveGroup();
    const payerId = group.expenses[0].paidBy;

    assert.throws(
      () => {
        ledger.removeMember(payerId);
      },
      {
        message: /Cannot delete a member with recorded expenses/,
      }
    );
  });

  test('addExpense updates expense list and total spend', () => {
    const ledger = new ExpenseLedger();
    const initialTotal = ledger.getTotalSpend();
    const group = ledger.getActiveGroup();

    const newExp = ledger.addExpense({
      title: 'Coffee & Pastries',
      amount: 24.5,
      paidBy: group.members[0].id,
      category: 'dining',
      participantIds: [group.members[0].id, group.members[1].id],
    });

    assert.equal(newExp.title, 'Coffee & Pastries');
    assert.equal(newExp.amount, 24.5);
    assert.equal(Math.round((ledger.getTotalSpend() - initialTotal) * 100) / 100, 24.5);
  });

  test('deleteExpense removes expense and decreases total spend', () => {
    const ledger = new ExpenseLedger();
    const group = ledger.getActiveGroup();
    const firstExp = group.expenses[0];
    const initialTotal = ledger.getTotalSpend();

    ledger.deleteExpense(firstExp.id);
    assert.equal(
      Math.round((initialTotal - ledger.getTotalSpend()) * 100) / 100,
      firstExp.amount
    );
  });

  test('recordSettlement and deleteSettlement track debt repayments', () => {
    const ledger = new ExpenseLedger();
    const group = ledger.getActiveGroup();
    const from = group.members[1].id;
    const to = group.members[0].id;

    const settlement = ledger.recordSettlement({
      from,
      to,
      amount: 40.0,
      note: 'Venmo',
    });

    assert.equal(settlement.amount, 40.0);
    assert.equal(group.settlements[0].id, settlement.id);

    ledger.deleteSettlement(settlement.id);
    assert.ok(!group.settlements.some((s) => s.id === settlement.id));
  });

  test('createGroup creates new isolated group and switches activeGroupId', () => {
    const ledger = new ExpenseLedger();
    const created = ledger.createGroup('Roadtrip to Zion', 'EUR');

    assert.equal(created.name, 'Roadtrip to Zion');
    assert.equal(created.currency, 'EUR');
    assert.equal(ledger.getActiveGroup().id, created.id);
    assert.equal(ledger.getCurrencySymbol(), '€');
  });
});
