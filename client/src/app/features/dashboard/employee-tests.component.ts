import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { Test } from '@core/models/models';

@Component({
  selector: 'app-employee-tests',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1 class="page-title">Доступні тести</h1>

    @for (t of tests(); track t.id) {
      <div class="card" style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:15px">{{ t.title }}</h3>
          @if (t.description) { <p style="margin:4px 0 0;font-size:13px;color:#64748b">{{ t.description }}</p> }
          <div style="font-size:12px;color:#94a3b8;margin-top:6px">
            📝 {{ t.questionIds.length }} питань · ⏱ {{ t.timeLimitMinutes }} хв · 🎯 {{ t.passingScore }}%
            @if (t.deadline) { · ⏰ до {{ t.deadline | date:'dd.MM.yyyy HH:mm' }} }
            @if (t.maxAttempts > 0) { · 🔄 макс. {{ t.maxAttempts }} спроб }
          </div>
          @if (isOverdue(t)) { <div style="font-size:11px;color:#ef4444;font-weight:600;margin-top:4px">⚠ Дедлайн минув!</div> }
        </div>
        @if (!isOverdue(t)) {
          <a [routerLink]="['/take', t.id]" class="btn-primary">▶ Почати</a>
        } @else {
          <span class="badge badge-danger">Прострочено</span>
        }
      </div>
    } @empty {
      <div class="empty-state"><div style="font-size:48px;margin-bottom:12px">📝</div><p>Вам ще не призначено жодного тесту</p></div>
    }
  `,
  styles: [`
    .btn-primary { display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;text-decoration:none }
  `]
})
export class EmployeeTestsComponent implements OnInit {
  tests = signal<Test[]>([]);
  constructor(private api: ApiService) {}
  ngOnInit() { this.api.getTests().subscribe(t => this.tests.set(t)); }

  isOverdue(t: Test): boolean {
    return !!t.deadline && new Date(t.deadline) < new Date();
  }
}
