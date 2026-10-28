import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { BillingApi } from '../../core/api/billing.api';
import { OrdersApi } from '../../core/api/orders.api';
import { openBlob } from '../../core/files';
import { Bill, BillStatus, PaymentMethod, PaymentRecord, SessionSummary } from '../../core/models';
import { HumanizePipe, statusTone } from '../../core/ui';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Billing</h1>
        <p class="muted">Generate bills for open sessions, then record how each bill was paid.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <section class="card">
      <h2>Open sessions</h2>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Table</th>
              <th>Orders</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (session of sessions(); track session.sessionId) {
              <tr>
                <td>
                  <strong>{{ session.sessionNumber }}</strong>
                  <div class="small muted">{{ session.customerName ?? 'Guest' }}</div>
                </td>
                <td>{{ session.tableNumber ?? '-' }}</td>
                <td>{{ session.orderCount }}</td>
                <td>{{ session.grandTotal | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td><span class="badge badge-{{ tone(session.status) }}">{{ session.status | humanize }}</span></td>
                <td>
                  @if (session.status === 'OPEN') {
                    <button class="btn btn-sm btn-primary" type="button" (click)="generate(session)">Generate bill</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted">No open sessions.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <div class="toolbar">
        <h2 class="grow">Bills</h2>
        <select class="input" name="billFilter" [ngModel]="billFilter" (ngModelChange)="setFilter($event)">
          <option value="">All bills</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAYMENT_PENDING">Payment pending</option>
          <option value="PAID">Paid</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Table</th>
              <th>Subtotal</th>
              <th>Tax</th>
              <th>Tip</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (bill of bills(); track bill.id) {
              <tr>
                <td>
                  <strong>{{ bill.billNumber }}</strong>
                  <div class="small muted">{{ bill.generatedAt | date: 'dd MMM, HH:mm' }}</div>
                </td>
                <td>{{ bill.tableNumber ?? '-' }}</td>
                <td>{{ bill.subtotal | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td>{{ bill.sgst + bill.cgst | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td>{{ bill.tipAmount | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td>{{ bill.grandTotal | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td><span class="badge badge-{{ tone(bill.status) }}">{{ bill.status | humanize }}</span></td>
                <td>
                  <div class="row">
                    <button class="btn btn-sm" type="button" (click)="openPdf(bill)">PDF</button>
                    @if (bill.status !== 'PAID') {
                      <button class="btn btn-sm btn-primary" type="button" (click)="settle(bill, 'CASH')">Paid in cash</button>
                      <button class="btn btn-sm" type="button" (click)="settle(bill, 'UPI')">Paid by UPI</button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="muted">No bills to show.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="card">
      <h2>Payments</h2>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Paid at</th>
            </tr>
          </thead>
          <tbody>
            @for (payment of payments(); track payment.id) {
              <tr>
                <td>{{ payment.billNumber }}</td>
                <td>{{ payment.paymentMethod | humanize }}</td>
                <td>{{ payment.amount | currency: 'INR' : 'symbol' : '1.2-2' }}</td>
                <td><span class="badge badge-{{ tone(payment.status) }}">{{ payment.status | humanize }}</span></td>
                <td>{{ payment.paidAt ? (payment.paidAt | date: 'dd MMM, HH:mm') : '-' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="muted">No payments recorded yet.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class BillingPageComponent implements OnInit {
  private readonly billing = inject(BillingApi);
  private readonly orders = inject(OrdersApi);

  readonly sessions = signal<SessionSummary[]>([]);
  readonly bills = signal<Bill[]>([]);
  readonly payments = signal<PaymentRecord[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  billFilter: '' | BillStatus = '';

  readonly tone = statusTone;

  ngOnInit(): void {
    this.loadSessions();
    this.loadBills();
    this.loadPayments();
  }

  setFilter(value: '' | BillStatus): void {
    this.billFilter = value;
    this.loadBills();
  }

  generate(session: SessionSummary): void {
    this.perform(this.billing.generate(session.sessionId), `Bill generated for ${session.sessionNumber}.`);
  }

  settle(bill: Bill, method: PaymentMethod): void {
    const label = method === 'CASH' ? 'cash' : 'UPI';
    if (!confirm(`Mark bill ${bill.billNumber} as paid by ${label}?`)) {
      return;
    }
    this.perform(this.billing.settle(bill.id, method), `Bill ${bill.billNumber} settled.`);
  }

  openPdf(bill: Bill): void {
    this.billing.pdf(bill.id).subscribe({
      next: blob => openBlob(blob),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The bill PDF could not be opened.')),
    });
  }

  private loadSessions(): void {
    this.orders.sessions().subscribe({
      next: sessions => this.sessions.set(sessions),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Sessions could not be loaded.')),
    });
  }

  private loadBills(): void {
    this.billing.bills(this.billFilter || undefined).subscribe({
      next: bills => this.bills.set(bills),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Bills could not be loaded.')),
    });
  }

  private loadPayments(): void {
    this.billing.payments().subscribe({
      next: payments => this.payments.set(payments),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Payments could not be loaded.')),
    });
  }

  private perform<T>(request: Observable<T>, success: string): void {
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: () => {
        this.notice.set(success);
        this.loadSessions();
        this.loadBills();
        this.loadPayments();
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The change could not be saved.')),
    });
  }
}
