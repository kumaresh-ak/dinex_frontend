import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const AUTH_PREFIX = '/api/v1/auth/';

/**
 * Adds the bearer token to API calls. When an access token has expired (401), the refresh token
 * is rotated once and the original request is retried with the new token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  const auth = inject(AuthService);
  const isAuthCall = req.url.startsWith(AUTH_PREFIX);
  const token = auth.accessToken();
  const outgoing = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthCall || !token) {
        return throwError(() => error);
      }
      return auth.refreshSession().pipe(
        switchMap(fresh => next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }))),
        catchError((refreshError: unknown) => {
          auth.expire('Your session has ended. Please sign in again.');
          return throwError(() => refreshError);
        })
      );
    })
  );
};
