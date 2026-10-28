import { Injectable, signal } from '@angular/core';

/** Shared unread notification count shown in the hotel console header. */
@Injectable({ providedIn: 'root' })
export class NotificationBadge {
  readonly unread = signal(0);
}
