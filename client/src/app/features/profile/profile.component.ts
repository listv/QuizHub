import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1 class="page-title">Мій профіль</h1>

    <div style="max-width:480px">
      <!-- Info card -->
      <div class="card" style="margin-bottom:20px">
        <h3 class="section-title">Інформація</h3>
        <div style="display:flex;align-items:center;gap:16px">
          <div class="avatar-lg">{{ auth.user()?.fullName?.charAt(0) }}</div>
          <div>
            <div style="font-size:18px;font-weight:700">{{ auth.user()?.fullName }}</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px">
              <code>{{ auth.user()?.login }}</code>
            </div>
            <div style="margin-top:6px;display:flex;gap:8px">
              <span class="badge" [class]="'badge-' + auth.user()?.role?.toLowerCase()">{{ roleLabel(auth.user()?.role) }}</span>
              <span style="font-size:12px;color:#94a3b8">{{ auth.user()?.department }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Change password card -->
      <div class="card">
        <h3 class="section-title">Змінити пароль</h3>

        @if (success()) {
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:16px;color:#16a34a;font-size:13px;font-weight:500">
            ✓ Пароль успішно змінено!
          </div>
        }

        <label class="field-label">Поточний пароль</label>
        <input class="field-input" type="password" [(ngModel)]="form.currentPassword" placeholder="••••••••">

        <label class="field-label">Новий пароль</label>
        <input class="field-input" type="password" [(ngModel)]="form.newPassword" placeholder="Мінімум 4 символи">

        <label class="field-label">Підтвердження нового пароля</label>
        <input class="field-input" type="password" [(ngModel)]="form.confirmPassword" placeholder="Повторіть новий пароль"
               [style.border-color]="form.confirmPassword && form.newPassword !== form.confirmPassword ? '#ef4444' : ''">

        @if (form.confirmPassword && form.newPassword !== form.confirmPassword) {
          <div style="font-size:12px;color:#ef4444;margin-top:-8px;margin-bottom:12px">Паролі не співпадають</div>
        }

        <button class="btn-primary" (click)="changePassword()"
                [disabled]="saving() || !form.currentPassword || !form.newPassword || form.newPassword !== form.confirmPassword">
          {{ saving() ? 'Збереження...' : 'Змінити пароль' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .section-title { margin:0 0 16px;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px }
    .field-label { display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px }
    .field-input { width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;font-family:inherit;transition:border-color .15s }
    .field-input:focus { border-color:#3b82f6 }
    .btn-primary { padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .btn-primary:disabled { opacity:.5;cursor:not-allowed }
    .avatar-lg { width:56px;height:56px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0 }
  `]
})
export class ProfileComponent {
  form = { currentPassword: '', newPassword: '', confirmPassword: '' };
  saving = signal(false);
  success = signal(false);

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private notify: NotificationService
  ) {}

  roleLabel(role?: string): string {
    return { Admin: 'Адміністратор', Manager: 'Менеджер', Employee: 'Співробітник' }[role ?? ''] ?? role ?? '';
  }

  changePassword() {
    if (this.form.newPassword !== this.form.confirmPassword) return;
    if (this.form.newPassword.length < 4) {
      this.notify.error('Новий пароль має бути мінімум 4 символи');
      return;
    }

    this.saving.set(true);
    this.success.set(false);

    this.api.changePassword({
      currentPassword: this.form.currentPassword,
      newPassword: this.form.newPassword,
      confirmPassword: this.form.confirmPassword
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set(true);
        this.form = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.notify.success('Пароль успішно змінено');
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }
}
