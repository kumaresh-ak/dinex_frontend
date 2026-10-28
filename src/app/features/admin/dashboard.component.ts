import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { PlatformDashboard } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Platform overview</h1>
        <p class="muted">Health of every restaurant on DineX.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    @if (data(); as d) {
      <section class="stats">
        <div class="stat">
          <span>Restaurants</span>
          <strong>{{ d.totalHotels }}</strong>
          <small>{{ d.enabledHotels }} enabled</small>
        </div>
        <div class="stat">
          <span>Active subscriptions</span>
          <strong>{{ d.activeSubscriptions }}</strong>
          <small>{{ d.expiringWithin30Days }} expiring within 30 days</small>
        </div>
        <div class="stat">
          <span>Pending approvals</span>
          <strong>{{ d.pendingApprovals }}</strong>
          <small>Renewal requests awaiting review</small>
        </div>
        <div class="stat">
          <span>Subscription revenue (this month)</span>
          <strong>{{ d.subscriptionRevenueThisMonth | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
          <small>From approved renewals</small>
        </div>
        <div class="stat">
          <span>Restaurant revenue today</span>
          <strong>{{ d.tenantRevenueToday | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
          <small>{{ d.tenantBillsToday }} bills across all restaurants</small>
        </div>
        <div class="stat">
          <span>Staff accounts</span>
          <strong>{{ d.totalStaff }}</strong>
          <small>Chefs across all restaurants</small>
        </div>
      </section>
    } @else if (!error()) {
      <p class="muted">Loading...</p>
    }
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly api = inject(PlatformApi);

  readonly data = signal<PlatformDashboard | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.dashboard().subscribe({
      next: data => this.data.set(data),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The overview could not be loaded.')),
    });
  }
}
