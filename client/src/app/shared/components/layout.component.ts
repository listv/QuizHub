import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { ToastComponent } from './toast.component';

interface NavItem { path: string; icon: string; label: string; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, ToastComponent],
  template: `
    <div class="layout">
      <nav class="sidebar">
        <div class="logo">📋 <span>QuizHub</span></div>

        <div class="user-card">
          <div class="user-avatar">{{ user()?.fullName?.charAt(0) }}</div>
          <div class="user-info">
            <div class="user-name">{{ user()?.fullName }}</div>
            <span class="role-badge" [class]="'badge-' + user()?.role?.toLowerCase()">
              {{ roleLabel() }}
            </span>
          </div>
        </div>

        @for (item of navItems(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" class="nav-item">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }

        <div class="spacer"></div>

        <a routerLink="/profile" routerLinkActive="active" class="nav-item">
          <mat-icon>manage_accounts</mat-icon>
          <span>Мій профіль</span>
        </a>

        <button class="nav-item logout" (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
          <span>Вийти</span>
        </button>
      </nav>

      <main class="main-content">
        <router-outlet />
      </main>

      <app-toast />
    </div>
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }

    .sidebar {
      width: 230px; background: #0f172a; padding: 16px 12px;
      display: flex; flex-direction: column; gap: 2px; flex-shrink: 0;
      overflow-y: auto;
    }

    .logo {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; margin-bottom: 8px;
      font-size: 18px; font-weight: 700; color: #f8fafc;
    }

    .user-card {
      display: flex; align-items: center; gap: 10px;
      padding: 12px; background: rgba(255,255,255,.06);
      border-radius: 10px; margin-bottom: 16px;
    }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: #3b82f6; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; flex-shrink: 0;
    }
    .user-info { flex: 1; min-width: 0; }
    .user-name {
      font-size: 13px; font-weight: 600; color: #f8fafc;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .role-badge {
      font-size: 10px; padding: 2px 8px; border-radius: 10px;
      font-weight: 600; display: inline-block; margin-top: 2px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border: none; background: transparent;
      color: #94a3b8; border-radius: 8px; cursor: pointer;
      font-size: 13px; font-weight: 500; text-decoration: none;
      transition: all .15s; width: 100%;
    }
    .nav-item:hover { background: rgba(255,255,255,.05); }
    .nav-item.active { background: #1e293b; color: #f8fafc; }
    .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .logout { color: #f87171; margin-top: auto; }
    .logout:hover { background: rgba(248,113,113,.1); }

    .spacer { flex: 1; }

    .main-content { flex: 1; padding: 28px; overflow-y: auto; max-height: 100vh; }
  `]
})
export class LayoutComponent {
  constructor(public auth: AuthService) {}

  user = this.auth.user;

  roleLabel = computed(() => {
    const labels: Record<string, string> = { Admin: 'Адміністратор', Manager: 'Менеджер', Employee: 'Співробітник' };
    return labels[this.user()?.role ?? ''] ?? '';
  });

  navItems = computed((): NavItem[] => {
    const role = this.auth.role();
    const items: NavItem[] = [{ path: '/dashboard', icon: 'home', label: 'Головна' }];

    if (role === 'Admin') {
      items.push(
        { path: '/tests', icon: 'quiz', label: 'Тести' },
        { path: '/questions', icon: 'help_outline', label: 'Банк питань' },
        { path: '/users', icon: 'people', label: 'Користувачі' },
        { path: '/analytics', icon: 'bar_chart', label: 'Аналітика' }
      );
    }
    if (role === 'Manager') {
      items.push(
        { path: '/analytics', icon: 'bar_chart', label: 'Аналітика команди' }
      );
    }
    if (role === 'Employee') {
      items.push(
        { path: '/mytests', icon: 'quiz', label: 'Мої тести' },
        { path: '/myresults', icon: 'bar_chart', label: 'Мої результати' }
      );
    }
    return items;
  });
}
