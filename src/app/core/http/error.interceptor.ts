import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../api-error';
import { AuthService } from '../auth/auth.service';

interface ProblemBody {
  code?: string;
  title?: string;
  detail?: string;
  fields?: Record<string, string>;
}

/**
 * Converts backend ProblemDetail responses into ApiError. A 402 from a tenant endpoint means the
 * restaurant has no active subscription, so the user is sent to the subscription page. A
 * HOTEL_DISABLED response ends the session.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const body: ProblemBody = typeof error.error === 'object' && error.error !== null ? error.error : {};
      const code = body.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'REQUEST_FAILED');
      const message = body.detail ?? body.title ?? fallbackMessage(error.status);
      const tenantCall = req.url.startsWith('/api/v1/hotel/') || req.url.startsWith('/api/v1/kitchen/');

      if (error.status === 402 && tenantCall && !router.url.startsWith('/hotel/subscription')) {
        void router.navigateByUrl('/hotel/subscription');
      }
      if (error.status === 403 && code === 'HOTEL_DISABLED') {
        auth.expire('This restaurant account is disabled. Contact the platform administrator.');
      }
      return throwError(() => new ApiError(error.status, code, message, body.fields ?? {}));
    })
  );
};

function fallbackMessage(status: number): string {
  if (status === 0) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (status >= 500) {
    return 'The server ran into a problem. Please try again.';
  }
  if (status === 404) {
    return 'The requested item was not found.';
  }
  if (status === 403) {
    return 'You do not have permission to do that.';
  }
  return 'The request could not be completed.';
}
