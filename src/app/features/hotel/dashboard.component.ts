import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { HotelApi } from '../../core/api/hotel.api';
import { HotelDashboard } from '../../core/models';
import { RealtimeService } from '../../core/realtime/realtime.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">Today's activity for your restaurant.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    @if (data(); as d) {
      <section class="stats">
        <div class="stat">
          <span>Today's revenue</span>
          <strong>{{ d.todayRevenue | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
          <small>{{ d.todayBills }} bills generated</small>
        </div>
        <div class="stat">
          <span>Open sessions</span>
          <strong>{{ d.openSessions }}</strong>
          <small>{{ d.unsettledBills }} unsettled bills</small>
        </div>
        <div class="stat">
          <span>Tables occupied</span>
          <strong>{{ d.occupiedTables }} / {{ d.activeTables }}</strong>
          <small>Occupied of active tables</small>
        </div>
        <div class="stat">
          <span>Orders in progress</span>
          <strong>{{ d.ordersInProgress }}</strong>
          <small>{{ d.pendingPayments }} payments pending</small>
        </div>
        <div class="stat">
          <span>Menu items</span>
          <strong>{{ d.menuItems }}</strong>
          <small>{{ d.chefs }} chefs on staff</small>
        </div>
        <div class="stat">
          <span>Average rating</span>
          <strong>{{ d.averageRating != null ? (d.averageRating | number: '1.1-1') : '-' }}</strong>
          <small>From guest feedback</small>
        </div>
      </section>

      <section class="card">
        <h2>Revenue, last 7 days</h2>
        <div class="bars">
          @for (point of d.last7Days; track point.day) {
            <div class="bar-col">
              <span class="bar-value">{{ point.total | currency: 'INR' : 'symbol' : '1.0-0' }}</span>
              <div class="bar" [style.height.px]="barHeight(point.total, d)"></div>
              <small>{{ point.day }}</small>
            </div>
          }
        </div>
      </section>
    } @else if (!error()) {
      <p class="muted">Loading...</p>
    }
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly api = inject(HotelApi);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<HotelDashboard | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
    const hotelId = this.auth.hotelId();
    if (hotelId !== null) {
      this.realtime
        .subscribe(`/topic/hotels/${hotelId}/events`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.load());
    }
  }

  barHeight(total: number, dashboard: HotelDashboard): number {
    const max = Math.max(1, ...dashboard.last7Days.map(point => point.total));
    return Math.max(2, Math.round((total / max) * 140));
  }

  private load(): void {
    this.api.dashboard().subscribe({
      next: dashboard => {
        this.data.set(dashboard);
        this.error.set(null);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The dashboard could not be loaded.')),
    });
  }
}
