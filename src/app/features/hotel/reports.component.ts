import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { saveBlob } from '../../core/files';
import { DateRange, ExportFormat, ReportPeriod, ReportTable, ReportType } from '../../core/models';
import { isoDate } from '../../core/ui';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'SALES', label: 'Sales summary' },
  { value: 'ITEMS', label: 'Items sold' },
  { value: 'CATEGORY', label: 'Sales by category' },
  { value: 'TABLE', label: 'Sales by table' },
  { value: 'TAX', label: 'Tax (GST)' },
  { value: 'TIPS', label: 'Tips' },
  { value: 'PAYMENTS', label: 'Payments' },
];

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="page-head">
      <div>
        <h1>Reports</h1>
        <p class="muted">Pick a report and date range. Export the same data as a spreadsheet or PDF.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }

    <section class="card">
      <div class="form-grid">
        <label class="field">
          <span>Report</span>
          <select class="input" name="type" [(ngModel)]="type">
            @for (option of types; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span>From</span>
          <input class="input" name="from" type="date" required [(ngModel)]="from" />
        </label>
        <label class="field">
          <span>To</span>
          <input class="input" name="to" type="date" required [(ngModel)]="to" />
        </label>
        <label class="field">
          <span>Group by</span>
          <select class="input" name="period" [(ngModel)]="period">
            @for (option of periods; track option) {
              <option [value]="option">{{ option === 'DAY' ? 'Day' : option === 'WEEK' ? 'Week' : option === 'MONTH' ? 'Month' : 'Year' }}</option>
            }
          </select>
        </label>
      </div>
      <div class="row">
        <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="run()">Run report</button>
        <button class="btn" type="button" [disabled]="busy() || !table()" (click)="export('xlsx')">Export Excel</button>
        <button class="btn" type="button" [disabled]="busy() || !table()" (click)="export('pdf')">Export PDF</button>
      </div>
    </section>

    @if (table(); as report) {
      <section class="card">
        <h2>{{ report.title }}</h2>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                @for (header of report.headers; track $index) {
                  <th>{{ header }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of report.rows; track $index) {
                <tr>
                  @for (cell of row; track $index) {
                    <td>{{ cell }}</td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="report.headers.length" class="muted">No data for this range.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
})
export class ReportsPageComponent {
  private readonly api = inject(HotelApi);

  readonly types = REPORT_TYPES;
  readonly periods: ReportPeriod[] = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

  readonly table = signal<ReportTable | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  type: ReportType = 'SALES';
  period: ReportPeriod = 'DAY';
  from = isoDate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  to = isoDate(new Date());

  run(): void {
    this.busy.set(true);
    this.error.set(null);
    this.api.report(this.type, this.range()).subscribe({
      next: report => {
        this.table.set(report);
        this.busy.set(false);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The report could not be created.'));
      },
    });
  }

  export(format: ExportFormat): void {
    const range = this.range();
    this.busy.set(true);
    this.error.set(null);
    this.api.exportReport(this.type, range, format).subscribe({
      next: blob => {
        this.busy.set(false);
        saveBlob(blob, `${this.type.toLowerCase()}-${range.from}-${range.to}.${format}`);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The report could not be exported.'));
      },
    });
  }

  private range(): DateRange {
    return { from: this.from, to: this.to, period: this.period };
  }
}
