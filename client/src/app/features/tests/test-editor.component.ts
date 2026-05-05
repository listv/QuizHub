import { Component, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@core/services/api.service';
import { Question, Test, User, TestAssignment } from '@core/models/models';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-test-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="back-btn" (click)="router.navigate(['/tests'])">← Назад до тестів</button>
    <h1 class="page-title">{{ editId ? 'Редагувати тест' : 'Новий тест' }}</h1>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <!-- Settings -->
        <div class="card">
          <h3 class="section-title">Налаштування</h3>
          <label class="field-label">Назва *</label>
          <input class="field-input" [(ngModel)]="form.title" placeholder="Назва тесту">

          <label class="field-label">Опис</label>
          <textarea class="field-input" [(ngModel)]="form.description" rows="2"></textarea>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-label">Час (хв)</label>
              <input class="field-input" type="number" [(ngModel)]="form.timeLimitMinutes">
            </div>
            <div>
              <label class="field-label">Поріг (%)</label>
              <input class="field-input" type="number" [(ngModel)]="form.passingScore">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="field-label">Макс. спроб (0 = без обмежень)</label>
              <input class="field-input" type="number" [(ngModel)]="form.maxAttempts" min="0">
            </div>
            <div>
              <label class="field-label">Дедлайн</label>
              <input class="field-input" type="datetime-local" [(ngModel)]="form.deadline">
            </div>
          </div>

          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;margin-top:8px">
            <input type="checkbox" [(ngModel)]="form.randomize"> Перемішувати питання
          </label>
        </div>

        <!-- Assignments -->
        <div class="card" style="margin-top:16px">
          <h3 class="section-title">Призначення тесту</h3>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div>
              <label class="field-label">Додати відділ</label>
              <select class="field-input" [(ngModel)]="selectedDept" (change)="addDepartment()">
                <option value="">— Обрати відділ —</option>
                @for (d of availableDepts(); track d) {
                  <option [value]="d">{{ d }}</option>
                }
              </select>
            </div>
            <div>
              <label class="field-label">Додати співробітника</label>
              <select class="field-input" [(ngModel)]="selectedUser" (change)="addUser()">
                <option value="">— Обрати —</option>
                @for (u of availableUsers(); track u.id) {
                  <option [value]="u.id">{{ u.fullName }} ({{ u.department }})</option>
                }
              </select>
            </div>
          </div>

          @if (assignedDepts.length === 0 && assignedUserIds.length === 0) {
            <p style="color:#94a3b8;font-size:13px">Не призначено нікому. Тест буде доступний лише після призначення.</p>
          }

          @for (d of assignedDepts; track d) {
            <div class="assign-chip dept-chip">
              🏢 {{ d }}
              <button (click)="removeDepartment(d)">✕</button>
            </div>
          }

          @for (uid of assignedUserIds; track uid) {
            <div class="assign-chip user-chip">
              👤 {{ getUserName(uid) }}
              <button (click)="removeUser(uid)">✕</button>
            </div>
          }
        </div>

        <!-- Selected questions -->
        <div class="card" style="margin-top:16px">
          <h3 class="section-title">Обрані питання ({{ selectedIds.length }})</h3>
          @for (q of selectedQuestions(); track q.id; let i = $index) {
            <div class="result-row" (click)="toggleQuestion(q.id)">
              <span style="font-size:13px">{{ i + 1 }}. {{ q.text }}</span>
              <span style="color:#ef4444;cursor:pointer">✕</span>
            </div>
          } @empty {
            <p style="color:#94a3b8;font-size:13px">Оберіть питання з банку →</p>
          }
        </div>

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn-secondary" (click)="router.navigate(['/tests'])">Скасувати</button>
          <button class="btn-primary" (click)="save()" [disabled]="!form.title || selectedIds.length === 0">
            {{ editId ? 'Зберегти' : 'Створити' }}
          </button>
        </div>
      </div>

      <!-- Question bank -->
      <div class="card">
        <h3 class="section-title">Банк питань</h3>
        <input class="field-input" [(ngModel)]="search" placeholder="Пошук...">
        <div style="max-height:600px;overflow-y:auto">
          @for (q of availableQuestions(); track q.id) {
            <div class="result-row" style="cursor:pointer" (click)="toggleQuestion(q.id)">
              <div>
                <div style="font-size:13px">{{ q.text }}</div>
                <div style="font-size:11px;color:#94a3b8">{{ q.category || 'Без категорії' }}</div>
              </div>
              <span style="color:#3b82f6">＋</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back-btn { background:none;border:none;color:#64748b;cursor:pointer;font-size:13px;margin-bottom:12px;padding:0 }
    .section-title { margin:0 0 12px;font-size:13px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px }
    .field-label { display:block;font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px }
    .field-input { width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:12px;box-sizing:border-box;outline:none;font-family:inherit }
    .field-input:focus { border-color:#3b82f6 }
    .btn-primary { display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .btn-primary:disabled { opacity:.5;cursor:not-allowed }
    .btn-secondary { display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#e2e8f0;color:#475569;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600 }
    .assign-chip {
      display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;
      font-size:12px;font-weight:600;margin:0 6px 6px 0;
    }
    .assign-chip button { background:none;border:none;cursor:pointer;font-size:14px;color:inherit;padding:0;margin-left:4px }
    .dept-chip { background:#e0e7ff;color:#3730a3 }
    .user-chip { background:#dcfce7;color:#166534 }
  `]
})
export class TestEditorComponent implements OnInit {
  @Input() id?: string;
  editId: string | null = null;

  form = { title: '', description: '', timeLimitMinutes: 30, passingScore: 70, randomize: true, maxAttempts: 0, deadline: '' };
  selectedIds: string[] = [];
  allQuestions = signal<Question[]>([]);
  allUsers = signal<User[]>([]);
  allDepts = signal<string[]>([]);
  search = '';

  // Assignments
  assignedDepts: string[] = [];
  assignedUserIds: string[] = [];
  existingAssignmentIds: string[] = []; // for edit mode
  selectedDept = '';
  selectedUser = '';

  constructor(public router: Router, private api: ApiService, private notify: NotificationService) {}

  ngOnInit() {
    this.editId = this.id ?? null;
    this.api.getQuestions().subscribe(q => this.allQuestions.set(q));
    this.api.getUsers().subscribe(u => this.allUsers.set(u.filter(x => x.isActive && x.role === 'Employee')));
    this.api.getDepartments().subscribe(d => this.allDepts.set(d));

    if (this.editId) {
      this.api.getTest(this.editId).subscribe(t => {
        this.form = {
          title: t.title, description: t.description ?? '',
          timeLimitMinutes: t.timeLimitMinutes, passingScore: t.passingScore,
          randomize: t.randomizeQuestions, maxAttempts: t.maxAttempts || 0,
          deadline: t.deadline ? t.deadline.slice(0, 16) : ''
        };
        this.selectedIds = [...t.questionIds];

        // Load existing assignments
        this.existingAssignmentIds = t.assignments.map(a => a.id);
        this.assignedDepts = t.assignments.filter(a => a.department).map(a => a.department!);
        this.assignedUserIds = t.assignments.filter(a => a.userId).map(a => a.userId!);
      });
    }
  }

  selectedQuestions = () => this.allQuestions().filter(q => this.selectedIds.includes(q.id));

  availableQuestions = () => {
    const s = this.search.toLowerCase();
    return this.allQuestions().filter(q =>
      !this.selectedIds.includes(q.id) &&
      (q.text.toLowerCase().includes(s) || q.category.toLowerCase().includes(s))
    );
  };

  availableDepts = () => this.allDepts().filter(d => !this.assignedDepts.includes(d));
  availableUsers = () => this.allUsers().filter(u => !this.assignedUserIds.includes(u.id));

  toggleQuestion(id: string) {
    if (this.selectedIds.includes(id)) this.selectedIds = this.selectedIds.filter(x => x !== id);
    else this.selectedIds = [...this.selectedIds, id];
  }

  addDepartment() {
    if (this.selectedDept && !this.assignedDepts.includes(this.selectedDept)) {
      this.assignedDepts = [...this.assignedDepts, this.selectedDept];
    }
    this.selectedDept = '';
  }

  removeDepartment(d: string) {
    this.assignedDepts = this.assignedDepts.filter(x => x !== d);
  }

  addUser() {
    if (this.selectedUser && !this.assignedUserIds.includes(this.selectedUser)) {
      this.assignedUserIds = [...this.assignedUserIds, this.selectedUser];
    }
    this.selectedUser = '';
  }

  removeUser(id: string) {
    this.assignedUserIds = this.assignedUserIds.filter(x => x !== id);
  }

  getUserName(id: string): string {
    return this.allUsers().find(u => u.id === id)?.fullName ?? id;
  }

  save() {
    const req: any = {
      title: this.form.title,
      description: this.form.description || undefined,
      timeLimitMinutes: this.form.timeLimitMinutes,
      passingScore: this.form.passingScore,
      randomizeQuestions: this.form.randomize,
      questionIds: this.selectedIds,
      maxAttempts: this.form.maxAttempts,
      deadline: this.form.deadline ? new Date(this.form.deadline).toISOString() : undefined
    };

    const saveTest$ = this.editId ? this.api.updateTest(this.editId, req) : this.api.createTest(req);

    saveTest$.subscribe(res => {
      const testId = this.editId ?? res.id;

      // Remove old assignments and add new
      if (this.editId && this.existingAssignmentIds.length > 0) {
        this.api.unassignTest(this.existingAssignmentIds).subscribe(() => {
          this.saveAssignments(testId);
        });
      } else {
        this.saveAssignments(testId);
      }
    });
  }

  private saveAssignments(testId: string) {
    if (this.assignedDepts.length === 0 && this.assignedUserIds.length === 0) {
      this.notify.success('Тест збережено');
      this.router.navigate(['/tests']);
      return;
    }

    this.api.assignTest({
      testId,
      userIds: this.assignedUserIds.length > 0 ? this.assignedUserIds : undefined,
      departments: this.assignedDepts.length > 0 ? this.assignedDepts : undefined
    }).subscribe(() => {
      this.notify.success('Тест збережено та призначено');
      this.router.navigate(['/tests']);
    });
  }
}
