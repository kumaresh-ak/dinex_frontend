import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { GuestApi, OrderRequestLine } from '../../core/api/guest.api';
import { assetUrl, openBlob } from '../../core/files';
import { GuestSession, PaymentMethod, TableMenu, TableMenuItem } from '../../core/models';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { HumanizePipe, statusTone } from '../../core/ui';

type GuestTab = 'menu' | 'orders' | 'bill';

interface CartLine {
  item: TableMenuItem;
  quantity: number;
}

/** Guest journey from the table QR: menu, ordering, live order status, bill, payment and feedback. */
@Component({
  selector: 'app-guest-page',
  standalone: true,
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe, HumanizePipe],
  template: `
    <div class="guest" [class.has-cart]="cartCount() > 0">
      @if (session(); as s) {
        <header class="guest-head">
          @if (assetUrl(s.logoUrl); as logo) {
            <img class="guest-logo" [src]="logo" alt="" />
          }
          <div>
            <strong>{{ s.hotelName }}</strong>
            <small>Table {{ s.tableNumber }} · {{ s.sessionNumber }}</small>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" (click)="callWaiter()" [disabled]="busy() || s.status === 'CLOSED'">Call waiter</button>
        </header>

        @if (error(); as message) {
          <div class="alert alert-error">{{ message }}</div>
        }
        @if (notice(); as message) {
          <div class="alert alert-ok">{{ message }}</div>
        }

        @if (!s.customerName && s.status === 'OPEN') {
          <section class="card">
            <h2>Your details</h2>
            <p class="muted small">Add your name and mobile number so the bill is issued in your name.</p>
            <form #idForm="ngForm" class="form-grid" (ngSubmit)="identify()">
              <label class="field"><span>Name</span><input class="input" name="customerName" required [(ngModel)]="customerName" /></label>
              <label class="field"><span>Mobile</span><input class="input" name="customerMobile" required [(ngModel)]="customerMobile" /></label>
              <label class="field"><span>Table number</span><input class="input" name="customerTable" required [(ngModel)]="customerTable" /></label>
              <button class="btn btn-primary" type="submit" [disabled]="busy() || idForm.invalid">Save</button>
            </form>
          </section>
        }

        <nav class="tabs" aria-label="Guest sections">
          <button type="button" class="tab" [class.active]="tab() === 'menu'" (click)="tab.set('menu')">Menu</button>
          <button type="button" class="tab" [class.active]="tab() === 'orders'" (click)="tab.set('orders')">My orders</button>
          <button type="button" class="tab" [class.active]="tab() === 'bill'" (click)="tab.set('bill')">Bill</button>
        </nav>

        @if (tab() === 'menu') {
          @if (s.status !== 'OPEN') {
            <div class="alert alert-info">Ordering is closed for this table. You can still review your bill.</div>
          } @else {
          @if (menu(); as m) {
            @if (!m.ordersAccepting) {
              <div class="alert alert-info">The kitchen is not taking orders right now.</div>
            }
            @for (category of m.categories; track category.id) {
              <section class="card">
                <h2>{{ category.name }}</h2>
                @for (item of category.items; track item.id) {
                  <article class="menu-item">
                    @if (assetUrl(item.imageUrl); as image) {
                      <img class="menu-thumb" [src]="image" alt="" />
                    }
                    <div class="grow">
                      <strong>{{ item.name }}</strong>
                      <small class="muted">{{ item.foodType | humanize }} · {{ item.preparationMinutes }} min</small>
                      @if (item.description) {
                        <p class="small menu-desc" [class.expanded]="isExpanded(item.id)">{{ item.description }}</p>
                        @if (item.description.length > 80) {
                          <button class="link-btn" type="button" (click)="toggleDescription(item.id)">{{ isExpanded(item.id) ? 'less' : 'more' }}</button>
                        }
                      }
                    </div>
                    <div class="menu-actions">
                      <strong>{{ item.price | currency: 'INR' : 'symbol' : '1.2-2' }}</strong>
                      @if (item.available && m.ordersAccepting) {
                        @if (qty(item.id) === 0) {
                          <button class="btn btn-sm" type="button" (click)="change(item, 1)">Add</button>
                        } @else {
                          <div class="stepper">
                            <button type="button" (click)="change(item, -1)" aria-label="Remove one">-</button>
                            <span>{{ qty(item.id) }}</span>
                            <button type="button" (click)="change(item, 1)" aria-label="Add one">+</button>
                          </div>
                        }
                      } @else {
                        <span class="badge badge-muted">Unavailable</span>
                      }
                    </div>
                  </article>
                }
              </section>
            }
            @if (cartCount() > 0) {
              <div class="cart-bar">
                <div class="grow">
                  <strong>{{ cartCount() }} item(s)</strong>
                  <small>{{ cartTotal() | currency: 'INR' : 'symbol' : '1.2-2' }} before tax</small>
                </div>
                <input class="input" name="notes" placeholder="Notes for the kitchen (optional)" [(ngModel)]="notes" />
                <button class="btn btn-primary" type="button" (click)="placeOrder()" [disabled]="busy() || !s.customerName || !s.customerMobile">Place order</button>
                @if (!s.customerName) {
                  <small class="muted">Add your name, mobile and table number above to order.</small>
                }
              </div>
            }
          } @else {
            <p class="muted">Loading menu...</p>
          }
          }
        }

        @if (tab() === 'orders') {
          @if (s.orders.length === 0) {
            <p class="muted">No orders yet. Pick something from the menu.</p>
          }
          @for (order of s.orders; track order.id) {
            <section class="card">
              <div class="row between">
                <strong>{{ order.orderNumber }}</strong>
                <span class="badge badge-{{ tone(order.status) }}">{{ order.status | humanize }}</span>
              </div>
              <small class="muted">{{ order.createdAt | date: 'shortTime' }}</small>
              <ul class="plain">
                @for (line of order.items; track line.menuItemId + line.itemName) {
                  <li>{{ line.quantity }} x {{ line.itemName }}
                    @if (line.specialInstructions) { <em class="muted"> ({{ line.specialInstructions }})</em> }
                  </li>
                }
              </ul>
            </section>
          }
        }

        @if (tab() === 'bill') {
          <section class="card">
            <h2>Bill summary</h2>
            <dl class="totals">
              <dt>Subtotal</dt><dd>{{ s.subtotal | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
              <dt>SGST</dt><dd>{{ s.sgst | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
              <dt>CGST</dt><dd>{{ s.cgst | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
              <dt>Tip</dt><dd>{{ s.tipAmount | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
              <dt class="grand">Total</dt><dd class="grand">{{ s.grandTotal | currency: 'INR' : 'symbol' : '1.2-2' }}</dd>
            </dl>

            @if (s.status === 'OPEN') {
              <button class="btn btn-primary btn-block" type="button" (click)="requestBill()" [disabled]="busy() || s.orders.length === 0">Request bill</button>
              @if (s.orders.length === 0) {
                <p class="muted small">Place an order before requesting the bill.</p>
              }
            }

            @if (s.billId && s.billStatus === 'UNPAID') {
              <div class="stack">
                <label class="field"><span>Tip (optional)</span>
                  <div class="row">
                    <input class="input" name="tip" type="number" min="0" step="1" [(ngModel)]="tipAmount" />
                    <button class="btn" type="button" (click)="saveTip()" [disabled]="busy()">Save tip</button>
                  </div>
                </label>
                <fieldset class="field">
                  <legend>Payment method</legend>
                  <label class="radio"><input type="radio" name="method" value="CASH" [(ngModel)]="paymentMethod" /> Cash to staff</label>
                  <label class="radio"><input type="radio" name="method" value="UPI" [(ngModel)]="paymentMethod" /> UPI</label>
                </fieldset>
                <button class="btn btn-primary btn-block" type="button" (click)="pay()" [disabled]="busy()">Confirm payment method</button>
                <button class="btn btn-ghost btn-block" type="button" (click)="downloadBill()">Download bill (PDF)</button>
              </div>
            }

            @if (s.billStatus === 'PAYMENT_PENDING') {
              <div class="alert alert-info">
                Payment is awaiting confirmation from staff.
                @if (s.paymentMethod === 'UPI') {
                  <div class="upi">
                    <p>Pay {{ s.grandTotal | currency: 'INR' : 'symbol' : '1.2-2' }} to UPI ID <strong>{{ s.upiId }}</strong>.</p>
                    @if (assetUrl(s.qrImageUrl); as qr) {
                      <img class="payment-qr" [src]="qr" alt="Payment QR code" />
                    }
                  </div>
                }
              </div>
            }

            @if (s.billStatus === 'PAID' || s.status === 'PAID' || s.status === 'CLOSED') {
              <div class="alert alert-ok">Payment received. Thank you for dining with us.</div>
              <button class="btn btn-ghost btn-block" type="button" (click)="downloadBill()">Download bill (PDF)</button>
            }

            @if ((s.status === 'PAID' || s.status === 'CLOSED') && !s.feedbackSubmitted) {
              <form #fbForm="ngForm" class="stack feedback" (ngSubmit)="sendFeedback()">
                <h3>How was your visit?</h3>
                <label class="field"><span>Rating</span>
                  <select class="input" name="rating" [(ngModel)]="rating">
                    @for (value of [5, 4, 3, 2, 1]; track value) {
                      <option [ngValue]="value">{{ value }} / 5</option>
                    }
                  </select>
                </label>
                <label class="field"><span>Comments (optional)</span>
                  <textarea class="input" name="comments" rows="3" maxlength="1000" [(ngModel)]="comments"></textarea>
                </label>
                <button class="btn btn-primary" type="submit" [disabled]="busy() || fbForm.invalid">Submit feedback</button>
              </form>
            }
          </section>
        }
      } @else {
        @if (error(); as message) {
          <div class="alert alert-error">{{ message }}</div>
        } @else {
          <p class="muted">Loading your table...</p>
        }
      }
    </div>
  `,
})
export class GuestPageComponent implements OnInit {
  private readonly api = inject(GuestApi);
  private readonly realtime = inject(RealtimeService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly assetUrl = assetUrl;
  readonly sessionToken = this.route.snapshot.paramMap.get('sessionToken') ?? '';
  readonly qrToken = this.route.snapshot.queryParamMap.get('t') ?? '';

  readonly session = signal<GuestSession | null>(null);
  readonly menu = signal<TableMenu | null>(null);
  readonly tab = signal<GuestTab>('menu');
  readonly cart = signal<Record<number, number>>({});
  readonly expandedDescriptions = signal<ReadonlySet<number>>(new Set());
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);

  readonly cartLines = computed<CartLine[]>(() => {
    const items = new Map<number, TableMenuItem>();
    for (const category of this.menu()?.categories ?? []) {
      for (const item of category.items) {
        items.set(item.id, item);
      }
    }
    const lines: CartLine[] = [];
    for (const [id, quantity] of Object.entries(this.cart())) {
      const item = items.get(Number(id));
      if (item && quantity > 0) {
        lines.push({ item, quantity });
      }
    }
    return lines;
  });
  readonly cartCount = computed(() => this.cartLines().reduce((sum, line) => sum + line.quantity, 0));
  readonly cartTotal = computed(() => this.cartLines().reduce((sum, line) => sum + line.item.price * line.quantity, 0));

  customerName = '';
  customerMobile = '';
  customerTable = '';
  notes = '';
  tipAmount = 0;
  paymentMethod: PaymentMethod = 'CASH';
  rating = 5;
  comments = '';

  ngOnInit(): void {
    this.load();
    this.realtime.subscribe(`/topic/sessions/${this.sessionToken}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  tone(status: string): string {
    return statusTone(status);
  }

  qty(id: number): number {
    return this.cart()[id] ?? 0;
  }

  isExpanded(id: number): boolean {
    return this.expandedDescriptions().has(id);
  }

  toggleDescription(id: number): void {
    this.expandedDescriptions.update(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  change(item: TableMenuItem, delta: number): void {
    const next = Math.max(0, this.qty(item.id) + delta);
    this.cart.update(current => ({ ...current, [item.id]: next }));
  }

  placeOrder(): void {
    if (!this.session()?.customerName) {
      this.error.set('Enter your name, mobile number and table number before ordering.');
      return;
    }
    const items: OrderRequestLine[] = this.cartLines().map(line => ({ menuItemId: line.item.id, quantity: line.quantity }));
    if (items.length === 0) {
      return;
    }
    this.run(this.api.placeOrder(this.sessionToken, items, this.notes.trim()), 'Order sent to the kitchen.', () => {
      this.cart.set({});
      this.notes = '';
      this.tab.set('orders');
    });
  }

  identify(): void {
    const session = this.session();
    if (!session || this.customerTable.trim() !== session.tableNumber) {
      this.error.set('The table number does not match this table. Check the number on your table.');
      return;
    }
    this.run(this.api.identify(this.sessionToken, this.customerName.trim(), this.customerMobile.trim()), 'Thanks, your details are saved.');
  }

  callWaiter(): void {
    this.run(this.api.callWaiter(this.sessionToken), 'A team member has been notified.');
  }

  requestBill(): void {
    this.run(this.api.requestBill(this.sessionToken), 'Bill generated. Review it below.', () => this.tab.set('bill'));
  }

  saveTip(): void {
    this.run(this.api.setTip(this.sessionToken, Number(this.tipAmount) || 0), 'Tip updated.');
  }

  pay(): void {
    const method = this.paymentMethod;
    this.run(
      this.api.pay(this.sessionToken, method),
      method === 'UPI' ? 'Show the UPI payment and wait for staff to confirm.' : 'Noted. Please pay the cash to our staff.'
    );
  }

  sendFeedback(): void {
    this.run(this.api.feedback(this.sessionToken, this.rating, this.comments.trim()), 'Thank you for your feedback.');
  }

  downloadBill(): void {
    this.api.billPdf(this.sessionToken).subscribe({
      next: blob => openBlob(blob),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The bill could not be downloaded.')),
    });
  }

  private load(): void {
    this.api.session(this.sessionToken).subscribe({
      next: session => {
        this.session.set(session);
        this.error.set(null);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'This session could not be found. Scan the table QR code again.')),
    });
    if (this.qrToken && !this.menu()) {
      this.api.menu(this.qrToken).subscribe({
        next: menu => this.menu.set(menu),
        error: (e: unknown) => this.error.set(errorMessage(e, 'The menu could not be loaded.')),
      });
    }
  }

  private run<T>(request: Observable<T>, success: string, onDone?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set(success);
        onDone?.();
        this.load();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e));
      },
    });
  }
}
