import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of notify.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.type" (click)="notify.dismiss(toast.id)">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error') { ✕ }
              @case ('warning') { ⚠ }
              @default { ℹ }
            }
          </span>
          <span>{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed; top: 16px; right: 16px; z-index: 10000;
      display: flex; flex-direction: column; gap: 8px; max-width: 400px;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; cursor: pointer;
      font-size: 13px; font-weight: 500; color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
      animation: slideIn .3s ease;
    }
    .toast-icon { font-size: 16px; font-weight: 700; }
    .toast-success { background: #16a34a; }
    .toast-error { background: #dc2626; }
    .toast-warning { background: #f59e0b; color: #1e293b; }
    .toast-info { background: #3b82f6; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
  `]
})
export class ToastComponent {
  constructor(public notify: NotificationService) {}
}
