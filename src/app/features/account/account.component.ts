import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-account-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="page-head">
      <div>
        <h1>Account</h1>
        <p class="muted">{{ auth.session()?.displayName }} · {{ auth.session()?.username }}</p>
      </div>
    </header>
    <section class="card narrow">
      <h2>Change password</h2>
      @if (error(); as message) {
        <div class="alert alert-error">{{ message }}</div>
      }
      <form #f="ngForm" (ngSubmit)="submit()">
        <label class="field"><span>Current password</span>
          <input class="input" name="current" type="password" required [(ngModel)]="current" />
        </label>
        <label class="field"><span>New password (8-72 characters, letters and numbers)</span>
          <input class="input" name="next" type="password" minlength="8" maxlength="72" required [(ngModel)]="next" />
        </label>
        <label class="field"><span>Confirm new password</span>
          <input class="input" name="confirm" type="password" required [(ngModel)]="confirm" />
        </label>
        <button class="btn btn-primary" type="submit" [disabled]="busy() || f.invalid">Update password</button>
      </form>
      <p class="muted small">Changing the password signs you out on every device.</p>
    </section>
  `,
})
export class AccountPageComponent {
  readonly auth = inject(AuthService);

  current = '';
  next = '';
  confirm = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.next !== this.confirm) {
      this.error.set('The new passwords do not match.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.changePassword(this.current, this.next).subscribe({
      next: () => this.auth.expire('Password updated. Sign in with your new password.'),
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'Password could not be changed.'));
      },
    });
  }
}
