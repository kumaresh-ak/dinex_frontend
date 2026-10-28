import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { GuestApi } from '../../core/api/guest.api';

/** Entry point for the table QR code. Opens a dining session and forwards the guest to it. */
@Component({
  selector: 'app-scan-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (error(); as message) {
          <div class="alert alert-error">{{ message }}</div>
          <div class="auth-links"><a routerLink="/login">Staff sign in</a></div>
        } @else {
          <p class="muted">Opening your table...</p>
        }
      </div>
    </div>
  `,
})
export class ScanPageComponent implements OnInit {
  private readonly api = inject(GuestApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const qrToken = this.route.snapshot.paramMap.get('token') ?? '';
    this.api.startSession(qrToken).subscribe({
      next: start => {
        void this.router.navigate(['/guest', start.sessionToken], { queryParams: { t: qrToken }, replaceUrl: true });
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'This QR code is not active. Ask staff for help.')),
    });
  }
}
