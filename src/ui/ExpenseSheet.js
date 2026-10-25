/**
 * ExpenseSheet - iOS Bottom Sheet for Adding & Splitting Expenses.
 */
import { CATEGORIES, SPLIT_MODES } from '../domain/ExpenseLedger.js';

export class ExpenseSheet {
  constructor({ bottomSheet, ledger, audioHaptics, toast }) {
    this.sheet = bottomSheet;
    this.ledger = ledger;
    this.audio = audioHaptics;
    this.toast = toast;
  }

  show() {
    const group = this.ledger.getActiveGroup();
    const currency = this.ledger.getCurrencySymbol();
    const members = group.members;

    if (members.length === 0) {
      this.toast.show('Please add group members first!', { type: 'warning' });
      return;
    }

    let selectedPaidBy = members[0].id;
    let selectedCategory = CATEGORIES[0].id;
    let selectedSplitMode = SPLIT_MODES.EQUAL;
    let selectedParticipantIds = new Set(members.map((m) => m.id));
    let customInputs = {};

    this.sheet.show({
      title: 'New Expense',
      subtitle: group.name,
      contentHtml: `
        <form id="form-new-expense" class="ios-form">
          <!-- Amount Input Hero -->
          <div class="amount-hero-wrap">
            <span class="amount-currency-symbol">${currency}</span>
            <input type="number" id="inp-expense-amount" class="amount-hero-input" placeholder="0.00" step="0.01" min="0.01" required autofocus />
          </div>

          <!-- Title Input -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="inp-expense-title">Description</label>
            <input type="text" id="inp-expense-title" class="ios-input" placeholder="e.g. Dinner, Groceries, Uber" required autocomplete="off" />
          </div>

          <!-- Paid By Selector -->
          <div class="ios-form-group">
            <label class="ios-form-label">Paid By</label>
            <div class="avatar-chip-scroll" id="payer-chip-group">
              ${members
                .map(
                  (m) => `
                <button type="button" class="avatar-chip ${m.id === selectedPaidBy ? 'selected' : ''}" data-member-id="${m.id}">
                  <span class="avatar-dot" style="background:${m.color}"></span>
                  <span class="avatar-name">${m.name}</span>
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Category Selector -->
          <div class="ios-form-group">
            <label class="ios-form-label">Category</label>
            <div class="category-chip-scroll" id="category-chip-group">
              ${CATEGORIES.map(
                (c) => `
                <button type="button" class="category-chip ${c.id === selectedCategory ? 'selected' : ''}" data-cat-id="${c.id}">
                  <span class="cat-icon">${c.icon}</span>
                  <span class="cat-name">${c.name}</span>
                </button>
              `
              ).join('')}
            </div>
          </div>

          <!-- Split Mode Segmented Bar -->
          <div class="ios-form-group">
            <label class="ios-form-label">Split Method</label>
            <div class="split-mode-pill-bar" id="split-mode-bar">
              <button type="button" class="split-pill active" data-mode="equal">Equally</button>
              <button type="button" class="split-pill" data-mode="exact">Exact ($)</button>
              <button type="button" class="split-pill" data-mode="percent">Percent (%)</button>
              <button type="button" class="split-pill" data-mode="shares">Shares (x)</button>
            </div>
          </div>

          <!-- Split Participant Checkboxes & Inputs -->
          <div class="ios-form-group">
            <label class="ios-form-label">Split Breakdown</label>
            <div class="ios-inset-card" id="participants-list">
              <!-- Dynamically populated -->
            </div>
          </div>

          <button type="submit" class="btn-primary-ios" id="btn-submit-expense">
            Save Expense
          </button>
        </form>
      `,
      onRender: (sheetEl, sheet) => {
        const form = sheetEl.querySelector('#form-new-expense');
        const amountInput = sheetEl.querySelector('#inp-expense-amount');
        const titleInput = sheetEl.querySelector('#inp-expense-title');
        const payerChips = sheetEl.querySelectorAll('#payer-chip-group .avatar-chip');
        const categoryChips = sheetEl.querySelectorAll('#category-chip-group .category-chip');
        const splitPills = sheetEl.querySelectorAll('#split-mode-bar .split-pill');
        const participantsContainer = sheetEl.querySelector('#participants-list');

        const updateBreakdownUI = () => {
          const total = Number(amountInput.value) || 0;
          const participants = Array.from(selectedParticipantIds);
          const splits = this.ledger.calculateSplit(total, participants, selectedSplitMode, customInputs);

          participantsContainer.innerHTML = members
            .map((m, idx) => {
              const isChecked = selectedParticipantIds.has(m.id);
              const owedAmount = splits[m.id] !== undefined ? splits[m.id] : 0;
              const isLast = idx === members.length - 1;

              return `
              <div class="split-row ${isLast ? 'last-row' : ''}">
                <label class="split-row-label">
                  <input type="checkbox" class="participant-check" data-id="${m.id}" ${isChecked ? 'checked' : ''} />
                  <span class="avatar-dot" style="background:${m.color}"></span>
                  <span class="member-label">${m.name}</span>
                </label>

                <div class="split-row-value">
                  ${
                    selectedSplitMode === SPLIT_MODES.EQUAL
                      ? `<span class="owed-pill">${currency}${owedAmount.toFixed(2)}</span>`
                      : `<input type="number" class="custom-split-input" data-id="${m.id}" value="${customInputs[m.id] || (selectedSplitMode === SPLIT_MODES.PERCENT ? (100 / participants.length).toFixed(0) : '1')}" step="any" min="0" />`
                  }
                </div>
              </div>
            `;
            })
            .join('');

          // Hook checkbox toggles
          participantsContainer.querySelectorAll('.participant-check').forEach((chk) => {
            chk.addEventListener('change', (e) => {
              const id = e.target.getAttribute('data-id');
              if (e.target.checked) {
                selectedParticipantIds.add(id);
              } else {
                if (selectedParticipantIds.size <= 1) {
                  e.target.checked = true;
                  this.toast.show('At least one member must be included!', { type: 'warning' });
                  return;
                }
                selectedParticipantIds.delete(id);
              }
              if (this.audio) this.audio.tap();
              updateBreakdownUI();
            });
          });

          // Hook custom inputs
          participantsContainer.querySelectorAll('.custom-split-input').forEach((inp) => {
            inp.addEventListener('input', (e) => {
              const id = e.target.getAttribute('data-id');
              customInputs[id] = e.target.value;
            });
          });
        };

        // Payer selector
        payerChips.forEach((btn) => {
          btn.addEventListener('click', () => {
            payerChips.forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPaidBy = btn.getAttribute('data-member-id');
            if (this.audio) this.audio.tap();
          });
        });

        // Category selector
        categoryChips.forEach((btn) => {
          btn.addEventListener('click', () => {
            categoryChips.forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedCategory = btn.getAttribute('data-cat-id');
            if (this.audio) this.audio.tap();
          });
        });

        // Split mode selector
        splitPills.forEach((pill) => {
          pill.addEventListener('click', () => {
            splitPills.forEach((p) => p.classList.remove('active'));
            pill.classList.add('active');
            selectedSplitMode = pill.getAttribute('data-mode');
            if (this.audio) this.audio.tick();
            updateBreakdownUI();
          });
        });

        amountInput.addEventListener('input', () => updateBreakdownUI());

        updateBreakdownUI();

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const title = titleInput.value.trim();
          const amount = Number(amountInput.value);

          if (!title || amount <= 0) {
            this.toast.show('Please enter a description and valid amount.', { type: 'warning' });
            return;
          }

          try {
            this.ledger.addExpense({
              title,
              amount,
              paidBy: selectedPaidBy,
              category: selectedCategory,
              participantIds: Array.from(selectedParticipantIds),
              splitMode: selectedSplitMode,
              customInputs,
            });

            if (this.audio) this.audio.success();
            this.toast.show(`Added "${title}" (${currency}${amount.toFixed(2)})`, { type: 'success' });
            sheet.close();
          } catch (err) {
            this.toast.show(err.message, { type: 'warning' });
          }
        });
      },
    });
  }
}
