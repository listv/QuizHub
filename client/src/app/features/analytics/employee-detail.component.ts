import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <button class="back-btn" (click)="router.navigate(['/analytics'])">← Назад</button>

    @if (data()) {
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
        <div class="avatar" style="width:56px;height:56px;font-size:24px">{{ data().user.fullName.charAt(0) }}</div>
        <div>
          <h1 class="page-title" style="margin-bottom:2px">{{ data().user.fullName }}</h1>
          <span style="font-size:14px;color:#94a3b8">{{ data().user.department }}</span>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <h3 class="card-title">Історія тестів</h3>
          @for (r of data().results; track r.id) {
            <a [routerLink]="['/results', r.id]" class="result-row">
              <div>
                <div style="font-weight:500;font-size:13px">{{ r.testTitle }}</div>
                <div style="font-size:11px;color:#94a3b8">{{ r.completedAt | date:'dd.MM.yyyy' }}</div>
              </div>
              <span class="badge" [class]="r.passed ? 'badge-success' : 'badge-danger'">{{ r.score }}%</span>
            </a>
          } @empty {
            <p style="color:#94a3b8;font-size:13px">Немає результатів</p>
          }
        </div>

        <div class="card">
          <h3 class="card-title">Складні питання</h3>
          @for (d of data().difficultQuestions; track d.questionId) {
            <div class="result-row" style="border-left:3px solid #ef4444">
              <div style="font-size:13px">{{ d.text }}</div>
              <span class="badge badge-danger">{{ d.count }}×</span>
            </div>
          } @empty {
            <p style="color:#94a3b8;font-size:13px">Недостатньо даних</p>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .back-btn { background:none;border:none;color:#64748b;cursor:pointer;font-size:13px;margin-bottom:12px;padding:0 }
    .card-title { margin:0 0 12px;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px }
  `]
})
export class EmployeeDetailComponent implements OnInit {
  @Input() id!: string;
  data = signal<any>(null);

  constructor(public router: Router, private api: ApiService) {}

  ngOnInit() {
    this.api.getEmployeeDetail(this.id).subscribe(d => this.data.set(d));
  }
}
