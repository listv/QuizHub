import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { Test } from '@core/models/models';

@Component({
    selector: 'app-tests-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="page-header">
      <h1 class="page-title">Тести</h1>
      <div style="display:flex;align-items:center;gap:12px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#64748b">
          <input type="checkbox" [checked]="showInactive()" (change)="showInactive.set(!showInactive())">
          Показувати деактивовані
        </label>
        <a routerLink="/tests/create" class="btn-primary">➕ Створити</a>
      </div>
    </div>

    @for (t of filteredTests(); track t.id) {
      <div class="card" [style.opacity]="t.isActive ? '1' : '0.6'"
           [style.border-left]="!t.isActive ? '4px solid #94a3b8' : isOverdue(t) ? '4px solid #ef4444' : 'none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px">
              <h3 style="margin:0;font-size:16px">{{ t.title }}</h3>
              @if (!t.isActive) {
                <span style="font-size:11px;background:#e2e8f0;color:#64748b;padding:2px 8px;border-radius:10px;font-weight:600">деактивовано</span>
              }
              @if (isOverdue(t)) {
                <span style="font-size:11px;background:#fee2e2;color:#ef4444;padding:2px 8px;border-radius:10px;font-weight:600">прострочено</span>
              }
            </div>
            @if (t.description) { <p style="margin:4px 0 0;font-size:13px;color:#64748b">{{ t.description }}</p> }
            <div style="display:flex;gap:12px;margin-top:8px;font-size:12px;color:#94a3b8;flex-wrap:wrap">
              <span>📝 {{ t.questionIds.length }} питань</span>
              <span>⏱ {{ t.timeLimitMinutes }} хв</span>
              <span>🎯 {{ t.passingScore }}%</span>
              <span>👥 {{ t.attemptCount }} спроб</span>
              <span style="color:#16a34a">✓ {{ t.passedCount }}</span>
              @if (t.maxAttempts > 0) { <span>🔄 макс. {{ t.maxAttempts }}</span> }
              @if (t.deadline) { <span [style.color]="isOverdue(t) ? '#ef4444' : '#94a3b8'">⏰ {{ t.deadline | date:'dd.MM.yyyy HH:mm' }}</span> }
            </div>
            @if (t.assignments && t.assignments.length > 0) {
              <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
                @for (a of t.assignments; track a.id) {
                  @if (a.department) { <span class="assign-tag dept">🏢 {{ a.department }}</span> }
                  @if (a.userName) { <span class="assign-tag user">👤 {{ a.userName }}</span> }
                }
              </div>
            } @else if (t.isActive) {
              <div style="font-size:11px;color:#f59e0b;margin-top:6px">⚠ Не призначено нікому</div>
            }
          </div>

          <div style="display:flex;gap:4px;margin-left:12px">
            @if (t.isActive) {
              <a [routerLink]="['/tests', t.id, 'edit']" class="icon-btn" title="Редагувати">✏️</a>
              <button class="icon-btn" title="Деактивувати" (click)="deleteTest(t.id)">🗑️</button>
            } @else {
              <button class="icon-btn" title="Відновити" (click)="restoreTest(t.id)">♻️</button>
            }
            <button class="icon-btn" title="Дублювати" (click)="duplicateTest(t.id)">📋</button>
          </div>
        </div>
      </div>
    } @empty {
      <div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">📝</div>
        <p>Тестів ще немає</p>
      </div>
    }
  `,
    styles: [`
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;
      background: #3b82f6; color: #fff; border: none; border-radius: 8px;
      cursor: pointer; font-size: 13px; font-weight: 600; text-decoration: none;
    }
    .icon-btn {
      background: none; border: none; cursor: pointer; padding: 6px;
      border-radius: 6px; font-size: 16px;
    }
    .icon-btn:hover { background: #f1f5f9; }
    .assign-tag { font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600 }
    .assign-tag.dept { background:#e0e7ff;color:#3730a3 }
    .assign-tag.user { background:#dcfce7;color:#166534 }
  `]
})
export class TestsListComponent implements OnInit {
    tests = signal<Test[]>([]);
    showInactive = signal(false);

    filteredTests = () => this.showInactive()
        ? this.tests()
        : this.tests().filter(t => t.isActive);

    constructor(private api: ApiService, private notify: NotificationService) { }

    ngOnInit() { this.load(); }

    load() { this.api.getTests().subscribe(t => this.tests.set(t)); }

    deleteTest(id: string) {
        if (!confirm('Деактивувати цей тест?')) return;
        this.api.deleteTest(id).subscribe(() => {
            this.load();
            this.notify.success('Тест деактивовано');
        });
    }

    restoreTest(id: string) {
        this.api.restoreTest(id).subscribe(() => {
            this.load();
            this.notify.success('Тест відновлено');
        });
    }

    duplicateTest(id: string) {
        this.api.duplicateTest(id).subscribe(res => {
            this.load();
            this.notify.success(`Створено копію: "${res.title}"`);
        });
    }

    isOverdue(t: Test): boolean {
        return !!t.deadline && new Date(t.deadline) < new Date();
    }
}
