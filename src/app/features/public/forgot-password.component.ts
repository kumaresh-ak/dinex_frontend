import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { PublicApi } from '../../core/api/public.api';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Reset password</h1>
        <p class="muted">Enter your login email. If an account exists, a reset link is sent to it.</p>
        @if (error(); as message) {
          <div class="alert alert-error">{{ message }}</div>
        }
        @if (sent()) {
          <div class="alert alert-ok">If that account exists, a reset link has been sent. Check your inbox.</div>
        } @else {
          <form #f="ngForm" (ngSubmit)="submit()">
            <label class="field"><span>Login email</span>
              <input class="input" name="username" type="email" required [(ngModel)]="username" />
            </label>
            <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || f.invalid">Send reset link</button>
          </form>
        }
        <div class="auth-links"><a routerLink="/login">Back to sign in</a></div>
      </div>
    </div>
  `,
})
export class ForgotPasswordPageComponent {
  private readonly api = inject(PublicApi);

  username = '';
  readonly busy = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.forgotPassword(this.username.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.sent.set(true);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
