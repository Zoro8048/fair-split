/**
 * SettleSheet - Record Cash or Digital Payments between Group Members.
 */
export class SettleSheet {
  constructor({ bottomSheet, ledger, audioHaptics, toast }) {
    this.sheet = bottomSheet;
    this.ledger = ledger;
    this.audio = audioHaptics;
    this.toast = toast;
  }

  show({ suggestedFrom, suggestedTo, suggestedAmount } = {}) {
    const group = this.ledger.getActiveGroup();
    const currency = this.ledger.getCurrencySymbol();
    const members = group.members;

    if (members.length < 2) {
      this.toast.show('Need at least 2 members to settle up.', { type: 'warning' });
      return;
    }

    const defaultFrom = suggestedFrom || members[0].id;
    const defaultTo = suggestedTo || (members[1] ? members[1].id : members[0].id);
    const defaultAmount = suggestedAmount !== undefined ? suggestedAmount.toFixed(2) : '';

    this.sheet.show({
      title: 'Settle Up Debt',
      subtitle: group.name,
      contentHtml: `
        <form id="form-settle-up" class="ios-form">
          <!-- Settlement Amount Hero -->
          <div class="amount-hero-wrap">
            <span class="amount-currency-symbol">${currency}</span>
            <input type="number" id="inp-settle-amount" class="amount-hero-input" placeholder="0.00" step="0.01" min="0.01" value="${defaultAmount}" required autofocus />
          </div>

          <!-- Payer (From) -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="select-settle-from">Who Paid? (Debtor)</label>
            <select id="select-settle-from" class="ios-select">
              ${members.map((m) => `<option value="${m.id}" ${m.id === defaultFrom ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
          </div>

          <!-- Receiver (To) -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="select-settle-to">Paid To (Creditor)</label>
            <select id="select-settle-to" class="ios-select">
              ${members.map((m) => `<option value="${m.id}" ${m.id === defaultTo ? 'selected' : ''}>${m.name}</option>`).join('')}
            </select>
          </div>

          <!-- Optional Payment Note -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="inp-settle-note">Note / Method</label>
            <input type="text" id="inp-settle-note" class="ios-input" placeholder="e.g. Venmo, Zelle, Cash, Revolut" value="Venmo / Cash" />
          </div>

          <button type="submit" class="btn-primary-ios" id="btn-submit-settle">
            Record Payment
          </button>
        </form>
      `,
      onRender: (sheetEl, sheet) => {
        const form = sheetEl.querySelector('#form-settle-up');
        const amountInput = sheetEl.querySelector('#inp-settle-amount');
        const fromSelect = sheetEl.querySelector('#select-settle-from');
        const toSelect = sheetEl.querySelector('#select-settle-to');
        const noteInput = sheetEl.querySelector('#inp-settle-note');

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const from = fromSelect.value;
          const to = toSelect.value;
          const amount = Number(amountInput.value);

          if (from === to) {
            this.toast.show('Payer and receiver cannot be the same person!', { type: 'warning' });
            return;
          }

          if (amount <= 0) {
            this.toast.show('Please enter a valid payment amount.', { type: 'warning' });
            return;
          }

          const fromName = group.members.find((m) => m.id === from)?.name || 'Payer';
          const toName = group.members.find((m) => m.id === to)?.name || 'Receiver';

          this.ledger.recordSettlement({
            from,
            to,
            amount,
            note: noteInput.value.trim() || 'Settlement',
          });

          if (this.audio) this.audio.success();
          this.toast.show(`Recorded: ${fromName} paid ${toName} ${currency}${amount.toFixed(2)}`, { type: 'success' });
          sheet.close();
        });
      },
    });
  }
}
