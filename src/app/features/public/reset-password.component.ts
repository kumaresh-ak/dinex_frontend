import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { PublicApi } from '../../core/api/public.api';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1>Choose a new password</h1>
        @if (!token) {
          <div class="alert alert-error">This reset link is incomplete. Request a new one.</div>
          <div class="auth-links"><a routerLink="/forgot-password">Request a new link</a></div>
        } @else {
          @if (error(); as message) {
            <div class="alert alert-error">{{ message }}</div>
          }
          <form #f="ngForm" (ngSubmit)="submit()">
            <label class="field"><span>New password (8-72 characters, letters and numbers)</span>
              <input class="input" name="newPassword" type="password" minlength="8" maxlength="72" required [(ngModel)]="newPassword" />
            </label>
            <label class="field"><span>Confirm password</span>
              <input class="input" name="confirm" type="password" required [(ngModel)]="confirm" />
            </label>
            <button class="btn btn-primary btn-block" type="submit" [disabled]="busy() || f.invalid">Reset password</button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordPageComponent {
  private readonly api = inject(PublicApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  newPassword = '';
  confirm = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.newPassword !== this.confirm) {
      this.error.set('The passwords do not match.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.busy.set(false);
        this.auth.expire('Password reset. Sign in with your new password.');
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The reset link is invalid or has expired.'));
      },
    });
  }
}
