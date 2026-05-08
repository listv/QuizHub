import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { User } from '@core/models/models';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header">
  <h1 class="page-title">Користувачі</h1>
  <div style="display:flex;align-items:center;gap:12px">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#64748b">
      <input type="checkbox" [checked]="showDeactivated()" (change)="showDeactivated.set(!showDeactivated())">
      Показувати деактивованих
      <span style="font-size:12px;color:#94a3b8">({{ deactivatedCount() }})</span>
    </label>
    <button class="btn-primary" (click)="startNew()">➕ Додати</button>
  </div>
</div>

    <!-- Grouped by department -->
    @for (group of groupedUsers(); track group[0]) {
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:14px;font-weight:700;color:#0f172a">🏢 {{ group[0] }}</span>
          <span style="font-size:12px;color:#94a3b8">({{ group[1].length }})</span>
        </div>

        @for (u of group[1]; track u.id) {
          <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;margin-bottom:4px"
               [style.opacity]="u.isActive ? '1' : '0.5'">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="avatar">{{ u.fullName.charAt(0) }}</div>
              <div>
                <div style="font-weight:600;font-size:14px">
                  {{ u.fullName }}
                  @if (!u.isActive) { <span style="font-size:11px;color:#ef4444;margin-left:6px">(деактивований)</span> }
                </div>
                <div style="font-size:12px;color:#94a3b8"><code>{{ u.login }}</code></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge" [class]="'badge-' + u.role.toLowerCase()">{{ roleLabel(u.role) }}</span>
              <button class="icon-btn" (click)="startEdit(u)" title="Редагувати">✏️</button>
              @if (u.isActive) {
                <button class="icon-btn" (click)="deleteUser(u.id)" title="Деактивувати">🗑️</button>
              } @else {
                <button class="icon-btn" (click)="reactivateUser(u.id)" title="Поновити" style="font-size:18px">♻️</button>
              }
            </div>
          </div>
        }
      </div>
    }

    <!-- Modal -->
    @if (editing()) {
      <div class="modal-overlay" (click)="editing.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 16px">{{ editId ? 'Редагування' : 'Новий користувач' }}</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><label class="lbl">Логін *</label><input class="inp" [(ngModel)]="form.login"></div>
            <div><label class="lbl">{{ editId ? 'Новий пароль' : 'Пароль *' }}</label><input class="inp" type="password" [(ngModel)]="form.password" [placeholder]="editId ? 'порожнє = без змін' : ''"></div>
          </div>
          <label class="lbl">Ім'я *</label><input class="inp" [(ngModel)]="form.fullName">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><label class="lbl">Роль</label>
              <select class="inp" [(ngModel)]="form.role">
                <option value="Admin">Адміністратор</option>
                <option value="Manager">Менеджер</option>
                <option value="Employee">Співробітник</option>
              </select>
            </div>
            <div><label class="lbl">Відділ</label><input class="inp" [(ngModel)]="form.department"></div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button class="btn-secondary" (click)="editing.set(false)">Скасувати</button>
            <button class="btn-primary" (click)="save()">Зберегти</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .icon-btn { background:none;border:none;cursor:pointer;padding:6px;font-size:16px }
    .btn-primary { padding:10px 18px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .btn-secondary { padding:10px 18px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .modal-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000 }
    .modal { background:#fff;border-radius:16px;padding:28px;width:90%;max-width:560px }
    .lbl { display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px }
    .inp { width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;font-family:inherit }
  `]
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  editing = signal(false);
  showDeactivated = signal(true);
  editId: string | null = null;
  form = { login: '', password: '', fullName: '', role: 'Employee', department: '' };

  constructor(private api: ApiService, private notify: NotificationService) {}
  ngOnInit() { this.load(); }
  load() { this.api.getUsers().subscribe(u => this.users.set(u)); }

  deactivatedCount = () => this.users().filter(u => !u.isActive).length;

  groupedUsers = (): [string, User[]][] => {
    const all = this.users();
    const filtered = this.showDeactivated() ? all : all.filter(u => u.isActive);

    const groups = new Map<string, User[]>();
    for (const u of filtered) {
      const dept = u.department || 'Без відділу';
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(u);
    }

    for (const [dept, users] of groups) {
      groups.set(dept, [
        ...users.filter(u => u.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName, 'uk')),
        ...users.filter(u => !u.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName, 'uk'))
      ]);
    }

    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'uk'));
  };

  roleLabel(r: string) { return { Admin: 'Адміністратор', Manager: 'Менеджер', Employee: 'Співробітник' }[r] ?? r; }

  startNew() { this.form = { login: '', password: '', fullName: '', role: 'Employee', department: '' }; this.editId = null; this.editing.set(true); }
  startEdit(u: User) { this.form = { login: u.login, password: '', fullName: u.fullName, role: u.role, department: u.department }; this.editId = u.id; this.editing.set(true); }

  save() {
    if (!this.form.login || !this.form.fullName) return;
    if (this.editId) {
      this.api.updateUser(this.editId, { fullName: this.form.fullName, role: this.form.role, department: this.form.department, password: this.form.password || undefined }).subscribe(() => {
        this.editing.set(false); this.load(); this.notify.success('Користувача оновлено');
      });
    } else {
      if (!this.form.password) return;
      this.api.createUser(this.form).subscribe(() => {
        this.editing.set(false); this.load(); this.notify.success('Користувача створено');
      });
    }
  }

  deleteUser(id: string) {
    if (!confirm('Деактивувати користувача?')) return;
    this.api.deleteUser(id).subscribe(() => { this.load(); this.notify.success('Користувача деактивовано'); });
  }

  reactivateUser(id: string) {
    this.api.updateUser(id, { isActive: true }).subscribe(() => { this.load(); this.notify.success('Користувача поновлено'); });
  }
}
