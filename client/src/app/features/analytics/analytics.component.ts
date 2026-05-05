import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { OverviewAnalytics, EmployeeAnalytics, DifficultQuestion, OverdueTest } from '@core/models/models';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1 class="page-title">{{ auth.isManager() ? 'Аналітика — ' + auth.user()?.department : 'Аналітика' }}</h1>

    <div style="display:flex;gap:8px;margin-bottom:20px">
      @for (t of tabs; track t.id) {
        <button class="chip" [class.active]="tab() === t.id" (click)="tab.set(t.id)">
          {{ t.label }}
          @if (t.id === 'overdue' && overdueTests().length > 0) {
            <span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">{{ overdueCount() }}</span>
          }
        </button>
      }
    </div>

    <!-- Overview -->
    @if (tab() === 'overview' && overview()) {
      <div class="stats-grid">
        <div class="stat-card" style="border-left:4px solid #3b82f6"><div><div class="label">Спроб</div><div class="value">{{ overview()!.totalAttempts }}</div></div><div class="icon">📝</div></div>
        <div class="stat-card" style="border-left:4px solid #10b981"><div><div class="label">Склали</div><div class="value">{{ overview()!.passed }}</div></div><div class="icon">✅</div></div>
        <div class="stat-card" style="border-left:4px solid #ef4444"><div><div class="label">Не склали</div><div class="value">{{ overview()!.failed }}</div></div><div class="icon">❌</div></div>
        <div class="stat-card" style="border-left:4px solid #f59e0b"><div><div class="label">Середній</div><div class="value">{{ overview()!.averageScore }}%</div></div><div class="icon">📊</div></div>
      </div>
      @if (overview()!.totalAttempts > 0) {
        <div class="card"><h3 class="card-title">Розподіл</h3>
          <div style="display:flex;height:32px;border-radius:8px;overflow:hidden">
            <div [style.width.%]="overview()!.passed / overview()!.totalAttempts * 100" style="background:#22c55e;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600">
              {{ overview()!.passed > 0 ? (overview()!.passed / overview()!.totalAttempts * 100 | number:'1.0-0') + '% склали' : '' }}
            </div>
            <div style="flex:1;background:#ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600">
              {{ overview()!.failed > 0 ? (overview()!.failed / overview()!.totalAttempts * 100 | number:'1.0-0') + '% не склали' : '' }}
            </div>
          </div>
        </div>
      }
    }

    <!-- Employees -->
    @if (tab() === 'employees') {
      <div class="card"><h3 class="card-title">Рейтинг співробітників</h3>
        @for (e of employees(); track e.userId; let i = $index) {
          <a [routerLink]="['/employees', e.userId]" class="result-row">
            <div style="display:flex;align-items:center;gap:12px;flex:1">
              <span style="font-size:14px;font-weight:700;min-width:24px" [style.color]="i < 3 ? '#f59e0b' : '#94a3b8'">#{{ i + 1 }}</span>
              <div class="avatar">{{ e.fullName.charAt(0) }}</div>
              <div style="flex:1">
                <div style="font-weight:500;font-size:14px">{{ e.fullName }}</div>
                <div style="font-size:11px;color:#94a3b8">{{ e.department }} · {{ e.attempts }} спроб · ✓{{ e.passed }} ✗{{ e.failed }}</div>
                @if (e.averageScore != null) {
                  <div class="progress-bar" style="max-width:200px;margin-top:4px"><div class="fill" [style.width.%]="e.averageScore" [style.background]="(e.averageScore ?? 0) >= 70 ? '#22c55e' : '#ef4444'"></div></div>
                }
              </div>
            </div>
            <span class="badge" [class]="(e.averageScore ?? 0) >= 70 ? 'badge-success' : 'badge-danger'" style="font-size:14px;font-weight:700">
              {{ e.averageScore != null ? (e.averageScore | number:'1.0-0') + '%' : '—' }}
            </span>
          </a>
        }
      </div>
    }

    <!-- Hard questions -->
    @if (tab() === 'hard') {
      <div class="card"><h3 class="card-title">Найскладніші питання</h3>
        @for (h of hardQuestions(); track h.questionId) {
          <div class="result-row" [style.border-left]="'3px solid ' + (h.errorRate > 60 ? '#ef4444' : h.errorRate > 40 ? '#f59e0b' : '#3b82f6')">
            <div style="flex:1"><div style="font-size:13px;font-weight:500">{{ h.text }}</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">{{ h.category || '' }} · {{ h.wrongAnswers }} помилок з {{ h.totalAttempts }}</div></div>
            <span class="badge" [class]="h.errorRate > 60 ? 'badge-danger' : h.errorRate > 40 ? 'badge-warning' : 'badge-info'" style="font-weight:700">{{ h.errorRate }}%</span>
          </div>
        } @empty { <p style="color:#94a3b8;font-size:13px">Недостатньо даних</p> }
      </div>
    }

    <!-- Overdue -->
    @if (tab() === 'overdue') {
      @for (test of overdueTests(); track test.testId) {
        <div class="card" style="border-left:4px solid #ef4444">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <h3 style="margin:0;font-size:15px">{{ test.testTitle }}</h3>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px">
                Дедлайн: <span style="color:#ef4444;font-weight:600">{{ test.deadline | date:'dd.MM.yyyy HH:mm' }}</span>
              </div>
            </div>
            <span class="badge badge-danger" style="font-size:14px">{{ test.employees.length }} не пройшли</span>
          </div>

          @for (emp of test.employees; track emp.userId) {
            <a [routerLink]="['/employees', emp.userId]" class="result-row" style="border-left:none">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="avatar" style="width:28px;height:28px;font-size:11px">{{ emp.fullName.charAt(0) }}</div>
                <div>
                  <div style="font-size:13px;font-weight:500">{{ emp.fullName }}</div>
                  <div style="font-size:11px;color:#94a3b8">{{ emp.department }}</div>
                </div>
              </div>
              <span class="badge badge-danger" style="font-size:11px">Не пройшов</span>
            </a>
          }
        </div>
      } @empty {
        <div class="card"><p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px">Прострочених тестів немає 🎉</p></div>
      }
    }
  `,
  styles: [`
    .card-title { margin:0 0 12px;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px }
    .chip { padding:6px 14px;border:1px solid #e2e8f0;border-radius:20px;background:#fff;font-size:12px;cursor:pointer;font-weight:500;color:#64748b;display:inline-flex;align-items:center }
    .chip.active { background:#3b82f6;color:#fff;border-color:#3b82f6 }
  `]
})
export class AnalyticsComponent implements OnInit {
  tabs = [
    { id: 'overview', label: 'Огляд' },
    { id: 'employees', label: 'Співробітники' },
    { id: 'hard', label: 'Складні питання' },
    { id: 'overdue', label: 'Прострочені' }
  ];
  tab = signal('overview');
  overview = signal<OverviewAnalytics | null>(null);
  employees = signal<EmployeeAnalytics[]>([]);
  hardQuestions = signal<DifficultQuestion[]>([]);
  overdueTests = signal<OverdueTest[]>([]);

  overdueCount = () => this.overdueTests().reduce((s, t) => s + t.employees.length, 0);

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.api.getOverview().subscribe(o => this.overview.set(o));
    this.api.getEmployeeStats().subscribe(e => this.employees.set(e));
    this.api.getDifficultQuestions().subscribe(q => this.hardQuestions.set(q));
    this.api.getOverdueTests().subscribe(t => this.overdueTests.set(t));
  }
}
