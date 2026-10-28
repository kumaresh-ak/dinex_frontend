import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { OrdersApi } from '../../core/api/orders.api';
import { Order, OrderStatus } from '../../core/models';
import { RealtimeService } from '../../core/realtime/realtime.service';

interface OrderAction {
  label: string;
  to: OrderStatus;
  danger?: boolean;
}

const ACTIVE_STATUSES: OrderStatus[] = ['ORDERED', 'ACCEPTED', 'COOKING', 'READY'];

@Component({
  selector: 'app-orders-page',
  standalone: true,
  template: `
    <header class="page-head">
      <div>
        <h1>Live orders</h1>
        <p class="muted">Orders appear here as guests place them and update in realtime.</p>
      </div>
      <button class="btn" type="button" (click)="load()">Refresh</button>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    <div class="board">
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
                    {{ line.quantity }} × {{ line.itemName }}
                    @if (line.specialInstructions) {
                      <em class="muted">({{ line.specialInstructions }})</em>
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
                    type="button"
                    [class.btn-danger]="action.danger"
                    [disabled]="busyId() === order.id"
                    (click)="move(order, action)"
                  >{{ action.label }}</button>
                }
              </div>
            </article>
          } @empty {
            <p class="muted small">No orders.</p>
          }
        </section>
      }
    </div>
  `,
})
export class OrdersPageComponent implements OnInit {
  private readonly api = inject(OrdersApi);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
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

  load(): void {
    this.api.orders(ACTIVE_STATUSES).subscribe({
      next: orders => {
        this.orders.set(orders);
        this.error.set(null);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'Orders could not be loaded.')),
    });
  }

  ordersIn(status: OrderStatus): Order[] {
    return this.orders().filter(order => order.status === status);
  }

  actionsFor(order: Order): OrderAction[] {
    switch (order.status) {
      case 'ORDERED':
        return [
          { label: 'Accept', to: 'ACCEPTED' },
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

  move(order: Order, action: OrderAction): void {
    if (action.to === 'CANCELLED' && !confirm(`Cancel order ${order.orderNumber}?`)) {
      return;
    }
    this.busyId.set(order.id);
    this.api.setStatus(order.id, action.to).subscribe({
      next: () => {
        this.busyId.set(null);
        this.load();
      },
      error: (e: unknown) => {
        this.busyId.set(null);
        this.error.set(errorMessage(e, 'The order status could not be changed.'));
      },
    });
  }

  minutesSince(iso: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  }
}
