import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { HotelApi } from '../../core/api/hotel.api';
import { AlertSound } from '../../core/alert-sound';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationView } from '../../core/models';
import { NotificationBadge } from '../../core/notification-badge';
import { RealtimeService } from '../../core/realtime/realtime.service';

export interface NavItem {
  label: string;
  path: string;
}

/** Shared layout for the restaurant console and the platform console. */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar" [class.open]="navOpen()">
        <div class="sidebar-top">
          <div class="brand-lockup"><span class="brand-mark">D</span><div><strong>DineX</strong><small>{{ consoleName() }}</small></div></div>
          <button class="btn btn-sm menu-toggle" type="button" [attr.aria-expanded]="navOpen()" (click)="navOpen.set(!navOpen())">{{ navOpen() ? 'Close' : 'Menu' }}</button>
        </div>
        <nav class="nav" (click)="navOpen.set(false)">
          @for (item of nav; track item.path) {
            <a class="nav-link" [routerLink]="item.path" routerLinkActive="active">
              <span>{{ item.label }}</span>
              @if (item.path === '/hotel/notifications' && badge.unread() > 0) {
                <span class="count">{{ badge.unread() }}</span>
              }
            </a>
          }
        </nav>
        <div class="sidebar-foot">
          <div class="who">
            <strong>{{ auth.session()?.displayName }}</strong>
            <small>{{ auth.session()?.username }}</small>
          </div>
          <a class="nav-link" [routerLink]="accountPath()" routerLinkActive="active" (click)="navOpen.set(false)">Account</a>
          <button class="btn btn-ghost btn-block" type="button" (click)="auth.logout()">Sign out</button>
        </div>
      </aside>
      <main class="content">
        @if (toast(); as note) {
          <div class="alert alert-info row between" role="alert">
            <div>
              <strong>{{ note.title }}</strong>
              <div class="small">{{ note.message }}</div>
            </div>
            <button class="btn btn-sm" type="button" (click)="toast.set(null)">Dismiss</button>
          </div>
        }
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly badge = inject(NotificationBadge);
  private readonly api = inject(HotelApi);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly sound = inject(AlertSound);

  readonly toast = signal<NotificationView | null>(null);
  readonly navOpen = signal(false);
  readonly nav: NavItem[] = (this.route.snapshot.data['nav'] as NavItem[] | undefined) ?? [];
  readonly consoleName = signal(this.auth.role() === 'SUPER_ADMIN' ? 'Platform console' : 'Restaurant console');

  ngOnInit(): void {
    if (this.auth.role() !== 'HOTEL_ADMIN') {
      return;
    }
    this.api.unreadCount().pipe(catchError(() => of({ unread: 0 }))).subscribe(result => this.badge.unread.set(result.unread));
    const hotelId = this.auth.hotelId();
    if (hotelId !== null) {
      this.realtime.subscribe(`/topic/hotels/${hotelId}/events`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (event.type === 'NOTIFICATION') {
            this.badge.unread.update(count => count + 1);
            this.toast.set(event.payload as NotificationView);
            this.sound.play();
          }
        });
    }
  }

  accountPath(): string {
    return this.auth.role() === 'SUPER_ADMIN' ? '/admin/account' : '/hotel/account';
  }
}
