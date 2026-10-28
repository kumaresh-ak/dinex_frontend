import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { GuestApi } from '../../core/api/guest.api';

/** Entry point for the common menu QR code. The guest picks a table, then the menu opens for that table. */
@Component({
  selector: 'app-menu-entry-page',
  standalone: true,
  imports: [],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (loading()) {
          <p class="muted">Loading the menu...</p>
        } @else if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        } @else if (hotelName()) {
          <h1 class="entry-title">{{ hotelName() }}</h1>
          <p class="muted">Select your table to view the menu and place your order.</p>

          @if (tableNumbers().length) {
            <div class="table-grid">
              @for (number of tableNumbers(); track number) {
                <button class="btn" type="button" [disabled]="busyTable() !== null" (click)="pick(number)">
                  @if (busyTable() === number) {
                    Opening...
                  } @else {
                    Table {{ number }}
                  }
                </button>
              }
            </div>
          } @else {
            <p class="muted">No tables are open right now. Please ask staff for help.</p>
          }
          @if (pickError(); as message) {
            <div class="alert alert-error">{{ message }}</div>
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .entry-title {
        margin: 0 0 6px;
        font-size: 22px;
      }
      .table-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
        gap: 10px;
        margin-top: 16px;
      }
    `,
  ],
})
export class MenuEntryPageComponent implements OnInit {
  private readonly api = inject(GuestApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pickError = signal<string | null>(null);
  readonly hotelName = signal<string | null>(null);
  readonly tableNumbers = signal<string[]>([]);
  readonly busyTable = signal<string | null>(null);

  private menuToken = '';

  ngOnInit(): void {
    this.menuToken = this.route.snapshot.paramMap.get('token') ?? '';
    this.api.publicMenu(this.menuToken).subscribe({
      next: menu => {
        this.hotelName.set(menu.hotelName);
        this.tableNumbers.set(menu.tableNumbers);
        this.loading.set(false);
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(errorMessage(e, 'This menu code is not active. Ask staff for help.'));
      },
    });
  }

  pick(tableNumber: string): void {
    this.busyTable.set(tableNumber);
    this.pickError.set(null);
    this.api.startMenuSession(this.menuToken, tableNumber).subscribe({
      next: start => {
        void this.router.navigate(['/guest', start.sessionToken], {
          queryParams: { t: start.tableQrToken },
          replaceUrl: true,
        });
      },
      error: (e: unknown) => {
        this.busyTable.set(null);
        this.pickError.set(errorMessage(e, 'The table could not be opened. Please try again.'));
      },
    });
  }
}
