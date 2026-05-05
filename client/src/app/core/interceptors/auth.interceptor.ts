import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotificationService);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.logout();
      } else if (err.status === 429) {
        notify.warning(err.error?.message || 'Забагато запитів. Спробуйте пізніше.');
      } else if (err.status === 403) {
        notify.error('Недостатньо прав для цієї дії');
      } else if (err.status >= 500) {
        notify.error('Помилка сервера. Спробуйте пізніше.');
      } else if (err.status === 400) {
        const msg = err.error?.message || err.error?.errors
          ? Object.values(err.error.errors).flat().join('. ')
          : 'Невірні дані';
        notify.error(msg as string);
      }
      return throwError(() => err);
    })
  );
};
