import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertSound } from '../../core/alert-sound';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { OrdersApi } from '../../core/api/orders.api';
import { Order, OrderStatus } from '../../core/models';
import { RealtimeService } from '../../core/realtime/realtime.service';

interface KitchenAction {
  label: string;
  to: OrderStatus;
  danger?: boolean;
}

@Component({
  selector: 'app-kitchen-page',
  standalone: true,
  template: `
    <header class="kitchen-bar">
      <div>
        <strong>Kitchen display</strong>
        <span class="small muted"> · {{ auth.session()?.displayName }}</span>
      </div>
      <div class="row">
        <button class="btn btn-sm" type="button" (click)="load()">Refresh</button>
        <button class="btn btn-sm btn-ghost" type="button" (click)="auth.logout()">Sign out</button>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    @if (newOrderNotice(); as message) {
      <div class="alert alert-info row between" role="alert">
        <strong>{{ message }}</strong>
        <button class="btn btn-sm" type="button" (click)="newOrderNotice.set(null)">Dismiss</button>
      </div>
    }

    <div class="board kitchen-board">
      @for (column of columns; track column.status) {
        <section class="board-col">
          <h3>
            <span>{{ column.title }}</span>
            <span class="badge badge-muted">{{ ordersIn(column.status).length }}</span>
          </h3>
          @for (order of ordersIn(column.status); track order.id) {
            <article class="ticket" [class.urgent]="minutesSince(order.createdAt) >= 15">
              <div class="row between">
                <strong>{{ order.orderNumber }}</strong>
                <span class="small muted">{{ order.tableNumber ?? 'No table' }} · {{ minutesSince(order.createdAt) }} min</span>
              </div>
              <ul>
                @for (line of order.items; track $index) {
                  <li>
                    <strong>{{ line.quantity }} ×</strong> {{ line.itemName }}
                    @if (line.specialInstructions) {
                      <div class="small warn-text">{{ line.specialInstructions }}</div>
                    }
                  </li>
                }
              </ul>
              @if (order.notes) {
                <p class="small muted">Note: {{ order.notes }}</p>
              }
              <div class="actions">
                @for (action of actionsFor(order); track action.to) {
                  <button
                    class="btn btn-sm"
                    [class.btn-primary]="!action.danger"
                    [class.btn-danger]="action.danger"
                    type="button"
                    [disabled]="busyId() === order.id"
                    (click)="advance(order, action)"
                  >{{ action.label }}</button>
                }
              </div>
            </article>
          } @empty {
            <p class="muted small">Nothing here.</p>
          }
        </section>
      }
    </div>
  `,
})
export class KitchenPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(OrdersApi);
  private readonly realtime = inject(RealtimeService);
  private readonly sound = inject(AlertSound);
  private readonly destroyRef = inject(DestroyRef);

  readonly columns: { status: OrderStatus; title: string }[] = [
    { status: 'ORDERED', title: 'New' },
    { status: 'ACCEPTED', title: 'Accepted' },
    { status: 'COOKING', title: 'Cooking' },
    { status: 'READY', title: 'Ready to serve' },
  ];

  readonly orders = signal<Order[]>([]);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<number | null>(null);
  readonly newOrderNotice = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
    const hotelId = this.auth.hotelId();
    if (hotelId !== null) {
      this.realtime
        .subscribe(`/topic/hotels/${hotelId}/events`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.type === 'ORDER_PLACED') {
            this.announce(event.payload as Order);
          }
          this.load();
        });
    }
  }

  announce(order: Order): void {
    this.sound.play();
    this.newOrderNotice.set(`New order ${order.orderNumber} from ${order.tableNumber ?? 'a table'}`);
  }

  load(): void {
    this.api.kitchenQueue().subscribe({
      next: orders => {
        this.orders.set(orders);
        this.error.set(null);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'Kitchen orders could not be loaded.')),
    });
  }

  ordersIn(status: OrderStatus): Order[] {
    return this.orders().filter(order => order.status === status);
  }

  actionsFor(order: Order): KitchenAction[] {
    switch (order.status) {
      case 'ORDERED':
        return [
          { label: 'Accept order', to: 'ACCEPTED' },
          { label: 'Cancel', to: 'CANCELLED', danger: true },
        ];
      case 'ACCEPTED':
        return [
          { label: 'Start cooking', to: 'COOKING' },
          { label: 'Cancel', to: 'CANCELLED', danger: true },
        ];
      case 'COOKING':
        return [{ label: 'Mark ready', to: 'READY' }];
      case 'READY':
        return [{ label: 'Mark served', to: 'SERVED' }];
      default:
        return [];
    }
  }

  advance(order: Order, action: KitchenAction): void {
    if (action.to === 'CANCELLED' && !confirm(`Cancel order ${order.orderNumber}?`)) {
      return;
    }
    this.busyId.set(order.id);
    this.api.kitchenSetStatus(order.id, action.to).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (e: unknown) => {
        this.busyId.set(null);
        this.error.set(errorMessage(e, 'The order could not be updated.'));
      },
    });
  }

  minutesSince(iso: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  }
}
