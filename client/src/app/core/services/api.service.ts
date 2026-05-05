import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import * as M from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private url = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Users ──
  getUsers(department?: string, role?: string): Observable<M.User[]> {
    let params = new HttpParams();
    if (department) params = params.set('department', department);
    if (role) params = params.set('role', role);
    return this.http.get<M.User[]>(`${this.url}/users`, { params });
  }

  changePassword(req: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/auth/change-password`, req);
  }

  createUser(req: M.CreateUserRequest): Observable<M.User> {
    return this.http.post<M.User>(`${this.url}/users`, req);
  }

  updateUser(id: string, req: M.UpdateUserRequest): Observable<M.User> {
    return this.http.put<M.User>(`${this.url}/users/${id}`, req);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/users/${id}`);
  }

  // ── Questions ──
  getQuestions(category?: string, type?: string): Observable<M.Question[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    if (type) params = params.set('type', type);
    return this.http.get<M.Question[]>(`${this.url}/questions`, { params });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/questions/categories`);
  }

  createQuestion(req: M.CreateQuestionRequest): Observable<M.Question> {
    return this.http.post<M.Question>(`${this.url}/questions`, req);
  }

  updateQuestion(id: string, req: Partial<M.CreateQuestionRequest>): Observable<M.Question> {
    return this.http.put<M.Question>(`${this.url}/questions/${id}`, req);
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/questions/${id}`);
  }

  // ── Question Images ──
  uploadQuestionImage(questionId: string, file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.url}/images/questions/${questionId}`, formData);
  }

  deleteQuestionImage(questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/images/questions/${questionId}`);
  }

  // ── Tests ──
  getTests(): Observable<M.Test[]> {
    return this.http.get<M.Test[]>(`${this.url}/tests`);
  }

  getTest(id: string): Observable<M.Test> {
    return this.http.get<M.Test>(`${this.url}/tests/${id}`);
  }

  getTestQuestions(id: string): Observable<M.TestQuestionsResponse> {
    return this.http.get<M.TestQuestionsResponse>(`${this.url}/tests/${id}/questions`);
  }

  createTest(req: M.CreateTestRequest): Observable<any> {
    return this.http.post(`${this.url}/tests`, req);
  }

  updateTest(id: string, req: Partial<M.CreateTestRequest>): Observable<any> {
    return this.http.put(`${this.url}/tests/${id}`, req);
  }

  deleteTest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/tests/${id}`);
  }

  submitTest(req: M.SubmitTestRequest): Observable<M.TestResult> {
    return this.http.post<M.TestResult>(`${this.url}/tests/submit`, req);
  }

  assignTest(req: M.AssignTestRequest): Observable<any> {
    return this.http.post(`${this.url}/tests/assign`, req);
  }

  unassignTest(assignmentIds: string[]): Observable<any> {
    return this.http.post(`${this.url}/tests/unassign`, { assignmentIds });
  }

  getDepartments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/tests/departments`);
  }

  // ── Results ──
  getResults(params?: { userId?: string; testId?: string; page?: number; pageSize?: number }): Observable<M.PaginatedResults> {
    let p = new HttpParams();
    if (params?.userId) p = p.set('userId', params.userId);
    if (params?.testId) p = p.set('testId', params.testId);
    if (params?.page) p = p.set('page', params.page.toString());
    if (params?.pageSize) p = p.set('pageSize', params.pageSize.toString());
    return this.http.get<M.PaginatedResults>(`${this.url}/results`, { params: p });
  }

  getResult(id: string): Observable<M.TestResult> {
    return this.http.get<M.TestResult>(`${this.url}/results/${id}`);
  }

  // ── Analytics ──
  getOverview(): Observable<M.OverviewAnalytics> {
    return this.http.get<M.OverviewAnalytics>(`${this.url}/analytics/overview`);
  }

  getEmployeeStats(): Observable<M.EmployeeAnalytics[]> {
    return this.http.get<M.EmployeeAnalytics[]>(`${this.url}/analytics/employees`);
  }

  getEmployeeDetail(userId: string): Observable<any> {
    return this.http.get(`${this.url}/analytics/employees/${userId}`);
  }

  getDifficultQuestions(top = 15): Observable<M.DifficultQuestion[]> {
    return this.http.get<M.DifficultQuestion[]>(`${this.url}/analytics/difficult-questions`, {
      params: new HttpParams().set('top', top.toString())
    });
  }

  getOverdueTests(): Observable<M.OverdueTest[]> {
    return this.http.get<M.OverdueTest[]>(`${this.url}/analytics/overdue`);
  }
}
