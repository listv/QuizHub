import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // Admin only
      {
        path: 'tests',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/tests/tests-list.component').then(m => m.TestsListComponent)
      },
      {
        path: 'tests/create',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/tests/test-editor.component').then(m => m.TestEditorComponent)
      },
      {
        path: 'tests/:id/edit',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/tests/test-editor.component').then(m => m.TestEditorComponent)
      },
      {
        path: 'questions',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/questions/questions.component').then(m => m.QuestionsComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
      },
      // Admin + Manager
      {
        path: 'analytics',
        canActivate: [roleGuard('Admin', 'Manager')],
        loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      {
        path: 'employees/:id',
        canActivate: [roleGuard('Admin', 'Manager')],
        loadComponent: () => import('./features/analytics/employee-detail.component').then(m => m.EmployeeDetailComponent)
      },
      // All roles
      {
        path: 'take/:id',
        loadComponent: () => import('./features/test-taker/test-taker.component').then(m => m.TestTakerComponent)
      },
      {
        path: 'results/:id',
        loadComponent: () => import('./features/results/result-detail.component').then(m => m.ResultDetailComponent)
      },
      // Employee
      {
        path: 'mytests',
        loadComponent: () => import('./features/dashboard/employee-tests.component').then(m => m.EmployeeTestsComponent)
      },
      {
        path: 'myresults',
        loadComponent: () => import('./features/dashboard/employee-results.component').then(m => m.EmployeeResultsComponent)
      },
      // Profile (all roles)
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
