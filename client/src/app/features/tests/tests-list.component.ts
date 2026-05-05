import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { Test } from '@core/models/models';

@Component({
  selector: 'app-tests-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="page-header">
      <h1 class="page-title">Тести</h1>
      <a routerLink="/tests/create" class="btn-primary">➕ Створити</a>
    </div>

    @for (t of tests(); track t.id) {
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h3 style="margin:0;font-size:16px">{{ t.title }}</h3>
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
            } @else {
              <div style="font-size:11px;color:#f59e0b;margin-top:6px">⚠ Не призначено нікому</div>
            }
          </div>
          <div style="display:flex;gap:4px">
            <a [routerLink]="['/tests', t.id, 'edit']" class="icon-btn" title="Редагувати">✏️</a>
            <button class="icon-btn" title="Видалити" (click)="deleteTest(t.id)">🗑️</button>
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
    .assign-tag { font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600 }
    .assign-tag.dept { background:#e0e7ff;color:#3730a3 }
    .assign-tag.user { background:#dcfce7;color:#166534 }
  `]
})
export class TestsListComponent implements OnInit {
  tests = signal<Test[]>([]);

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() { this.api.getTests().subscribe(t => this.tests.set(t)); }

  deleteTest(id: string) {
    if (!confirm('Видалити цей тест?')) return;
    this.api.deleteTest(id).subscribe(() => this.load());
  }

  isOverdue(t: Test): boolean {
    return !!t.deadline && new Date(t.deadline) < new Date();
  }
}
