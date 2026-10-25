/**
 * DebtSimplifier - Min-Cash-Flow Graph Algorithm for Optimal Debt Settlement.
 *
 * Given a list of transactions among N members, minimizes the total number of cash transfers
 * required to zero out all balances using a greedy max-creditor / max-debtor matching.
 */
export class DebtSimplifier {
  /**
   * Computes the net balance for each person.
   * Positive net = creditor (is owed money).
   * Negative net = debtor (owes money).
   *
   * @param {Array<string>} members - List of member IDs
   * @param {Array<Object>} expenses - List of expense records
   * @param {Array<Object>} settlements - List of already paid settlement records
   * @returns {Map<string, number>} Map of memberId -> net amount (cents precision)
   */
  static calculateNetBalances(members, expenses = [], settlements = []) {
    const balances = new Map();
    members.forEach((m) => balances.set(m, 0));

    // Process expenses
    for (const exp of expenses) {
      const payerId = exp.paidBy;
      const amount = Number(exp.amount) || 0;
      if (amount <= 0) continue;

      // Credit the payer
      balances.set(payerId, (balances.get(payerId) || 0) + amount);

      // Debit the participants
      const splits = exp.splits || {};
      for (const [memberId, owedAmount] of Object.entries(splits)) {
        const owed = Number(owedAmount) || 0;
        balances.set(memberId, (balances.get(memberId) || 0) - owed);
      }
    }

    // Process settlement payments (debtor paid creditor)
    for (const st of settlements) {
      const amount = Number(st.amount) || 0;
      if (amount <= 0) continue;

      // Payer settled debt -> their balance goes up (less in debt)
      balances.set(st.from, (balances.get(st.from) || 0) + amount);
      // Receiver got money -> their balance goes down (less owed to them)
      balances.set(st.to, (balances.get(st.to) || 0) - amount);
    }

    // Round to 2 decimal places to prevent floating point drift
    for (const [id, val] of balances.entries()) {
      balances.set(id, Math.round(val * 100) / 100);
    }

    return balances;
  }

  /**
   * Greedy Min-Cash-Flow Algorithm.
   * Collapses complex cyclic IOUs into minimal direct transactions.
   *
   * @param {Map<string, number>} balances - Map of memberId -> net amount
   * @returns {Array<{ from: string, to: string, amount: number }>}
   */
  static simplifyDebts(balances) {
    const debtors = [];
    const creditors = [];

    for (const [id, net] of balances.entries()) {
      const rounded = Math.round(net * 100) / 100;
      if (rounded < -0.01) {
        debtors.push({ id, amount: Math.abs(rounded) });
      } else if (rounded > 0.01) {
        creditors.push({ id, amount: rounded });
      }
    }

    // Sort descending by magnitude
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const settleAmount = Math.min(debtor.amount, creditor.amount);
      const roundedSettle = Math.round(settleAmount * 100) / 100;

      if (roundedSettle > 0.01) {
        transfers.push({
          from: debtor.id,
          to: creditor.id,
          amount: roundedSettle,
        });
      }

      debtor.amount = Math.round((debtor.amount - settleAmount) * 100) / 100;
      creditor.amount = Math.round((creditor.amount - settleAmount) * 100) / 100;

      if (debtor.amount <= 0.01) dIdx++;
      if (creditor.amount <= 0.01) cIdx++;
    }

    return transfers;
  }

  /**
   * Formats a clean, readable text summary for sharing via iMessage, WhatsApp, or Slack.
   *
   * @param {string} groupTitle
   * @param {string} currencySymbol
   * @param {number} totalSpend
   * @param {Array<{ from: string, to: string, amount: number }>} settlements
   * @param {Map<string, Object>} memberMap - Map of memberId -> member object with name
   * @returns {string} Formatted plain text
   */
  static formatShareSummary(groupTitle, currencySymbol, totalSpend, settlements, memberMap) {
    const getName = (id) => (memberMap.get(id) ? memberMap.get(id).name : id);

    let text = `💸 FairSplit • ${groupTitle}\n`;
    text += `Total Group Spend: ${currencySymbol}${totalSpend.toFixed(2)}\n\n`;

    if (settlements.length === 0) {
      text += `✅ All settled up! No outstanding balances.`;
      return text;
    }

    text += `✅ Simplified Settlement (${settlements.length} transfer${settlements.length === 1 ? '' : 's'}):\n`;
    for (const s of settlements) {
      text += `• ${getName(s.from)} pays ${getName(s.to)}: ${currencySymbol}${s.amount.toFixed(2)}\n`;
    }

    text += `\nShared via FairSplit (Zero-login, P2P)`;
    return text;
  }
}
