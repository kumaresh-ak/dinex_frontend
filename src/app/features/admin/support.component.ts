import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { SupportStatus, SupportTicket } from '../../core/models';
import { HumanizePipe } from '../../core/ui';

interface TicketRow {
  ticket: SupportTicket;
  status: SupportStatus;
  resolution: string;
  saving: boolean;
}

const STATUSES: SupportStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

@Component({
  selector: 'app-admin-support-page',
  standalone: true,
  imports: [FormsModule, DatePipe, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Support tickets</h1>
        <p class="muted">Review tickets raised by hotel owners. Add a resolution and update the status. Resolved and closed tickets need a resolution.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <section class="card">
      <div class="toolbar">
        <h2 class="grow">Tickets</h2>
        <select class="input" name="statusFilter" [ngModel]="filter()" (ngModelChange)="setFilter($event)">
          <option value="">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ status | humanize }}</option>
          }
        </select>
      </div>

      @for (row of rows(); track row.ticket.id) {
        <article class="ticket-row">
          <header class="row between">
            <div>
              <strong>{{ row.ticket.subject }}</strong>
              <div class="small muted">
                {{ row.ticket.hotelName ?? 'Unknown hotel' }} · {{ row.ticket.createdBy ?? '-' }} · {{ row.ticket.createdDate | date: 'dd MMM yyyy, h:mm a' }}
              </div>
            </div>
            <span class="badge" [class]="'badge ' + tone(row.ticket.status)">{{ row.ticket.status | humanize }}</span>
          </header>

          <p class="ticket-message">{{ row.ticket.message }}</p>

          <div class="form-grid">
            <label class="field">
              <span>Status</span>
              <select class="input" [name]="'status-' + row.ticket.id" [(ngModel)]="row.status">
                @for (status of statuses; track status) {
                  <option [value]="status">{{ status | humanize }}</option>
                }
              </select>
            </label>
          </div>
          <label class="field">
            <span>Resolution</span>
            <textarea class="input" rows="3" maxlength="4000" [name]="'resolution-' + row.ticket.id" [(ngModel)]="row.resolution"></textarea>
          </label>
          <div class="row">
            <button class="btn btn-primary" type="button" [disabled]="row.saving" (click)="save(row)">Save update</button>
            @if (row.ticket.resolvedDate) {
              <span class="small muted">Resolved {{ row.ticket.resolvedDate | date: 'dd MMM yyyy, h:mm a' }}</span>
            }
          </div>
        </article>
      } @empty {
        <p class="muted">No tickets to show.</p>
      }
    </section>
  `,
  styles: [
    `
      .ticket-row {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
      }
      .ticket-message {
        white-space: pre-wrap;
        margin: 10px 0;
      }
    `,
  ],
})
export class AdminSupportPageComponent implements OnInit {
  private readonly api = inject(PlatformApi);

  readonly statuses = STATUSES;
  readonly rows = signal<TicketRow[]>([]);
  readonly filter = signal<SupportStatus | ''>('');
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  setFilter(value: SupportStatus | ''): void {
    this.filter.set(value);
    this.load();
  }

  load(): void {
    const status = this.filter() || undefined;
    this.api.supportTickets(status).subscribe({
      next: tickets => this.rows.set(tickets.map(ticket => this.toRow(ticket))),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Tickets could not be loaded.')),
    });
  }

  save(row: TicketRow): void {
    const resolution = row.resolution.trim();
    if ((row.status === 'RESOLVED' || row.status === 'CLOSED') && !resolution) {
      this.error.set('Add a resolution before marking the ticket as resolved or closed.');
      return;
    }
    row.saving = true;
    this.error.set(null);
    this.notice.set(null);
    this.api
      .updateSupportTicket(row.ticket.id, { status: row.status, resolution: resolution || undefined })
      .subscribe({
        next: updated => {
          row.saving = false;
          this.notice.set(`Ticket #${updated.id} updated.`);
          this.rows.update(list => list.map(r => (r.ticket.id === updated.id ? this.toRow(updated) : r)));
        },
        error: (e: unknown) => {
          row.saving = false;
          this.error.set(errorMessage(e, 'The ticket could not be updated.'));
        },
      });
  }

  tone(status: SupportStatus): string {
    switch (status) {
      case 'OPEN':
        return 'badge-warn';
      case 'IN_PROGRESS':
        return 'badge-info';
      case 'RESOLVED':
        return 'badge-ok';
      default:
        return 'badge-muted';
    }
  }

  private toRow(ticket: SupportTicket): TicketRow {
    return { ticket, status: ticket.status, resolution: ticket.resolution ?? '', saving: false };
  }
}
