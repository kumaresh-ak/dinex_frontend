import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { AuthSession, UserRole } from '../models';

const HOME_BY_ROLE: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  HOTEL_ADMIN: '/hotel/dashboard',
  CHEF: '/kitchen',
  CUSTOMER: '/login',
};

/**
 * Holds the signed-in user. The access token lives in memory only; the refresh token is an
 * HttpOnly cookie that the backend rotates on every refresh.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private refreshInFlight: Observable<string> | null = null;
  private flash: string | null = null;

  readonly session = signal<AuthSession | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly role = computed<UserRole | null>(() => this.session()?.role ?? null);
  readonly hotelId = computed<number | null>(() => this.session()?.hotelId ?? null);

  login(username: string, password: string): Observable<AuthSession> {
    return this.http.post<AuthSession>('/api/v1/auth/login', { username, password })
      .pipe(tap(session => this.setSession(session)));
  }

  /** Restores the session from the refresh cookie when the application starts. */
  async restore(): Promise<void> {
    try {
      await firstValueFrom(this.refreshSession());
    } catch {
      this.clearSession();
    }
  }

  /**
   * Rotates the refresh token. Concurrent callers share one request, because reusing a rotated
   * refresh token is treated by the backend as theft and revokes every session of the user.
   */
  refreshSession(): Observable<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http.post<AuthSession>('/api/v1/auth/refresh', {}).pipe(
        tap(session => this.setSession(session)),
        map(session => session.accessToken),
        finalize(() => {
          this.refreshInFlight = null;
        }),
        shareReplay(1)
      );
    }
    return this.refreshInFlight;
  }

  logout(): void {
    this.http.post('/api/v1/auth/logout', {}).pipe(catchError(() => of(null))).subscribe(() => {
      this.expire(null);
    });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/v1/auth/change-password', { currentPassword, newPassword });
  }

  /** Clears the local session and sends the user to the sign-in page with an optional notice. */
  expire(message: string | null): void {
    this.clearSession();
    this.flash = message;
    void this.router.navigateByUrl('/login');
  }

  takeFlash(): string | null {
    const message = this.flash;
    this.flash = null;
    return message;
  }

  homeRoute(): string {
    const role = this.role();
    return role ? HOME_BY_ROLE[role] : '/login';
  }

  private setSession(session: AuthSession): void {
    this.accessToken.set(session.accessToken);
    this.session.set(session);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.session.set(null);
  }
}
