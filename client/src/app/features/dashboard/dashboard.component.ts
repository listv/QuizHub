import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { Test, TestResult, OverviewAnalytics } from '@core/models/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1 class="page-title">
      @if (auth.isAdmin()) { Панель адміністратора }
      @else if (auth.isManager()) { Команда — {{ auth.user()?.department }} }
      @else { Вітаємо, {{ auth.user()?.fullName?.split(' ')?.[0] }}! }
    </h1>

    <!-- Stats -->
    <div [class]="auth.isEmployee() ? 'stats-grid-3' : 'stats-grid'">
      @if (auth.isAdmin()) {
        <div class="stat-card" style="border-left:4px solid #3b82f6"><div><div class="label">Тестів</div><div class="value">{{ tests().length }}</div></div><div class="icon">📝</div></div>
        <div class="stat-card" style="border-left:4px solid #8b5cf6"><div><div class="label">Спроб</div><div class="value">{{ overview()?.totalAttempts ?? 0 }}</div></div><div class="icon">✅</div></div>
        <div class="stat-card" style="border-left:4px solid #10b981"><div><div class="label">Склали</div><div class="value">{{ overview()?.passed ?? 0 }}</div></div><div class="icon">🎯</div></div>
        <div class="stat-card" style="border-left:4px solid #f59e0b"><div><div class="label">Середній бал</div><div class="value">{{ overview()?.averageScore ?? 0 }}%</div></div><div class="icon">📊</div></div>
      }
      @if (auth.isManager()) {
        <div class="stat-card" style="border-left:4px solid #3b82f6"><div><div class="label">Спроб</div><div class="value">{{ overview()?.totalAttempts ?? 0 }}</div></div><div class="icon">📝</div></div>
        <div class="stat-card" style="border-left:4px solid #10b981"><div><div class="label">Середній бал</div><div class="value">{{ overview()?.averageScore ?? 0 }}%</div></div><div class="icon">📊</div></div>
        <div class="stat-card" style="border-left:4px solid #f59e0b"><div><div class="label">Склали / Ні</div><div class="value">{{ overview()?.passed ?? 0 }} / {{ overview()?.failed ?? 0 }}</div></div><div class="icon">🎯</div></div>
      }
      @if (auth.isEmployee()) {
        <div class="stat-card" style="border-left:4px solid #3b82f6"><div><div class="label">Тестів пройдено</div><div class="value">{{ myResults().length }}</div></div><div class="icon">📝</div></div>
        <div class="stat-card" style="border-left:4px solid #10b981"><div><div class="label">Середній бал</div><div class="value">{{ myAvg() }}%</div></div><div class="icon">📊</div></div>
        <div class="stat-card" style="border-left:4px solid #f59e0b"><div><div class="label">Склав / Ні</div><div class="value">{{ myPassed() }} / {{ myResults().length - myPassed() }}</div></div><div class="icon">🎯</div></div>
      }
    </div>

    @if (auth.isAdmin() || auth.isManager()) {
      <div class="two-col">
        <div class="card">
          <h3 class="card-title">Останні результати</h3>
          @for (r of recentResults(); track r.id) {
            <a [routerLink]="['/results', r.id]" class="result-row">
              <div>
                <div style="font-weight:600;font-size:13px">{{ r.userName }}</div>
                <div style="font-size:11px;color:#94a3b8">{{ r.testTitle }} · {{ r.completedAt | date:'dd.MM.yyyy' }}</div>
              </div>
              <span class="badge" [class]="r.passed ? 'badge-success' : 'badge-danger'">{{ r.score }}%</span>
            </a>
          } @empty {
            <p class="empty-text">Ще немає результатів</p>
          }
        </div>
        <div class="card">
          <h3 class="card-title">Швидкі дії</h3>
          @if (auth.isAdmin()) {
            <a routerLink="/tests/create" class="action-btn">➕ Створити тест</a>
            <a routerLink="/questions" class="action-btn">📚 Банк питань</a>
            <a routerLink="/users" class="action-btn">👥 Користувачі</a>
            <a routerLink="/analytics" class="action-btn">📊 Аналітика</a>
          }
          @if (auth.isManager()) {
            <a routerLink="/analytics" class="action-btn">📊 Аналітика команди</a>
          }
        </div>
      </div>
    }

    @if (auth.isEmployee()) {
      <div class="card" style="margin-top:24px">
        <h3 class="card-title">Швидкі дії</h3>
        <a routerLink="/mytests" class="action-btn">📝 Доступні тести</a>
        <a routerLink="/myresults" class="action-btn">📊 Мої результати</a>
      </div>
    }
  `,
  styles: [`
    .card-title {
      margin: 0 0 12px; font-size: 13px; font-weight: 600;
      color: #475569; text-transform: uppercase; letter-spacing: .5px;
    }
    .empty-text { color: #94a3b8; font-size: 13px; }
    .action-btn {
      display: flex; align-items: center; gap: 8px; width: 100%;
      padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; cursor: pointer; font-size: 13px; color: #334155;
      margin-bottom: 8px; text-decoration: none; transition: background .15s;
    }
    .action-btn:hover { background: #f1f5f9; }
    .btn-sm {
      padding: 6px 14px; background: #3b82f6; color: #fff;
      border-radius: 6px; font-size: 12px; font-weight: 600;
      text-decoration: none;
    }
  `]
})
export class DashboardComponent implements OnInit {
  tests = signal<Test[]>([]);
  recentResults = signal<TestResult[]>([]);
  myResults = signal<TestResult[]>([]);
  overview = signal<OverviewAnalytics | null>(null);
  myAvg = signal(0);
  myPassed = signal(0);

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.api.getTests().subscribe(t => this.tests.set(t));

    if (this.auth.isAdmin() || this.auth.isManager()) {
      this.api.getOverview().subscribe(o => this.overview.set(o));
      this.api.getResults({ pageSize: 6 }).subscribe(r => this.recentResults.set(r.results));
    }

    if (this.auth.isEmployee()) {
      this.api.getResults({ userId: this.auth.user()!.id, pageSize: 10 }).subscribe(r => {
        this.myResults.set(r.results);
        const res = r.results;
        if (res.length > 0) {
          this.myAvg.set(Math.round(res.reduce((s, x) => s + x.score, 0) / res.length));
          this.myPassed.set(res.filter(x => x.passed).length);
        }
      });
    }
  }
}
