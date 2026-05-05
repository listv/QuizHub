import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '@env/environment';
import { LoginRequest, LoginResponse, User, UserRole } from '../models/models';
import { clearImageCache } from '@shared/components/secure-image.pipe';

const TOKEN_KEY = 'qh_token';
const USER_KEY = 'qh_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(this.loadUser());

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly role = computed(() => this.currentUser()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'Admin');
  readonly isManager = computed(() => this.role() === 'Manager');
  readonly isEmployee = computed(() => this.role() === 'Employee');

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, req).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    clearImageCache();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasRole(...roles: UserRole[]): boolean {
    const r = this.role();
    return r !== null && roles.includes(r);
  }

  private loadUser(): User | null {
    try {
      const json = localStorage.getItem(USER_KEY);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }
}
