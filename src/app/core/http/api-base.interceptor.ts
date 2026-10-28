import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Sends `/api` calls to the configured backend. Credentials are included so the HttpOnly refresh
 * cookie is sent and stored across the frontend and backend origins.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }
  return next(req.clone({ url: `${environment.apiBaseUrl}${req.url}`, withCredentials: true }));
};
