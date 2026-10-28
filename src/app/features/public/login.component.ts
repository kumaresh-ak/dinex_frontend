import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { errorMessage } from '../../core/api-error';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="brand-lockup"><span class="brand-mark">D</span><div><strong>DineX</strong><small>Restaurant platform</small></div></div>
        <h1>Sign in</h1>
        @if (notice(); as message) {
          <div class="alert alert-info">{{ message }}</div>
        }
        @if (error(); as message) {
          <div class="alert alert-error">{{ message }}</div>
        }
        <form #f="ngForm" (ngSubmit)="submit()">
          <label class="field"><span>Email or username</span>
            <input class="input" name="username" type="text" required autocomplete="username" [(ngModel)]="username" />
          </label>
          <label class="field"><span>Password</span>
            <input class="input" name="password" type="password" required autocomplete="current-password" [(ngModel)]="password" />
          </label>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || f.invalid">
            {{ busy() ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
        <div class="auth-links">
          <a routerLink="/forgot-password">Forgot password?</a>
          <a routerLink="/register">Register your restaurant</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  username = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(this.auth.takeFlash());

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: () => {
        this.busy.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const safe = returnUrl !== null && returnUrl.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.startsWith('/login');
        void this.router.navigateByUrl(safe && returnUrl ? returnUrl : this.auth.homeRoute());
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'Sign in failed. Check your details and try again.'));
      },
    });
  }
}
