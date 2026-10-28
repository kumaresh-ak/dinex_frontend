import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { PublicApi } from '../../core/api/public.api';
import { CurrentSubscription, Plan } from '../../core/models';
import { HumanizePipe, statusTone } from '../../core/ui';

@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Subscription</h1>
        <p class="muted">Renew your plan by submitting the payment details. A platform admin approves each request.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    @if (current(); as sub) {
      <section class="stats">
        <div class="stat">
          <span>Hotel status</span>
          <strong><span class="badge badge-{{ tone(sub.hotelStatus) }}">{{ sub.hotelStatus | humanize }}</span></strong>
          <small>{{ sub.active ? 'Ordering is enabled' : 'Ordering is blocked until renewal' }}</small>
        </div>
        <div class="stat">
          <span>Days remaining</span>
          <strong>{{ sub.remainingDays }}</strong>
          <small>{{ sub.activeSubscription?.endDate ? 'Ends ' + (sub.activeSubscription?.endDate | date: 'dd MMM yyyy') : 'No active plan' }}</small>
        </div>
      </section>

      @if (sub.pendingRequest; as pending) {
        <div class="alert alert-info">
          Renewal request for {{ pending.planName }} is awaiting approval.
        </div>
      }

      <section class="card">
        <h2>Pay the subscription</h2>
        @if (sub.platformUpiId) {
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">
            <strong style="user-select: all">{{ sub.platformUpiId }}</strong>
            <button class="btn btn-sm" type="button" (click)="copyUpi(sub.platformUpiId)">
              {{ copied() ? 'Copied' : 'Copy UPI ID' }}
            </button>
          </div>
          <p class="small muted">Pay the plan amount to this UPI ID, then submit the transaction ID below.</p>
        } @else {
          <p class="muted small">The UPI ID for subscription payments is not set yet. Contact support.</p>
        }
      </section>
    }

    <div class="grid-2">
      <section class="card">
        <h2>Request renewal</h2>
        <form #renewalForm="ngForm" (ngSubmit)="submit()">
          <fieldset class="plans">
            <legend>Choose a plan</legend>
            @for (plan of plans(); track plan.id) {
              <label class="plan-option">
                <input type="radio" name="plan" [value]="plan.id" [(ngModel)]="planId" />
                <span>
                  <strong>{{ plan.planName }}</strong>
                  <span class="small muted">{{ plan.durationMonths }} months</span>
                </span>
                <strong>{{ plan.price | currency: 'INR' : 'symbol' : '1.0-0' }}</strong>
              </label>
            } @empty {
              <p class="muted small">No plans are available right now.</p>
            }
          </fieldset>
          <label class="field">
            <span>Payment reference (UPI transaction ID)</span>
            <input class="input" name="reference" required maxlength="120" [(ngModel)]="paymentReference" />
          </label>
          <label class="field">
            <span>Payment date</span>
            <input class="input" name="paymentDate" type="date" required [(ngModel)]="paymentDate" />
          </label>
          <label class="field">
            <span>Payment proof (optional, image or PDF)</span>
            <input class="input" name="proof" type="file" accept="image/*,application/pdf" (change)="onProof($event)" />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="busy() || renewalForm.invalid || planId === null">
            Submit renewal request
          </button>
        </form>
      </section>

      <section class="card">
        <h2>History</h2>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Amount</th>
                <th>Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (item of current()?.history ?? []; track item.id) {
                <tr>
                  <td>{{ item.planName ?? '-' }}</td>
                  <td>{{ item.amount != null ? (item.amount | currency: 'INR' : 'symbol' : '1.0-0') : '-' }}</td>
                  <td>
                    {{ item.startDate ? (item.startDate | date: 'dd MMM yy') : '-' }}
                    to
                    {{ item.endDate ? (item.endDate | date: 'dd MMM yy') : '-' }}
                  </td>
                  <td><span class="badge badge-{{ tone(item.status) }}">{{ item.status | humanize }}</span></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="muted">No subscription history yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class SubscriptionPageComponent implements OnInit {
  private readonly api = inject(HotelApi);
  private readonly publicApi = inject(PublicApi);

  readonly current = signal<CurrentSubscription | null>(null);
  readonly plans = signal<Plan[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);
  readonly copied = signal(false);

  readonly tone = statusTone;

  planId: number | null = null;
  paymentReference = '';
  paymentDate = '';
  proof: File | null = null;

  ngOnInit(): void {
    this.loadCurrent();
    this.publicApi.plans().subscribe({
      next: plans => this.plans.set(plans),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Plans could not be loaded.')),
    });
  }

  onProof(event: Event): void {
    this.proof = (event.target as HTMLInputElement).files?.[0] ?? null;
  }

  copyUpi(upiId: string): void {
    navigator.clipboard
      .writeText(upiId)
      .then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      })
      .catch(() => this.error.set('Copy failed. Select the UPI ID and copy it manually.'));
  }

  submit(): void {
    if (this.planId === null) {
      this.error.set('Choose a plan.');
      return;
    }
    const data = new Blob(
      [
        JSON.stringify({
          planId: this.planId,
          paymentReference: this.paymentReference.trim(),
          paymentDate: this.paymentDate,
        }),
      ],
      { type: 'application/json' },
    );
    const form = new FormData();
    form.append('data', data);
    if (this.proof) {
      form.append('proof', this.proof);
    }

    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.requestSubscription(form).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set('Renewal request submitted. You will be notified once it is reviewed.');
        this.planId = null;
        this.paymentReference = '';
        this.paymentDate = '';
        this.proof = null;
        this.loadCurrent();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The renewal request could not be submitted.'));
      },
    });
  }

  private loadCurrent(): void {
    this.api.subscription().subscribe({
      next: sub => this.current.set(sub),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Subscription details could not be loaded.')),
    });
  }
}
