/**
 * FairSplit - Zero-Backend P2P Expense Splitter with Min-Cash-Flow Debt Graph.
 */
import {
  EventBus,
  StorageManager,
  AudioHaptics,
  CameraService,
  ShareService,
  BottomSheet,
  SegmentedControl,
  Toast,
  LegalNoticeSheet,
} from 'ios-pwa-foundation';

import { ExpenseLedger, CATEGORIES } from './domain/ExpenseLedger.js';
import { DebtSimplifier } from './domain/DebtSimplifier.js';
import { ExpenseSheet } from './ui/ExpenseSheet.js';
import { MemberSheet } from './ui/MemberSheet.js';
import { SettleSheet } from './ui/SettleSheet.js';
import { QrSyncSheet } from './ui/QrSyncSheet.js';
import { GroupPickerSheet } from './ui/GroupPickerSheet.js';

class FairSplitApp {
  constructor() {
    this.bus = new EventBus();
    this.audio = new AudioHaptics({ enabled: true });
    this.storage = new StorageManager({
      namespace: 'fairsplit_db',
      version: 1,
    });
    this.ledger = new ExpenseLedger({
      storageManager: this.storage,
      eventBus: this.bus,
    });
    this.camera = new CameraService();
    this.bottomSheet = new BottomSheet({ audioHaptics: this.audio });
    this.toast = new Toast();
    this.legalSheet = new LegalNoticeSheet({
      bottomSheet: this.bottomSheet,
      appName: 'FairSplit',
    });

    // Sub-sheets
    this.expenseSheet = new ExpenseSheet({
      bottomSheet: this.bottomSheet,
      ledger: this.ledger,
      audioHaptics: this.audio,
      toast: this.toast,
    });
    this.memberSheet = new MemberSheet({
      bottomSheet: this.bottomSheet,
      ledger: this.ledger,
      audioHaptics: this.audio,
      toast: this.toast,
    });
    this.settleSheet = new SettleSheet({
      bottomSheet: this.bottomSheet,
      ledger: this.ledger,
      audioHaptics: this.audio,
      toast: this.toast,
    });
    this.qrSyncSheet = new QrSyncSheet({
      bottomSheet: this.bottomSheet,
      ledger: this.ledger,
      cameraService: this.camera,
      audioHaptics: this.audio,
      toast: this.toast,
    });
    this.groupPickerSheet = new GroupPickerSheet({
      bottomSheet: this.bottomSheet,
      ledger: this.ledger,
      audioHaptics: this.audio,
      toast: this.toast,
    });

    this.activeTab = 'expenses'; // 'expenses' | 'balances' | 'settle'
  }

  init() {
    this._initSegmentedControl();
    this._bindGlobalEvents();
    this._render();

    this.bus.on('ledger:updated', () => {
      this._render();
    });
  }

  _initSegmentedControl() {
    const slot = document.getElementById('segmented-control-slot');
    if (!slot) return;

    new SegmentedControl({
      container: slot,
      options: [
        { id: 'expenses', label: 'Expenses' },
        { id: 'balances', label: 'Balances' },
        { id: 'settle', label: 'Settle Up' },
      ],
      defaultId: 'expenses',
      audioHaptics: this.audio,
      onChange: (tabId) => {
        this.activeTab = tabId;
        this._render();
      },
    });
  }

  _bindGlobalEvents() {
    // Header controls
    document.getElementById('btn-header-groups')?.addEventListener('click', () => {
      this.groupPickerSheet.show();
    });

    document.getElementById('btn-header-members')?.addEventListener('click', () => {
      this.memberSheet.show();
    });

    document.getElementById('nav-btn-members')?.addEventListener('click', () => {
      this.memberSheet.show();
    });

    // Floating add button
    document.getElementById('btn-floating-add')?.addEventListener('click', () => {
      this.expenseSheet.show();
    });

    // Nav scan/sync button
    document.getElementById('nav-btn-sync')?.addEventListener('click', () => {
      this.qrSyncSheet.show();
    });

    // Legal notice footer
    document.getElementById('btn-open-legal')?.addEventListener('click', () => {
      this.legalSheet.show();
    });
  }

  _render() {
    const group = this.ledger.getActiveGroup();
    const currency = this.ledger.getCurrencySymbol();
    const totalSpend = this.ledger.getTotalSpend();

    // Update Header Pill
    const groupTitleEl = document.getElementById('header-group-title');
    if (groupTitleEl) {
      groupTitleEl.textContent = group.name;
    }

    const container = document.getElementById('view-stage');
    if (!container) return;

    if (this.activeTab === 'expenses') {
      this._renderExpensesView(container, group, currency, totalSpend);
    } else if (this.activeTab === 'balances') {
      this._renderBalancesView(container, group, currency);
    } else if (this.activeTab === 'settle') {
      this._renderSettleView(container, group, currency, totalSpend);
    }
  }

  _renderExpensesView(container, group, currency, totalSpend) {
    const expenses = group.expenses;

    container.innerHTML = `
      <!-- Group Hero Banner -->
      <div class="group-hero-card">
        <div class="hero-top-row">
          <div class="hero-label">Total Group Spend</div>
          <button type="button" class="btn-hero-manage" id="btn-hero-sync" title="Sync Ledger via QR">
            🔄 Sync QR
          </button>
        </div>
        <div class="hero-total-amount">${currency}${totalSpend.toFixed(2)}</div>
        <div class="hero-member-strip">
          ${group.members
            .map(
              (m) => `
            <div class="hero-avatar-pill" title="${m.name}">
              <span class="avatar-dot" style="background:${m.color}"></span>
              <span class="hero-member-name">${m.name}</span>
            </div>
          `
            )
            .join('')}
          <button type="button" class="hero-add-member-pill" id="btn-hero-add-member">+ Person</button>
        </div>
      </div>

      <!-- Expenses Inset List -->
      <div class="ios-group-container" style="margin-top: 1rem;">
        <div class="ios-group-header">Recent Expenses (${expenses.length})</div>
        <div class="ios-inset-card">
          ${
            expenses.length === 0
              ? `
            <div class="empty-state-card">
              <span class="empty-icon">🧾</span>
              <h4>No expenses yet</h4>
              <p>Tap the <strong>+</strong> button below to log your first group purchase.</p>
            </div>
          `
              : expenses
                  .map((e, idx) => {
                    const payer = group.members.find((m) => m.id === e.paidBy);
                    const cat = CATEGORIES.find((c) => c.id === e.category) || CATEGORIES[6];
                    const isLast = idx === expenses.length - 1;

                    return `
                <div class="ios-table-row expense-item-row ${isLast ? 'last-row' : ''}">
                  <div class="row-leading">
                    <span class="cat-badge-circle">${cat.icon}</span>
                    <div class="row-label-group">
                      <span class="row-title">${e.title}</span>
                      <span class="row-subtitle">Paid by <strong style="color:${payer ? payer.color : 'inherit'}">${payer ? payer.name : 'Unknown'}</strong> • ${new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div class="row-trailing">
                    <span class="expense-amount-tag">${currency}${Number(e.amount).toFixed(2)}</span>
                    <button type="button" class="btn-delete-item" data-id="${e.id}" title="Delete expense">✕</button>
                  </div>
                </div>
              `;
                  })
                  .join('')
          }
        </div>
      </div>
    `;

    // Hook internal buttons
    container.querySelector('#btn-hero-sync')?.addEventListener('click', () => this.qrSyncSheet.show());
    container.querySelector('#btn-hero-add-member')?.addEventListener('click', () => this.memberSheet.show());

    container.querySelectorAll('.btn-delete-item').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        this.ledger.deleteExpense(id);
        if (this.audio) this.audio.tap();
        this.toast.show('Expense deleted', { type: 'info' });
      });
    });
  }

  _renderBalancesView(container, group, currency) {
    const memberIds = group.members.map((m) => m.id);
    const balances = DebtSimplifier.calculateNetBalances(memberIds, group.expenses, group.settlements);

    container.innerHTML = `
      <div class="ios-group-container">
        <div class="ios-group-header">Net Individual Balances</div>
        <div class="ios-inset-card">
          ${group.members
            .map((m, idx) => {
              const net = balances.get(m.id) || 0;
              const isLast = idx === group.members.length - 1;
              const isPositive = net > 0.01;
              const isNegative = net < -0.01;

              return `
              <div class="ios-table-row balance-row ${isLast ? 'last-row' : ''}">
                <div class="row-leading">
                  <span class="avatar-dot" style="background:${m.color}"></span>
                  <div class="row-label-group">
                    <span class="row-title">${m.name}</span>
                    <span class="row-subtitle">
                      ${
                        isPositive
                          ? 'Gets back'
                          : isNegative
                          ? 'Owes group'
                          : 'Settled up'
                      }
                    </span>
                  </div>
                </div>
                <div class="row-trailing">
                  <span class="balance-badge ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}">
                    ${isPositive ? '+' : ''}${currency}${Math.abs(net).toFixed(2)}
                  </span>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
        <div class="ios-group-footer">
          Positive numbers indicate money owed back to you. Negative numbers indicate what you owe.
        </div>
      </div>
    `;
  }

  _renderSettleView(container, group, currency, totalSpend) {
    const memberIds = group.members.map((m) => m.id);
    const balances = DebtSimplifier.calculateNetBalances(memberIds, group.expenses, group.settlements);
    const simplifiedTransfers = DebtSimplifier.simplifyDebts(balances);

    const memberMap = new Map();
    group.members.forEach((m) => memberMap.set(m.id, m));

    container.innerHTML = `
      <!-- Settlement Actions Header -->
      <div class="settle-header-card">
        <div class="settle-card-title">
          <span>⚡ Min-Cash-Flow Solution</span>
          <button type="button" class="btn-share-summary" id="btn-share-summary">
            ↗️ Share Summary
          </button>
        </div>
        <p class="settle-card-sub">
          Optimal transfers reducing group debt to the mathematical minimum.
        </p>
      </div>

      <!-- Simplified Settlements Inset List -->
      <div class="ios-group-container" style="margin-top: 1rem;">
        <div class="ios-group-header">Required Transfers (${simplifiedTransfers.length})</div>
        <div class="ios-inset-card">
          ${
            simplifiedTransfers.length === 0
              ? `
            <div class="empty-state-card">
              <span class="empty-icon">🎉</span>
              <h4>All Debts Settled!</h4>
              <p>Nobody owes anything in this group. Everyone is even.</p>
            </div>
          `
              : simplifiedTransfers
                  .map((t, idx) => {
                    const fromM = memberMap.get(t.from);
                    const toM = memberMap.get(t.to);
                    const isLast = idx === simplifiedTransfers.length - 1;

                    return `
                <div class="ios-table-row transfer-row ${isLast ? 'last-row' : ''}">
                  <div class="row-leading">
                    <span class="transfer-arrow">➡️</span>
                    <div class="row-label-group">
                      <div class="transfer-participants">
                        <strong style="color:${fromM ? fromM.color : 'inherit'}">${fromM ? fromM.name : 'Unknown'}</strong>
                        <span class="pays-word">pays</span>
                        <strong style="color:${toM ? toM.color : 'inherit'}">${toM ? toM.name : 'Unknown'}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="row-trailing">
                    <span class="transfer-amount">${currency}${t.amount.toFixed(2)}</span>
                    <button type="button" class="btn-record-paid" data-from="${t.from}" data-to="${t.to}" data-amount="${t.amount}">
                      Paid
                    </button>
                  </div>
                </div>
              `;
                  })
                  .join('')
          }
        </div>
      </div>

      <!-- Completed Payments History -->
      ${
        (group.settlements || []).length > 0
          ? `
        <div class="ios-group-container" style="margin-top: 1.25rem;">
          <div class="ios-group-header">Payment History</div>
          <div class="ios-inset-card">
            ${group.settlements
              .map((s, idx) => {
                const fromM = memberMap.get(s.from);
                const toM = memberMap.get(s.to);
                const isLast = idx === group.settlements.length - 1;

                return `
                <div class="ios-table-row settlement-history-row ${isLast ? 'last-row' : ''}">
                  <div class="row-leading">
                    <span class="history-check">✓</span>
                    <div class="row-label-group">
                      <span class="row-title">${fromM ? fromM.name : 'Someone'} paid ${toM ? toM.name : 'Someone'}</span>
                      <span class="row-subtitle">${s.note || 'Settlement'} • ${new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div class="row-trailing">
                    <span class="history-amount">${currency}${Number(s.amount).toFixed(2)}</span>
                    <button type="button" class="btn-delete-settlement" data-id="${s.id}" title="Undo payment">✕</button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    `;

    // Share summary
    container.querySelector('#btn-share-summary')?.addEventListener('click', async () => {
      const summaryText = DebtSimplifier.formatShareSummary(
        group.name,
        currency,
        totalSpend,
        simplifiedTransfers,
        memberMap
      );

      const res = await ShareService.share({
        title: `FairSplit • ${group.name}`,
        text: summaryText,
      });

      if (res.success) {
        if (this.audio) this.audio.success();
        this.toast.show(
          res.method === 'native' ? 'Opened iOS Share Sheet' : 'Copied summary to clipboard!',
          { type: 'success' }
        );
      }
    });

    // Record Paid
    container.querySelectorAll('.btn-record-paid').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const from = ev.currentTarget.getAttribute('data-from');
        const to = ev.currentTarget.getAttribute('data-to');
        const amount = Number(ev.currentTarget.getAttribute('data-amount'));

        this.settleSheet.show({
          suggestedFrom: from,
          suggestedTo: to,
          suggestedAmount: amount,
        });
      });
    });

    // Delete/Undo settlement
    container.querySelectorAll('.btn-delete-settlement').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const id = ev.currentTarget.getAttribute('data-id');
        this.ledger.deleteSettlement(id);
        if (this.audio) this.audio.tap();
        this.toast.show('Settlement payment undone', { type: 'info' });
      });
    });
  }
}

// Boot application
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new FairSplitApp();
    app.init();
    window.__app = app;
  });
}
