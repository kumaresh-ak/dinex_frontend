import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HotelProfile, Plan } from '../models';

/** Endpoints that need no sign-in: registration, plans and password recovery. */
@Injectable({ providedIn: 'root' })
export class PublicApi {
  private readonly http = inject(HttpClient);

  register(form: FormData): Observable<HotelProfile> {
    return this.http.post<HotelProfile>('/api/v1/public/hotels/register', form);
  }

  plans(): Observable<Plan[]> {
    return this.http.get<Plan[]>('/api/v1/public/subscription-plans');
  }

  forgotPassword(username: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/forgot-password', { username });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/reset-password', { token, newPassword });
  }
}
