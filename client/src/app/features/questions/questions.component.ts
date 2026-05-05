import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { Question } from '@core/models/models';
import { SecureImagePipe } from '@shared/components/secure-image.pipe';
import { LightboxComponent } from '@shared/components/lightbox.component';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, SecureImagePipe, LightboxComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">Банк питань</h1>
      <button class="btn-primary" (click)="startNew()">➕ Додати</button>
    </div>

    @if (categories().length) {
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="chip" [class.active]="!filter()" (click)="filter.set('')">Всі ({{ questions().length }})</button>
        @for (c of categories(); track c) {
          <button class="chip" [class.active]="filter() === c" (click)="filter.set(c)">{{ c }}</button>
        }
      </div>
    }

    @for (q of filtered(); track q.id) {
      <div class="q-card">
        <div style="flex:1">
          <div style="display:flex;gap:8px;margin-bottom:6px">
            <span class="badge badge-purple">{{ typeLabel(q.type) }}</span>
            @if (q.category) { <span class="badge badge-info">{{ q.category }}</span> }
          </div>
          <div style="font-size:14px;font-weight:500;color:#1e293b">{{ q.text }}</div>
          @if (q.imageUrl) {
            <img [src]="q.imageUrl | secureImage | async" alt="" style="max-width:200px;max-height:120px;border-radius:6px;margin-top:8px;border:1px solid #e2e8f0;cursor:zoom-in" (click)="openImage($event)">
          }
          @if (q.type !== 'Open') {
            <div style="margin-top:6px;font-size:12px">
              @for (o of q.options; track o.id) {
                <span style="margin-right:12px" [style.color]="o.isCorrect ? '#16a34a' : '#94a3b8'">
                  {{ o.isCorrect ? '✓' : '○' }} {{ o.text }}
                </span>
              }
            </div>
          }
        </div>
        <div style="display:flex;gap:4px">
          <button class="icon-btn" (click)="startEdit(q)">✏️</button>
          <button class="icon-btn" (click)="deleteQ(q.id)">🗑️</button>
        </div>
      </div>
    } @empty {
      <div class="empty-state"><div style="font-size:48px;margin-bottom:12px">📚</div><p>Порожньо</p></div>
    }

    <!-- Modal -->
    @if (editing()) {
      <div class="modal-overlay" (click)="editing.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 16px">{{ editId ? 'Редагування' : 'Нове питання' }}</h3>

          <label class="lbl">Текст *</label>
          <textarea class="inp" [(ngModel)]="form.text" rows="3"></textarea>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label class="lbl">Тип</label>
              <select class="inp" [(ngModel)]="form.type">
                <option value="Single">Одна відповідь</option>
                <option value="Multi">Декілька</option>
                <option value="Open">Відкрита</option>
              </select>
            </div>
            <div>
              <label class="lbl">Категорія</label>
              <input class="inp" [(ngModel)]="form.category">
            </div>
          </div>

          @if (form.type !== 'Open') {
            <label class="lbl">Варіанти</label>
            @for (opt of form.options; track $index; let i = $index) {
              <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
                <button class="correct-btn" [class.active]="opt.isCorrect" (click)="toggleCorrect(i)">
                  {{ opt.isCorrect ? '✓' : '' }}
                </button>
                <input class="inp" style="flex:1;margin-bottom:0" [(ngModel)]="opt.text" [placeholder]="'Варіант ' + (i+1)">
                @if (form.options.length > 2) {
                  <button class="icon-btn" (click)="form.options.splice(i, 1)">✕</button>
                }
              </div>
            }
            <button class="text-btn" (click)="form.options.push({text:'',isCorrect:false})">+ Варіант</button>
          }

          <label class="lbl">Пояснення</label>
          <textarea class="inp" [(ngModel)]="form.explanation" rows="2" placeholder="Чому ця відповідь правильна?"></textarea>

          <label class="lbl">Зображення</label>
          @if (imagePreview()) {
            <div style="position:relative;display:inline-block;margin-bottom:12px">
              @if (isServerUrl(imagePreview()!)) {
                <img [src]="imagePreview()! | secureImage | async" alt="" style="max-width:300px;max-height:180px;border-radius:8px;border:1px solid #e2e8f0">
              } @else {
                <img [src]="imagePreview()" alt="" style="max-width:300px;max-height:180px;border-radius:8px;border:1px solid #e2e8f0">
              }
              <button (click)="removeImage()" style="position:absolute;top:4px;right:4px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">✕</button>
            </div>
          }
          <div>
            <input type="file" accept="image/*" (change)="onImageSelected($event)" style="font-size:13px" #fileInput>
          </div>

          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button class="btn-secondary" (click)="editing.set(false)">Скасувати</button>
            <button class="btn-primary" (click)="save()">{{ uploading() ? 'Завантаження...' : 'Зберегти' }}</button>
          </div>
        </div>
      </div>
    }

    <app-lightbox />
  `,
  styles: [`
    .q-card { display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;background:#fff;border-radius:10px;margin-bottom:8px;box-shadow:0 1px 2px rgba(0,0,0,.04) }
    .chip { padding:6px 14px;border:1px solid #e2e8f0;border-radius:20px;background:#fff;font-size:12px;cursor:pointer;font-weight:500;color:#64748b }
    .chip.active { background:#3b82f6;color:#fff;border-color:#3b82f6 }
    .icon-btn { background:none;border:none;cursor:pointer;padding:6px;font-size:16px }
    .btn-primary { padding:10px 18px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .btn-secondary { padding:10px 18px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .text-btn { background:none;border:none;color:#3b82f6;cursor:pointer;font-size:13px;font-weight:600 }
    .modal-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000 }
    .modal { background:#fff;border-radius:16px;padding:28px;width:90%;max-width:560px;max-height:85vh;overflow-y:auto }
    .lbl { display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px }
    .inp { width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;font-family:inherit }
    .inp:focus { border-color:#3b82f6 }
    .correct-btn { width:28px;height:28px;border-radius:50%;border:2px solid #cbd5e1;background:#fff;cursor:pointer;font-size:14px;color:#16a34a;flex-shrink:0;display:flex;align-items:center;justify-content:center }
    .correct-btn.active { border-color:#16a34a;background:#f0fdf4 }
  `]
})
export class QuestionsComponent implements OnInit {
  questions = signal<Question[]>([]);
  categories = signal<string[]>([]);
  filter = signal('');
  editing = signal(false);
  uploading = signal(false);
  imagePreview = signal<string | null>(null);
  editId: string | null = null;
  form = this.emptyForm();
  selectedFile: File | null = null;

  @ViewChild(LightboxComponent) lightbox!: LightboxComponent;

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getQuestions().subscribe(q => this.questions.set(q));
    this.api.getCategories().subscribe(c => this.categories.set(c));
  }

  filtered = () => {
    const f = this.filter();
    return f ? this.questions().filter(q => q.category === f) : this.questions();
  };

  emptyForm() { return { text: '', type: 'Single' as string, category: '', explanation: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] }; }

  startNew() {
    this.form = this.emptyForm();
    this.editId = null;
    this.selectedFile = null;
    this.imagePreview.set(null);
    this.editing.set(true);
  }

  startEdit(q: Question) {
    this.form = { text: q.text, type: q.type, category: q.category, explanation: q.explanation ?? '', options: q.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })) };
    this.editId = q.id;
    this.selectedFile = null;
    this.imagePreview.set(q.imageUrl ?? null);
    this.editing.set(true);
  }

  toggleCorrect(i: number) {
    if (this.form.type === 'Single') this.form.options.forEach((o, j) => o.isCorrect = j === i);
    else this.form.options[i].isCorrect = !this.form.options[i].isCorrect;
  }

  typeLabel(t: string) { return { Single: 'Одна відповідь', Multi: 'Декілька', Open: 'Відкрите' }[t] ?? t; }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Максимум 5 МБ'); return; }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview.set(null);
    // If editing existing question with image — mark for deletion
    if (this.editId) {
      const q = this.questions().find(x => x.id === this.editId);
      if (q?.imageUrl) {
        this.api.deleteQuestionImage(this.editId).subscribe();
      }
    }
  }

  save() {
    if (!this.form.text.trim()) return;
    this.uploading.set(true);
    const req = { text: this.form.text, type: this.form.type, category: this.form.category, explanation: this.form.explanation || undefined, options: this.form.type !== 'Open' ? this.form.options : [] };
    const obs = this.editId ? this.api.updateQuestion(this.editId, req) : this.api.createQuestion(req);
    obs.subscribe((saved) => {
      const questionId = this.editId ?? saved.id;
      if (this.selectedFile && questionId) {
        this.api.uploadQuestionImage(questionId, this.selectedFile).subscribe({
          next: () => { this.uploading.set(false); this.editing.set(false); this.load(); },
          error: () => { this.uploading.set(false); this.editing.set(false); this.load(); }
        });
      } else {
        this.uploading.set(false);
        this.editing.set(false);
        this.load();
      }
    });
  }

  deleteQ(id: string) {
    if (!confirm('Видалити?')) return;
    this.api.deleteQuestion(id).subscribe(() => this.load());
  }

  isServerUrl(url: string): boolean {
    return url.startsWith('/api/');
  }

  openImage(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img?.src) this.lightbox.open(img.src);
  }
}
