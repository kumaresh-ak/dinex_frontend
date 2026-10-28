import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { saveBlob } from '../../core/files';
import { AuditEntry, AuditFilter, ExportFormat, HotelProfile } from '../../core/models';

@Component({
  selector: 'app-audit-page',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Audit log</h1>
        <p class="muted">Every important change made across hotels. Filter the log and export it as a spreadsheet or PDF.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    <section class="card">
      <div class="form-grid">
        <label class="field">
          <span>Hotel</span>
          <select class="input" name="hotel" [(ngModel)]="hotelId">
            <option [ngValue]="null">All hotels</option>
            @for (hotel of hotels(); track hotel.id) {
              <option [ngValue]="hotel.id">{{ hotel.hotelName }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>Action contains</span>
          <input class="input" name="action" maxlength="100" placeholder="e.g. SUBSCRIPTION" [(ngModel)]="action" />
        </label>
        <label class="field">
          <span>From</span>
          <input class="input" name="from" type="date" [(ngModel)]="from" />
        </label>
        <label class="field">
          <span>To</span>
          <input class="input" name="to" type="date" [(ngModel)]="to" />
        </label>
      </div>
      <div class="row">
        <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="search()">Apply filters</button>
        <button class="btn" type="button" [disabled]="busy()" (click)="export('xlsx')">Export Excel</button>
        <button class="btn" type="button" [disabled]="busy()" (click)="export('pdf')">Export PDF</button>
      </div>
      <p class="small muted">Showing up to 500 latest entries. Exports include up to 5000 entries.</p>
    </section>

    <section class="card">
      <div class="table-wrap">
        <table class="table stacked">
          <thead>
            <tr>
              <th>When</th>
              <th>Hotel</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.id) {
              <tr>
                <td class="small" data-label="When">{{ entry.createdDate | date: 'dd MMM yyyy, h:mm a' }}</td>
                <td data-label="Hotel">{{ entry.hotelName ?? '-' }}</td>
                <td data-label="User">{{ entry.username ?? '-' }}</td>
                <td data-label="Action"><strong>{{ entry.action }}</strong></td>
                <td class="small" data-label="Entity">
                  {{ entry.entityType ?? '-' }}
                  @if (entry.entityId) {
                    <span class="muted">#{{ entry.entityId }}</span>
                  }
                </td>
                <td class="small" data-label="Details">{{ entry.details ?? '-' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted">{{ loaded() ? 'No audit entries match these filters.' : 'Loading audit entries...' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AuditPageComponent implements OnInit {
  private readonly api = inject(PlatformApi);

  readonly hotels = signal<HotelProfile[]>([]);
  readonly entries = signal<AuditEntry[]>([]);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  hotelId: number | null = null;
  action = '';
  from = '';
  to = '';

  ngOnInit(): void {
    this.api.hotels(0, 200).subscribe({
      next: page => this.hotels.set(page.content),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Hotels could not be loaded.')),
    });
    this.search();
  }

  search(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.auditLogs(this.filter()).subscribe({
      next: entries => {
        this.entries.set(entries);
        this.loaded.set(true);
        this.busy.set(false);
      },
      error: (e: unknown) => {
        this.loaded.set(true);
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The audit log could not be loaded.'));
      },
    });
  }

  export(format: ExportFormat): void {
    const filter = this.filter();
    this.busy.set(true);
    this.error.set(null);
    this.api.exportAuditLogs(filter, format).subscribe({
      next: blob => {
        this.busy.set(false);
        saveBlob(blob, `audit-log-${new Date().toISOString().slice(0, 10)}.${format}`);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The audit log could not be exported.'));
      },
    });
  }

  private filter(): AuditFilter {
    return {
      hotelId: this.hotelId ?? undefined,
      action: this.action.trim() || undefined,
      from: this.from || undefined,
      to: this.to || undefined,
    };
  }
}
