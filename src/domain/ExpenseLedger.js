/**
 * ExpenseLedger - State Manager & Split Math Engine for FairSplit Groups.
 */
export const SPLIT_MODES = {
  EQUAL: 'equal',
  EXACT: 'exact',
  PERCENT: 'percent',
  SHARES: 'shares',
};

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export const CATEGORIES = [
  { id: 'dining', name: 'Dining', icon: '🍽️' },
  { id: 'drinks', name: 'Drinks', icon: '🍻' },
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
  { id: 'housing', name: 'Hotel / Airbnb', icon: '🏨' },
  { id: 'transport', name: 'Transport / Uber', icon: '🚕' },
  { id: 'tickets', name: 'Tickets / Events', icon: '🎟️' },
  { id: 'general', name: 'General', icon: '📦' },
];

export const AVATAR_COLORS = [
  '#0a84ff', // Blue
  '#30d158', // Green
  '#ff9f0a', // Orange
  '#ff375f', // Pink
  '#bf5af2', // Purple
  '#64d2ff', // Teal
  '#ffd60a', // Yellow
  '#5e5ce6', // Indigo
];

export class ExpenseLedger {
  constructor({ storageManager, eventBus } = {}) {
    this.storage = storageManager;
    this.bus = eventBus;
    this.state = this._loadInitialState();
  }

  _loadInitialState() {
    const defaults = {
      activeGroupId: 'group-tahoe',
      currency: 'USD',
      groups: [
        {
          id: 'group-tahoe',
          name: 'Tahoe Weekend Cabin',
          createdAt: new Date().toISOString(),
          currency: 'USD',
          members: [
            { id: 'm-1', name: 'Keerthan', color: '#0a84ff' },
            { id: 'm-2', name: 'Alex', color: '#30d158' },
            { id: 'm-3', name: 'Sarah', color: '#bf5af2' },
            { id: 'm-4', name: 'David', color: '#ff9f0a' },
          ],
          expenses: [
            {
              id: 'exp-1',
              title: 'Cabin Airbnb Booking',
              amount: 520.0,
              paidBy: 'm-1', // Keerthan
              category: 'housing',
              date: new Date(Date.now() - 86400000 * 2).toISOString(),
              splitMode: 'equal',
              splits: { 'm-1': 130.0, 'm-2': 130.0, 'm-3': 130.0, 'm-4': 130.0 },
            },
            {
              id: 'exp-2',
              title: 'Whole Foods Grocery Run',
              amount: 144.5,
              paidBy: 'm-2', // Alex
              category: 'groceries',
              date: new Date(Date.now() - 86400000).toISOString(),
              splitMode: 'equal',
              splits: { 'm-1': 36.13, 'm-2': 36.13, 'm-3': 36.12, 'm-4': 36.12 },
            },
            {
              id: 'exp-3',
              title: 'Dinner at Basecamp Pizza',
              amount: 98.0,
              paidBy: 'm-3', // Sarah
              category: 'dining',
              date: new Date().toISOString(),
              splitMode: 'equal',
              splits: { 'm-1': 24.5, 'm-2': 24.5, 'm-3': 24.5, 'm-4': 24.5 },
            },
          ],
          settlements: [],
        },
      ],
    };

    if (this.storage) {
      const loaded = this.storage.load();
      if (loaded && Array.isArray(loaded.groups) && loaded.groups.length > 0) {
        return loaded;
      }
      this.storage.save(defaults);
      return defaults;
    }
    return defaults;
  }

  save() {
    if (this.storage) {
      this.storage.save(this.state);
    }
    if (this.bus) {
      this.bus.emit('ledger:updated', this.getActiveGroup());
    }
  }

  getActiveGroup() {
    if (!this.state || !Array.isArray(this.state.groups) || this.state.groups.length === 0) {
      this.state = this._loadInitialState();
    }
    const group = this.state.groups.find((g) => g.id === this.state.activeGroupId);
    return group || this.state.groups[0];
  }

  setActiveGroup(groupId) {
    if (this.state.groups.some((g) => g.id === groupId)) {
      this.state.activeGroupId = groupId;
      this.save();
    }
  }

  getCurrencySymbol() {
    const group = this.getActiveGroup();
    const curr = CURRENCIES.find((c) => c.code === (group.currency || this.state.currency));
    return curr ? curr.symbol : '$';
  }

  setCurrency(currencyCode) {
    const group = this.getActiveGroup();
    group.currency = currencyCode;
    this.state.currency = currencyCode;
    this.save();
  }

  createGroup(name, currency = 'USD', initialMembers = []) {
    const newGroup = {
      id: `group-${Date.now()}`,
      name: name.trim() || 'New Expense Group',
      createdAt: new Date().toISOString(),
      currency,
      members: initialMembers.length > 0 ? initialMembers : [
        { id: `m-${Date.now()}-1`, name: 'You', color: AVATAR_COLORS[0] },
        { id: `m-${Date.now()}-2`, name: 'Friend 1', color: AVATAR_COLORS[1] },
      ],
      expenses: [],
      settlements: [],
    };

    this.state.groups.push(newGroup);
    this.state.activeGroupId = newGroup.id;
    this.save();
    return newGroup;
  }

  addMember(name) {
    const group = this.getActiveGroup();
    const cleanName = name.trim();
    if (!cleanName) return null;

    const usedColors = new Set(group.members.map((m) => m.color));
    const availableColor = AVATAR_COLORS.find((c) => !usedColors.has(c)) || AVATAR_COLORS[group.members.length % AVATAR_COLORS.length];

    const newMember = {
      id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      color: availableColor,
    };

    group.members.push(newMember);
    this.save();
    return newMember;
  }

  removeMember(memberId) {
    const group = this.getActiveGroup();
    // Prevent removing if member has expenses or owes/is owed
    const hasExpense = group.expenses.some(
      (e) => e.paidBy === memberId || (e.splits && e.splits[memberId] > 0)
    );
    if (hasExpense) {
      throw new Error('Cannot delete a member with recorded expenses. Settle or delete expenses first.');
    }

    group.members = group.members.filter((m) => m.id !== memberId);
    this.save();
  }

  calculateSplit(totalAmount, participantIds = [], splitMode = SPLIT_MODES.EQUAL, customInputs = {}) {
    const count = participantIds.length;
    if (count === 0 || totalAmount <= 0) return {};

    const splits = {};

    if (splitMode === SPLIT_MODES.EQUAL) {
      const baseCents = Math.floor((totalAmount * 100) / count);
      let remainderCents = Math.round(totalAmount * 100) - baseCents * count;

      for (const id of participantIds) {
        let cents = baseCents;
        if (remainderCents > 0) {
          cents += 1;
          remainderCents -= 1;
        }
        splits[id] = cents / 100;
      }
    } else if (splitMode === SPLIT_MODES.EXACT) {
      for (const id of participantIds) {
        splits[id] = Number(customInputs[id]) || 0;
      }
    } else if (splitMode === SPLIT_MODES.PERCENT) {
      for (const id of participantIds) {
        const pct = Number(customInputs[id]) || 0;
        splits[id] = Math.round(totalAmount * (pct / 100) * 100) / 100;
      }
    } else if (splitMode === SPLIT_MODES.SHARES) {
      let totalShares = 0;
      for (const id of participantIds) {
        totalShares += Number(customInputs[id]) || 1;
      }
      for (const id of participantIds) {
        const share = Number(customInputs[id]) || 1;
        splits[id] = Math.round((totalAmount * (share / totalShares)) * 100) / 100;
      }
    }

    return splits;
  }

  addExpense({ title, amount, paidBy, category = 'general', participantIds = [], splitMode = SPLIT_MODES.EQUAL, customInputs = {}, date }) {
    const group = this.getActiveGroup();
    const numAmount = Math.round(Number(amount) * 100) / 100;

    if (!title || numAmount <= 0) {
      throw new Error('Expense requires a valid title and amount greater than 0.');
    }

    const participants = participantIds.length > 0 ? participantIds : group.members.map((m) => m.id);
    const splits = this.calculateSplit(numAmount, participants, splitMode, customInputs);

    const newExpense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      amount: numAmount,
      paidBy,
      category,
      date: date || new Date().toISOString(),
      splitMode,
      splits,
    };

    group.expenses.unshift(newExpense);
    this.save();
    return newExpense;
  }

  deleteExpense(expenseId) {
    const group = this.getActiveGroup();
    group.expenses = group.expenses.filter((e) => e.id !== expenseId);
    this.save();
  }

  recordSettlement({ from, to, amount, note = 'Settlement Payment' }) {
    const group = this.getActiveGroup();
    const numAmount = Math.round(Number(amount) * 100) / 100;
    if (numAmount <= 0) return null;

    const settlement = {
      id: `set-${Date.now()}`,
      from,
      to,
      amount: numAmount,
      date: new Date().toISOString(),
      note,
    };

    group.settlements.unshift(settlement);
    this.save();
    return settlement;
  }

  deleteSettlement(settlementId) {
    const group = this.getActiveGroup();
    group.settlements = group.settlements.filter((s) => s.id !== settlementId);
    this.save();
  }

  getTotalSpend() {
    const group = this.getActiveGroup();
    return group.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }
}
