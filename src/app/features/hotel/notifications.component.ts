import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { NotificationBadge } from '../../core/notification-badge';
import { NotificationView } from '../../core/models';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Notifications</h1>
        <p class="muted">Alerts about orders, bills, subscriptions and platform announcements.</p>
      </div>
      <button class="btn" type="button" [disabled]="unreadCount() === 0" (click)="markAll()">Mark all as read</button>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    <section class="card">
      <ul class="plain">
        @for (item of items(); track item.id) {
          <li class="notification" [class.unread]="!item.read">
            <div class="row between">
              <strong>{{ item.title }}</strong>
              <span class="small muted">{{ item.createdAt | date: 'dd MMM yyyy, HH:mm' }}</span>
            </div>
            <p>{{ item.message }}</p>
            @if (!item.read) {
              <button class="btn btn-sm" type="button" (click)="markRead(item)">Mark as read</button>
            }
          </li>
        } @empty {
          <li class="muted">You have no notifications.</li>
        }
      </ul>
    </section>
  `,
})
export class NotificationsPageComponent implements OnInit {
  private readonly api = inject(HotelApi);
  private readonly badge = inject(NotificationBadge);

  readonly items = signal<NotificationView[]>([]);
  readonly error = signal<string | null>(null);
  readonly unreadCount = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.notifications().subscribe({
      next: items => {
        this.items.set(items);
        this.syncUnread(items);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'Notifications could not be loaded.')),
    });
  }

  markRead(item: NotificationView): void {
    this.api.markRead(item.id).subscribe({
      next: () => this.load(),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The notification could not be updated.')),
    });
  }

  markAll(): void {
    this.api.markAllRead().subscribe({
      next: () => this.load(),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The notifications could not be updated.')),
    });
  }

  private syncUnread(items: NotificationView[]): void {
    const unread = items.filter(item => !item.read).length;
    this.unreadCount.set(unread);
    this.badge.unread.set(unread);
  }
}
