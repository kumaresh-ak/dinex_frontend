import { DatePipe, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { openBlob } from '../../core/files';
import { Subscription, SubscriptionStatus } from '../../core/models';
import { HumanizePipe, statusTone } from '../../core/ui';

type Filter = '' | SubscriptionStatus;

@Component({
  selector: 'app-subscriptions-page',
  standalone: true,
  imports: [DatePipe, CurrencyPipe, FormsModule, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Subscription requests</h1>
        <p class="muted">Approve renewals once payment is verified. Rejected requests need a reason.</p>
      </div>
      <select class="input narrow" name="filter" [ngModel]="filter" (ngModelChange)="setFilter($event)">
        <option value="">All</option>
        <option value="PENDING_APPROVAL">Pending approval</option>
        <option value="ACTIVE">Active</option>
        <option value="EXPIRED">Expired</option>
        <option value="REJECTED">Rejected</option>
      </select>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <section class="card">
      <div class="table-wrap">
        <table class="table stacked">
          <thead>
            <tr>
              <th>Restaurant</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Period</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id) {
              <tr>
                <td data-label="Restaurant"><strong>{{ item.hotelName ?? 'Hotel #' + item.hotelId }}</strong></td>
                <td data-label="Plan">{{ item.planName ?? '-' }}</td>
                <td data-label="Amount">{{ item.amount != null ? (item.amount | currency: 'INR' : 'symbol' : '1.0-0') : '-' }}</td>
                <td data-label="Payment">
                  <div>{{ item.paymentReference ?? '-' }}</div>
                  <div class="small muted">{{ item.paymentDate ? (item.paymentDate | date: 'dd MMM yyyy') : '' }}</div>
                  @if (item.paymentProofKey) {
                    <button class="btn btn-sm" type="button" (click)="viewProof(item)">View proof</button>
                  }
                </td>
                <td data-label="Period">
                  {{ item.startDate ? (item.startDate | date: 'dd MMM yy') : '-' }}
                  to
                  {{ item.endDate ? (item.endDate | date: 'dd MMM yy') : '-' }}
                </td>
                <td data-label="Status"><span class="badge badge-{{ tone(item.status) }}">{{ item.status | humanize }}</span></td>
                <td>
                  @if (item.status === 'PENDING_APPROVAL') {
                    <div class="row">
                      <button class="btn btn-sm btn-primary" type="button" [disabled]="busyId() === item.id" (click)="approve(item)">Approve</button>
                      <button class="btn btn-sm btn-danger" type="button" [disabled]="busyId() === item.id" (click)="reject(item)">Reject</button>
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="muted">No subscription requests.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class SubscriptionsPageComponent implements OnInit {
  private readonly api = inject(PlatformApi);

  readonly tone = statusTone;

  readonly items = signal<Subscription[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);

  filter: Filter = '';

  ngOnInit(): void {
    this.load();
  }

  setFilter(value: Filter): void {
    this.filter = value;
    this.load();
  }

  approve(item: Subscription): void {
    if (!confirm(`Approve the renewal for ${item.hotelName ?? 'this hotel'}?`)) {
      return;
    }
    this.act(item.id, this.api.approve(item.id), 'Subscription approved.');
  }

  reject(item: Subscription): void {
    const reason = prompt('Reason for rejecting this request:');
    if (!reason || !reason.trim()) {
      return;
    }
    this.act(item.id, this.api.reject(item.id, reason.trim()), 'Subscription rejected.');
  }

  viewProof(item: Subscription): void {
    if (!item.paymentProofKey) {
      return;
    }
    this.api.proofBlob(item.paymentProofKey).subscribe({
      next: blob => openBlob(blob),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The payment proof could not be opened.')),
    });
  }

  private act(id: number, request: ReturnType<PlatformApi['approve']>, success: string): void {
    this.busyId.set(id);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.notice.set(success);
        this.load();
      },
      error: (e: unknown) => {
        this.busyId.set(null);
        this.error.set(errorMessage(e, 'The request could not be updated.'));
      },
    });
  }

  private load(): void {
    this.api.subscriptions(this.filter || undefined).subscribe({
      next: items => this.items.set(items),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Subscriptions could not be loaded.')),
    });
  }
}
