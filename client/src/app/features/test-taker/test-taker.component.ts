import { Component, OnInit, OnDestroy, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/services/auth.service';
import { TestQuestionsResponse, TestQuestionItem, TestResult } from '@core/models/models';
import { SecureImagePipe } from '@shared/components/secure-image.pipe';
import { LightboxComponent } from '@shared/components/lightbox.component';

@Component({
  selector: 'app-test-taker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SecureImagePipe, LightboxComponent],
  template: `
    <!-- Pre-start screen -->
    @if (!started() && !result()) {
      <div class="center-box">
        <button class="back-btn" (click)="router.navigate(['/dashboard'])">← Назад</button>
        @if (testData()) {
          <div class="card">
            <h2 style="margin:0 0 8px">{{ testData()!.title }}</h2>
            @if (testData()!.description) { <p style="color:#64748b;margin-bottom:16px">{{ testData()!.description }}</p> }
            <div style="font-size:13px;color:#94a3b8;margin-bottom:16px">
              📝 {{ testData()!.questions.length }} питань · ⏱ {{ testData()!.timeLimitMinutes }} хв · 🎯 {{ testData()!.passingScore }}%
            </div>
            <div class="info-box">🛡️ Ви: <strong>{{ auth.user()?.fullName }}</strong></div>
            <button class="btn-primary full" (click)="start()">▶ Почати тест</button>
          </div>
        }
      </div>
    }

    <!-- Result screen -->
    @if (result()) {
      <div class="center-box" style="text-align:center">
        <div style="font-size:64px;margin-bottom:16px">{{ result()!.passed ? '🎉' : '😔' }}</div>
        <h2 style="margin:0 0 8px;color:#1e293b">{{ result()!.passed ? 'Тест складено!' : 'Тест не складено' }}</h2>
        <div style="font-size:48px;font-weight:700;margin:16px 0" [style.color]="result()!.passed ? '#16a34a' : '#dc2626'">
          {{ result()!.score }}%
        </div>
        <p style="color:#64748b">Поріг: {{ testData()!.passingScore }}%</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:24px">
          <a [routerLink]="['/results', result()!.id]" class="btn-secondary">Деталі</a>
          <a routerLink="/dashboard" class="btn-primary">На головну</a>
        </div>
      </div>
    }

    <!-- Active test -->
    @if (started() && !result() && currentQuestion()) {
      <div class="center-box" style="max-width:640px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="font-size:13px;color:#64748b">{{ currentIndex() + 1 }} / {{ questions().length }}</span>
          @if (timeLeft() !== null) {
            <span class="badge" [class]="timeLeft()! < 60 ? 'badge-danger' : 'badge-info'" style="font-variant-numeric:tabular-nums">
              ⏱ {{ formatTime(timeLeft()!) }}
            </span>
          }
        </div>

        <div class="progress-bar" style="margin-bottom:20px">
          <div class="fill" [style.width.%]="(currentIndex() + 1) / questions().length * 100" style="background:#3b82f6"></div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 16px;font-size:16px">{{ currentQuestion()!.text }}</h3>

          @if (currentQuestion()!.imageUrl) {
            <div style="margin-bottom:16px">
              <img [src]="currentQuestion()!.imageUrl | secureImage | async" alt="" style="max-width:100%;max-height:300px;border-radius:8px;border:1px solid #e2e8f0;cursor:zoom-in" (click)="openImage($event)">
            </div>
          }

          @if (currentQuestion()!.type === 'Single') {
            @for (opt of currentQuestion()!.options ?? []; track opt.id; let i = $index) {
              <label class="option" [class.selected]="answers[currentQuestion()!.id] === i.toString()">
                <input type="radio" [name]="'q-' + currentQuestion()!.id"
                       [checked]="answers[currentQuestion()!.id] === i.toString()"
                       (change)="selectSingle(i)" style="display:none">
                <span class="radio" [class.active]="answers[currentQuestion()!.id] === i.toString()">
                  {{ answers[currentQuestion()!.id] === i.toString() ? '●' : '' }}
                </span>
                {{ opt.text }}
              </label>
            }
          }

          @if (currentQuestion()!.type === 'Multi') {
            @for (opt of currentQuestion()!.options ?? []; track opt.id; let i = $index) {
              <label class="option" [class.selected]="isMultiSelected(i)">
                <input type="checkbox" [checked]="isMultiSelected(i)"
                       (change)="toggleMulti(i)" style="display:none">
                <span class="chk" [class.active]="isMultiSelected(i)">
                  {{ isMultiSelected(i) ? '✓' : '' }}
                </span>
                {{ opt.text }}
              </label>
            }
          }

          @if (currentQuestion()!.type === 'Open') {
            <textarea class="inp" rows="4" [ngModel]="answers[currentQuestion()!.id] ?? ''"
                      (ngModelChange)="answers[currentQuestion()!.id] = $event"
                      placeholder="Ваша відповідь..."></textarea>
          }
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:16px">
          <button class="btn-secondary" [disabled]="currentIndex() === 0" (click)="prev()">← Назад</button>
          @if (currentIndex() < questions().length - 1) {
            <button class="btn-primary" (click)="next()">Далі →</button>
          } @else {
            <button class="btn-primary" style="background:#16a34a" (click)="finish()">Завершити</button>
          }
        </div>
      </div>
    }

    <app-lightbox />
  `,
  styles: [`
    .center-box { max-width:500px;margin:40px auto }
    .back-btn { background:none;border:none;color:#64748b;cursor:pointer;font-size:13px;margin-bottom:12px;padding:0 }
    .info-box { padding:12px 16px;background:#f0f9ff;border-radius:8px;margin-bottom:16px;font-size:13px;color:#0369a1 }
    .btn-primary { display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 18px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;text-decoration:none }
    .btn-primary:disabled { opacity:.5 }
    .btn-secondary { display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;text-decoration:none }
    .btn-secondary:disabled { opacity:.4 }
    .full { width:100%;padding:14px;justify-content:center }
    .option { display:flex;align-items:center;gap:10px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;margin-bottom:8px;font-size:14px;transition:all .15s }
    .option.selected { border-color:#3b82f6;background:#eff6ff }
    .radio { width:20px;height:20px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;color:#3b82f6 }
    .radio.active { border-color:#3b82f6;background:#eff6ff }
    .chk { width:20px;height:20px;border-radius:4px;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;color:#fff }
    .chk.active { border-color:#3b82f6;background:#3b82f6 }
    .inp { width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;font-family:inherit;resize:vertical }
  `]
})
export class TestTakerComponent implements OnInit, OnDestroy {
  @Input() id!: string;

  testData = signal<TestQuestionsResponse | null>(null);
  questions = signal<TestQuestionItem[]>([]);
  started = signal(false);
  currentIndex = signal(0);
  timeLeft = signal<number | null>(null);
  result = signal<TestResult | null>(null);
  answers: Record<string, string> = {};

  private timer: any;

  @ViewChild(LightboxComponent) lightbox!: LightboxComponent;

  constructor(public router: Router, public auth: AuthService, private api: ApiService) {}

  currentQuestion = () => this.questions()[this.currentIndex()] ?? null;

  ngOnInit() {
    this.api.getTestQuestions(this.id).subscribe(d => {
      this.testData.set(d);
      this.questions.set(d.questions);
    });
  }

  ngOnDestroy() { clearInterval(this.timer); }

  start() {
    this.started.set(true);
    const tl = this.testData()!.timeLimitMinutes;
    if (tl > 0) {
      this.timeLeft.set(tl * 60);
      this.timer = setInterval(() => {
        const t = this.timeLeft()!;
        if (t <= 1) { clearInterval(this.timer); this.finish(); }
        else this.timeLeft.set(t - 1);
      }, 1000);
    }
  }

  selectSingle(i: number) { this.answers[this.currentQuestion()!.id] = i.toString(); }

  isMultiSelected(i: number): boolean {
    try { const arr = JSON.parse(this.answers[this.currentQuestion()!.id] || '[]'); return arr.includes(i); } catch { return false; }
  }

  toggleMulti(i: number) {
    const qId = this.currentQuestion()!.id;
    let arr: number[] = [];
    try { arr = JSON.parse(this.answers[qId] || '[]'); } catch {}
    if (arr.includes(i)) arr = arr.filter(x => x !== i); else arr.push(i);
    this.answers[qId] = JSON.stringify(arr);
  }

  prev() { if (this.currentIndex() > 0) this.currentIndex.update(i => i - 1); }
  next() { if (this.currentIndex() < this.questions().length - 1) this.currentIndex.update(i => i + 1); }

  finish() {
    clearInterval(this.timer);
    const req = {
      testId: this.id,
      answers: this.questions().map(q => ({ questionId: q.id, answerData: this.answers[q.id] ?? undefined }))
    };
    this.api.submitTest(req).subscribe(r => this.result.set(r));
  }

  formatTime(s: number): string {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  openImage(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img?.src) this.lightbox.open(img.src);
  }
}
