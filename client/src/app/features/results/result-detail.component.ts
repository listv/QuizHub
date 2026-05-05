import { Component, OnInit, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { TestResult } from '@core/models/models';
import { SecureImagePipe } from '@shared/components/secure-image.pipe';
import { LightboxComponent } from '@shared/components/lightbox.component';

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [CommonModule, SecureImagePipe, LightboxComponent],
  template: `
    <button class="back-btn" (click)="router.navigate(['/dashboard'])">← Назад</button>

    @if (result()) {
      <div class="card" [style.border-left]="'4px solid ' + (result()!.passed ? '#16a34a' : '#dc2626')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin:0;font-size:18px">{{ result()!.testTitle }}</h2>
            <div style="font-size:13px;color:#64748b;margin-top:4px">
              {{ result()!.userName }} · {{ result()!.completedAt | date:'dd.MM.yyyy HH:mm' }}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:32px;font-weight:700" [style.color]="result()!.passed ? '#16a34a' : '#dc2626'">
              {{ result()!.score }}%
            </div>
            <div style="font-size:12px;color:#94a3b8">{{ result()!.correctAnswers }}/{{ result()!.totalQuestions }}</div>
          </div>
        </div>
      </div>

      <h3 style="margin:24px 0 12px;font-size:16px">Відповіді</h3>

      @for (a of result()!.answers ?? []; track a.questionId; let i = $index) {
        <div class="card" [style.border-left]="'3px solid ' + (a.isCorrect ? '#16a34a' : '#ef4444')">
          <div style="display:flex;justify-content:space-between">
            <div style="font-size:14px;font-weight:500">{{ i + 1 }}. {{ a.questionText }}</div>
            <span style="font-size:18px">{{ a.isCorrect ? '✅' : '❌' }}</span>
          </div>

          @if (a.imageUrl) {
            <div style="margin-top:8px">
              <img [src]="a.imageUrl | secureImage | async" alt="" style="max-width:100%;max-height:200px;border-radius:6px;border:1px solid #e2e8f0;cursor:zoom-in" (click)="openImage($event)">
            </div>
          }

          @if (a.questionType !== 'Open' && a.options) {
            <div style="margin-top:8px;font-size:13px">
              @for (o of a.options; track o.id; let oi = $index) {
                <div style="padding:4px 8px;margin-top:2px;border-radius:4px"
                     [style.background]="o.isCorrect ? '#f0fdf4' : isChosen(a, oi) ? '#fef2f2' : 'transparent'"
                     [style.color]="o.isCorrect ? '#166534' : isChosen(a, oi) ? '#991b1b' : '#64748b'">
                  {{ o.isCorrect ? '✓' : isChosen(a, oi) ? '✗' : '○' }} {{ o.text }}
                </div>
              }
            </div>
          }

          @if (a.explanation && !a.isCorrect) {
            <div style="margin-top:8px;padding:8px 12px;background:#fefce8;border-radius:6px;font-size:12px;color:#854d0e">
              💡 {{ a.explanation }}
            </div>
          }
        </div>
      }
    }

    <app-lightbox />
  `,
  styles: [`
    .back-btn { background:none;border:none;color:#64748b;cursor:pointer;font-size:13px;margin-bottom:12px;padding:0 }
  `]
})
export class ResultDetailComponent implements OnInit {
  @Input() id!: string;
  result = signal<TestResult | null>(null);

  @ViewChild(LightboxComponent) lightbox!: LightboxComponent;

  constructor(public router: Router, private api: ApiService) {}

  ngOnInit() {
    this.api.getResult(this.id).subscribe(r => this.result.set(r));
  }

  isChosen(answer: any, optIndex: number): boolean {
    if (!answer.answerData) return false;
    if (answer.questionType === 'Single') return answer.answerData === optIndex.toString();
    try { return JSON.parse(answer.answerData).includes(optIndex); } catch { return false; }
  }

  openImage(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img?.src) this.lightbox.open(img.src);
  }
}
