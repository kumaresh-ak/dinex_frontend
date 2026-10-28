import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { HotelProfile, Page } from '../../core/models';
import { HumanizePipe, statusTone } from '../../core/ui';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-hotels-page',
  standalone: true,
  imports: [DatePipe, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Restaurants</h1>
        <p class="muted">Enable or disable restaurant accounts, or remove them permanently.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    <section class="card">
      <div class="table-wrap">
        <table class="table stacked">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Owner</th>
              <th>Location</th>
              <th>Subscription</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (hotel of page()?.content ?? []; track hotel.id) {
              <tr>
                <td data-label="Restaurant">
                  <strong>{{ hotel.hotelName }}</strong>
                  <div class="small muted">{{ hotel.email }}</div>
                </td>
                <td data-label="Owner">{{ hotel.ownerName }}<div class="small muted">{{ hotel.mobileNumber }}</div></td>
                <td data-label="Location">{{ hotel.city }}, {{ hotel.state }}</td>
                <td data-label="Subscription"><span class="badge badge-{{ tone(hotel.subscriptionStatus) }}">{{ hotel.subscriptionStatus | humanize }}</span></td>
                <td data-label="Enabled">
                  <input type="checkbox" [checked]="hotel.enabled" (change)="toggle(hotel)" aria-label="Enabled" />
                </td>
                <td>
                  <button class="btn btn-sm btn-danger" type="button" (click)="remove(hotel)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted">No restaurants registered yet.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (page(); as p) {
        <div class="pager">
          <button class="btn btn-sm" type="button" [disabled]="p.page <= 0" (click)="go(p.page - 1)">Previous</button>
          <span class="small muted">Page {{ p.page + 1 }} of {{ Math.max(1, p.totalPages) }} · {{ p.totalElements }} restaurants</span>
          <button class="btn btn-sm" type="button" [disabled]="p.page + 1 >= p.totalPages" (click)="go(p.page + 1)">Next</button>
        </div>
      }
    </section>
  `,
})
export class HotelsPageComponent implements OnInit {
  private readonly api = inject(PlatformApi);

  readonly Math = Math;
  readonly tone = statusTone;

  readonly page = signal<Page<HotelProfile> | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load(0);
  }

  go(index: number): void {
    this.load(index);
  }

  toggle(hotel: HotelProfile): void {
    this.api.setHotelEnabled(hotel.id, !hotel.enabled).subscribe({
      next: () => this.load(this.page()?.page ?? 0),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The restaurant could not be updated.')),
    });
  }

  remove(hotel: HotelProfile): void {
    if (!confirm(`Delete ${hotel.hotelName} and all of its data? This cannot be undone.`)) {
      return;
    }
    this.api.deleteHotel(hotel.id).subscribe({
      next: () => this.load(this.page()?.page ?? 0),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The restaurant could not be deleted.')),
    });
  }

  private load(index: number): void {
    this.api.hotels(index, PAGE_SIZE).subscribe({
      next: page => {
        this.page.set(page);
        this.error.set(null);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'Restaurants could not be loaded.')),
    });
  }
}
