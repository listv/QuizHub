import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 0;
  toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', duration = 4000) {
    const id = ++this.counter;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string) { this.show(message, 'error', 6000); }
  warning(message: string) { this.show(message, 'warning'); }

  dismiss(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
