import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { TestResult } from '@core/models/models';

@Component({
  selector: 'app-employee-results',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1 class="page-title">Мої результати</h1>

    @for (r of results(); track r.id) {
      <a [routerLink]="['/results', r.id]" class="card result-card" [style.border-left]="'4px solid ' + (r.passed ? '#16a34a' : '#ef4444')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:14px">{{ r.testTitle }}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px">
              {{ r.completedAt | date:'dd.MM.yyyy HH:mm' }} · {{ r.correctAnswers }}/{{ r.totalQuestions }} правильних
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:700" [style.color]="r.passed ? '#16a34a' : '#dc2626'">{{ r.score }}%</div>
            <span style="font-size:11px" [style.color]="r.passed ? '#16a34a' : '#dc2626'">{{ r.passed ? 'Складено ✓' : 'Не складено ✗' }}</span>
          </div>
        </div>
      </a>
    } @empty {
      <div class="empty-state"><div style="font-size:48px;margin-bottom:12px">📊</div><p>Ви ще не проходили тестів</p></div>
    }
  `,
  styles: [`
    .result-card { display:block;text-decoration:none;color:inherit;cursor:pointer }
    .result-card:hover { box-shadow:0 2px 8px rgba(0,0,0,.08) }
  `]
})
export class EmployeeResultsComponent implements OnInit {
  results = signal<TestResult[]>([]);
  constructor(private api: ApiService, private auth: AuthService) {}
  ngOnInit() {
    this.api.getResults({ userId: this.auth.user()!.id, pageSize: 50 }).subscribe(r => this.results.set(r.results));
  }
}
