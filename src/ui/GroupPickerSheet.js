/**
 * GroupPickerSheet - Switch or Create Expense Groups & Select Currency.
 */
import { CURRENCIES } from '../domain/ExpenseLedger.js';

export class GroupPickerSheet {
  constructor({ bottomSheet, ledger, audioHaptics, toast }) {
    this.sheet = bottomSheet;
    this.ledger = ledger;
    this.audio = audioHaptics;
    this.toast = toast;
  }

  show() {
    const activeGroup = this.ledger.getActiveGroup();
    const groups = this.ledger.state.groups;
    const currentCurrency = activeGroup.currency || this.ledger.state.currency || 'USD';

    this.sheet.show({
      title: 'Expense Groups & Settings',
      subtitle: `${groups.length} Groups on Device`,
      contentHtml: `
        <div class="ios-form">
          <!-- Active Groups Inset List -->
          <div class="ios-form-group">
            <label class="ios-form-label">Switch Active Group</label>
            <div class="ios-inset-card" id="groups-list-card">
              ${groups
                .map(
                  (g, idx) => `
                <div class="ios-table-row ${idx === groups.length - 1 ? 'last-row' : ''} ${g.id === activeGroup.id ? 'active-group-row' : ''}" data-group-id="${g.id}">
                  <div class="row-leading">
                    <span class="row-icon">📁</span>
                    <div class="row-label-group">
                      <span class="row-title">${g.name}</span>
                      <span class="row-subtitle">${g.members.length} members • ${g.expenses.length} expenses</span>
                    </div>
                  </div>
                  <div class="row-trailing">
                    ${g.id === activeGroup.id ? '<span class="status-pill active">Active</span>' : '<span class="row-chevron">›</span>'}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Create New Group -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="inp-new-group-name">Create New Group</label>
            <div style="display:flex; gap:0.4rem;">
              <input type="text" id="inp-new-group-name" class="ios-input" placeholder="e.g. Hawaii Trip, Apartment 4B" autocomplete="off" />
              <button type="button" class="btn-sm-primary" id="btn-create-group">Create</button>
            </div>
          </div>

          <!-- Currency Setting -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="select-currency">Group Currency</label>
            <select id="select-currency" class="ios-select">
              ${CURRENCIES.map(
                (c) => `
                <option value="${c.code}" ${c.code === currentCurrency ? 'selected' : ''}>
                  ${c.symbol} ${c.code} — ${c.name}
                </option>
              `
              ).join('')}
            </select>
          </div>
        </div>
      `,
      onRender: (sheetEl, sheet) => {
        const groupRows = sheetEl.querySelectorAll('#groups-list-card .ios-table-row');
        const newGroupInput = sheetEl.querySelector('#inp-new-group-name');
        const createBtn = sheetEl.querySelector('#btn-create-group');
        const currencySelect = sheetEl.querySelector('#select-currency');

        // Switch group
        groupRows.forEach((row) => {
          row.addEventListener('click', () => {
            const gid = row.getAttribute('data-group-id');
            if (gid) {
              this.ledger.setActiveGroup(gid);
              if (this.audio) this.audio.tap();
              this.toast.show(`Switched to "${this.ledger.getActiveGroup().name}"`, { type: 'info' });
              sheet.close();
            }
          });
        });

        // Create new group
        const handleCreate = () => {
          const name = newGroupInput.value.trim();
          if (!name) return;
          const curr = currencySelect.value;
          const created = this.ledger.createGroup(name, curr);
          if (this.audio) this.audio.success();
          this.toast.show(`Created group "${created.name}"`, { type: 'success' });
          sheet.close();
        };

        createBtn.addEventListener('click', handleCreate);
        newGroupInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCreate();
          }
        });

        // Currency change
        currencySelect.addEventListener('change', (e) => {
          this.ledger.setCurrency(e.target.value);
          if (this.audio) this.audio.tick();
          this.toast.show(`Currency set to ${e.target.value}`, { type: 'info' });
        });
      },
    });
  }
}
