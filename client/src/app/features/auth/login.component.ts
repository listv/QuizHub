import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@env/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="login-wrap">
      <div class="login-left">
        <div class="brand">
          <div style="font-size:48px; margin-bottom:16px">📋</div>
          <h1>QuizHub</h1>
          <p>Корпоративна система тестування знань з розмежуванням ролей</p>
          @if (!isProduction) {
            <div class="demo-box">
              <div class="demo-title">Демо-акаунти</div>
              @for (d of demos; track d.login) {
                <div class="demo-row">
                  <div>
                    <strong>{{ d.role }}</strong>
                    <div class="demo-desc">{{ d.desc }}</div>
                  </div>
                  <code class="demo-creds" (click)="fillDemo(d.login, d.pw)">{{ d.login }} / {{ d.pw }}</code>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <div class="login-right">
        <div class="login-form">
          <h2>Вхід в систему</h2>
          <p class="subtitle">Введіть облікові дані</p>

          @if (error()) {
            <div class="error-box">{{ error() }}</div>
          }

          <label>Логін</label>
          <div class="input-wrap">
            <mat-icon>person</mat-icon>
            <input [(ngModel)]="login" placeholder="Введіть логін" (keydown.enter)="doLogin()">
          </div>

          <label>Пароль</label>
          <div class="input-wrap">
            <mat-icon>lock</mat-icon>
            <input type="password" [(ngModel)]="password" placeholder="Введіть пароль" (keydown.enter)="doLogin()">
          </div>

          <button class="btn-primary full" (click)="doLogin()" [disabled]="loading()">
            {{ loading() ? 'Вхід...' : 'Увійти' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap { display: flex; min-height: 100vh; }

    .login-left {
      flex: 1; background: #0f172a; display: flex;
      align-items: center; justify-content: center; padding: 48px;
    }
    .brand { max-width: 420px; }
    .brand h1 { font-size: 36px; font-weight: 800; color: #f8fafc; margin: 0 0 12px; }
    .brand p { font-size: 16px; color: #94a3b8; line-height: 1.6; }

    .demo-box {
      margin-top: 40px; padding: 20px;
      background: rgba(255,255,255,.05); border-radius: 12px;
      border: 1px solid rgba(255,255,255,.1);
    }
    .demo-title { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .demo-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.06);
    }
    .demo-row strong { color: #e2e8f0; font-size: 13px; }
    .demo-desc { font-size: 11px; color: #64748b; margin-top: 2px; }
    .demo-creds {
      font-size: 13px; color: #cbd5e1; background: rgba(255,255,255,.08);
      padding: 4px 10px; border-radius: 4px; cursor: pointer;
    }
    .demo-creds:hover { background: rgba(255,255,255,.15); }

    .login-right {
      flex: 1; display: flex; align-items: center;
      justify-content: center; padding: 48px; background: #fff;
    }
    .login-form { max-width: 380px; width: 100%; }
    .login-form h2 { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #0f172a; }
    .subtitle { font-size: 14px; color: #94a3b8; margin: 0 0 32px; }

    .error-box {
      padding: 10px 14px; background: #fee2e2; color: #991b1b;
      border-radius: 8px; font-size: 13px; margin-bottom: 16px;
    }

    label {
      display: block; font-size: 12px; font-weight: 600;
      color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px;
    }

    .input-wrap {
      position: relative; margin-bottom: 20px;
    }
    .input-wrap mat-icon {
      position: absolute; left: 14px; top: 12px; color: #94a3b8; font-size: 18px;
    }
    .input-wrap input {
      width: 100%; padding: 12px 12px 12px 42px;
      border: 1px solid #e2e8f0; border-radius: 8px;
      font-size: 14px; outline: none; box-sizing: border-box;
    }
    .input-wrap input:focus { border-color: #3b82f6; }

    .btn-primary {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 12px 20px; background: #3b82f6; color: #fff;
      border: none; border-radius: 8px; cursor: pointer;
      font-size: 14px; font-weight: 600;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .full { width: 100%; padding: 14px; font-size: 15px; }
  `]
})
export class LoginComponent {
  isProduction = environment.production;
  login = '';
  password = '';
  error = signal('');
  loading = signal(false);

  demos = [
    { role: 'Адмін', login: 'admin', pw: 'admin', desc: 'Повний доступ' },
    { role: 'Менеджер', login: 'manager', pw: '1234', desc: 'Аналітика відділу' },
    { role: 'Співробітник', login: 'olena', pw: '1234', desc: 'Проходження тестів' },
  ];

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isAuthenticated()) this.router.navigate(['/dashboard']);
  }

  fillDemo(login: string, pw: string) {
    this.login = login;
    this.password = pw;
  }

  doLogin() {
    if (!this.login || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login({ login: this.login, password: this.password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error.set('Невірний логін або пароль');
        this.loading.set(false);
      }
    });
  }
}
