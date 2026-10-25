/**
 * MemberSheet - Manage Group Members & Participant Avatars.
 */
export class MemberSheet {
  constructor({ bottomSheet, ledger, audioHaptics, toast }) {
    this.sheet = bottomSheet;
    this.ledger = ledger;
    this.audio = audioHaptics;
    this.toast = toast;
  }

  show() {
    const group = this.ledger.getActiveGroup();

    this.sheet.show({
      title: 'Group Members',
      subtitle: `${group.name} • ${group.members.length} People`,
      contentHtml: `
        <div class="ios-form">
          <!-- Add Member Input -->
          <div class="ios-form-group">
            <label class="ios-form-label" for="inp-new-member">Add New Person</label>
            <div class="add-member-input-row">
              <input type="text" id="inp-new-member" class="ios-input" placeholder="e.g. Maya, Jordan, Chris" autocomplete="off" />
              <button type="button" class="btn-sm-primary" id="btn-add-member">Add</button>
            </div>
          </div>

          <!-- Existing Members Inset List -->
          <div class="ios-form-group">
            <label class="ios-form-label">Current Members</label>
            <div class="ios-inset-card" id="members-list-card">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      `,
      onRender: (sheetEl, sheet) => {
        const input = sheetEl.querySelector('#inp-new-member');
        const addBtn = sheetEl.querySelector('#btn-add-member');
        const listCard = sheetEl.querySelector('#members-list-card');

        const renderMemberList = () => {
          const currentGroup = this.ledger.getActiveGroup();
          listCard.innerHTML = currentGroup.members
            .map(
              (m, idx) => `
              <div class="ios-table-row ${idx === currentGroup.members.length - 1 ? 'last-row' : ''}">
                <div class="row-leading">
                  <span class="avatar-dot" style="background:${m.color}"></span>
                  <span class="row-title">${m.name}</span>
                </div>
                <div class="row-trailing">
                  <button type="button" class="btn-row-delete" data-member-id="${m.id}" title="Remove member">✕</button>
                </div>
              </div>
            `
            )
            .join('');

          listCard.querySelectorAll('.btn-row-delete').forEach((btn) => {
            btn.addEventListener('click', (e) => {
              const id = e.currentTarget.getAttribute('data-member-id');
              try {
                this.ledger.removeMember(id);
                if (this.audio) this.audio.tap();
                this.toast.show('Member removed', { type: 'info' });
                renderMemberList();
              } catch (err) {
                if (this.audio) this.audio.warning();
                this.toast.show(err.message, { type: 'warning' });
              }
            });
          });
        };

        const handleAdd = () => {
          const name = input.value.trim();
          if (!name) return;

          const added = this.ledger.addMember(name);
          if (added) {
            input.value = '';
            if (this.audio) this.audio.tap();
            this.toast.show(`Added ${added.name}`, { type: 'success' });
            renderMemberList();
          }
        };

        addBtn.addEventListener('click', handleAdd);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
          }
        });

        renderMemberList();
      },
    });
  }
}
