import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { SupportStatus, SupportTicket, SupportTicketRequest } from '../../core/models';
import { HumanizePipe } from '../../core/ui';

const blankTicket = (): SupportTicketRequest => ({ subject: '', message: '' });

@Component({
  selector: 'app-hotel-support-page',
  standalone: true,
  imports: [FormsModule, DatePipe, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Support</h1>
        <p class="muted">Raise a ticket for any problem or question. The platform team replies here with a resolution.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <section class="card">
      <h2>Raise a ticket</h2>
      <form #ticketForm="ngForm" (ngSubmit)="submit()">
        <label class="field">
          <span>Subject</span>
          <input class="input" name="subject" required maxlength="200" [(ngModel)]="form.subject" />
        </label>
        <label class="field">
          <span>Describe the issue</span>
          <textarea class="input" name="message" rows="4" required maxlength="4000" [(ngModel)]="form.message"></textarea>
        </label>
        <div class="row">
          <button class="btn btn-primary" type="submit" [disabled]="busy() || ticketForm.invalid">Submit ticket</button>
        </div>
      </form>
    </section>

    <section class="card">
      <h2>Your tickets</h2>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Raised</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            @for (ticket of tickets(); track ticket.id) {
              <tr>
                <td class="small">{{ ticket.createdDate | date: 'dd MMM yyyy, h:mm a' }}</td>
                <td>
                  <strong>{{ ticket.subject }}</strong>
                  <div class="small muted">{{ ticket.message }}</div>
                </td>
                <td>
                  <span class="badge" [class]="'badge ' + tone(ticket.status)">{{ ticket.status | humanize }}</span>
                </td>
                <td>
                  @if (ticket.resolution) {
                    <div class="small">{{ ticket.resolution }}</div>
                    @if (ticket.resolvedDate) {
                      <div class="small muted">{{ ticket.resolvedDate | date: 'dd MMM yyyy, h:mm a' }}</div>
                    }
                  } @else {
                    <span class="muted small">Awaiting response</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="muted">You have not raised any tickets yet.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class HotelSupportPageComponent implements OnInit {
  private readonly api = inject(HotelApi);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);

  form: SupportTicketRequest = blankTicket();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.supportTickets().subscribe({
      next: tickets => this.tickets.set(tickets),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Your tickets could not be loaded.')),
    });
  }

  submit(): void {
    const body: SupportTicketRequest = {
      subject: this.form.subject.trim(),
      message: this.form.message.trim(),
    };
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.raiseTicket(body).subscribe({
      next: () => {
        this.busy.set(false);
        this.notice.set('Ticket raised. We will update the status here.');
        this.form = blankTicket();
        this.load();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The ticket could not be submitted.'));
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
}
