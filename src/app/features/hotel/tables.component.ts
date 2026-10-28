import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { TablesApi } from '../../core/api/tables.api';
import { saveBlob } from '../../core/files';
import { DiningTable, TableRequest } from '../../core/models';

const blankTable = (): TableRequest => ({ tableNumber: '', tableName: '', capacity: 4, enabled: true });

@Component({
  selector: 'app-tables-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="page-head">
      <div>
        <h1>Tables and QR codes</h1>
        <p class="muted">Guests scan a table's QR code to open the menu. Regenerating a code stops the old one from working.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <section class="card">
      <h2>{{ editingId === null ? 'Add table' : 'Edit table' }}</h2>
      <form #tableForm="ngForm" (ngSubmit)="save()">
        <div class="form-grid">
          <label class="field">
            <span>Table number</span>
            <input class="input" name="tableNumber" required maxlength="20" [(ngModel)]="form.tableNumber" />
          </label>
          <label class="field">
            <span>Display name (optional)</span>
            <input class="input" name="tableName" maxlength="60" [(ngModel)]="form.tableName" />
          </label>
          <label class="field">
            <span>Capacity</span>
            <input class="input" name="capacity" type="number" min="1" max="50" required [(ngModel)]="form.capacity" />
          </label>
          <label class="radio">
            <input type="checkbox" name="enabled" [(ngModel)]="form.enabled" />
            Accepting guests
          </label>
        </div>
        <div class="row">
          <button class="btn btn-primary" type="submit" [disabled]="busy() || tableForm.invalid">
            {{ editingId === null ? 'Add table' : 'Save table' }}
          </button>
          @if (editingId !== null) {
            <button class="btn btn-ghost" type="button" (click)="reset()">Cancel</button>
          }
        </div>
      </form>
    </section>

    <section class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>QR code</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (table of tables(); track table.id) {
              <tr>
                <td>
                  <strong>{{ table.tableNumber }}</strong>
                  @if (table.tableName) {
                    <div class="small muted">{{ table.tableName }}</div>
                  }
                </td>
                <td>{{ table.capacity }}</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-warn]="table.occupied"
                    [class.badge-ok]="!table.occupied && table.enabled"
                    [class.badge-muted]="!table.enabled"
                  >{{ table.occupied ? 'Occupied' : table.enabled ? 'Free' : 'Disabled' }}</span>
                </td>
                <td>
                  @if (qrUrls()[table.id]; as src) {
                    <img class="qr-thumb" [src]="src" alt="QR code for table {{ table.tableNumber }}" width="96" height="96" />
                  }
                  <div class="row">
                    <button class="btn btn-sm" type="button" (click)="toggleQr(table)">
                      {{ qrUrls()[table.id] ? 'Hide QR' : 'Show QR' }}
                    </button>
                    <button class="btn btn-sm" type="button" (click)="download(table)">Download</button>
                  </div>
                </td>
                <td>
                  <div class="row">
                    <button class="btn btn-sm" type="button" (click)="edit(table)">Edit</button>
                    <button class="btn btn-sm" type="button" (click)="regenerate(table)">Regenerate QR</button>
                    <button class="btn btn-sm btn-danger" type="button" (click)="remove(table)">Delete</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="muted">No tables yet. Add your first table above.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class TablesPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(TablesApi);

  readonly tables = signal<DiningTable[]>([]);
  readonly qrUrls = signal<Partial<Record<number, string>>>({});
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);

  editingId: number | null = null;
  form: TableRequest = blankTable();

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    for (const url of Object.values(this.qrUrls())) {
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }

  load(): void {
    this.api.list().subscribe({
      next: tables => {
        this.tables.set(tables);
        this.error.set(null);
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'Tables could not be loaded.')),
    });
  }

  edit(table: DiningTable): void {
    this.editingId = table.id;
    this.form = {
      tableNumber: table.tableNumber,
      tableName: table.tableName ?? '',
      capacity: table.capacity,
      enabled: table.enabled,
    };
    this.notice.set(null);
  }

  reset(): void {
    this.editingId = null;
    this.form = blankTable();
  }

  save(): void {
    const body: TableRequest = {
      ...this.form,
      tableNumber: this.form.tableNumber.trim(),
      tableName: this.form.tableName.trim(),
    };
    const id = this.editingId;
    const request = id === null ? this.api.create(body) : this.api.update(id, body);
    this.perform(request, id === null ? 'Table added.' : 'Table updated.', () => this.reset());
  }

  remove(table: DiningTable): void {
    if (!confirm(`Delete table ${table.tableNumber}? Its QR code will stop working.`)) {
      return;
    }
    this.perform(this.api.remove(table.id), 'Table deleted.', () => this.dropQr(table.id));
  }

  regenerate(table: DiningTable): void {
    if (!confirm(`Regenerate the QR code for table ${table.tableNumber}? The current code will stop working.`)) {
      return;
    }
    this.perform(this.api.regenerateQr(table.id), 'QR code regenerated.', () => this.dropQr(table.id));
  }

  toggleQr(table: DiningTable): void {
    const current = this.qrUrls()[table.id];
    if (current) {
      this.dropQr(table.id);
      return;
    }
    this.api.qrPng(table.id).subscribe({
      next: blob => this.qrUrls.update(map => ({ ...map, [table.id]: URL.createObjectURL(blob) })),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The QR code could not be loaded.')),
    });
  }

  download(table: DiningTable): void {
    const safeNumber = table.tableNumber.replace(/[^\w-]/g, '_');
    this.api.qrPng(table.id).subscribe({
      next: blob => saveBlob(blob, `table-${safeNumber}-qr.png`),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The QR code could not be downloaded.')),
    });
  }

  private dropQr(id: number): void {
    const url = this.qrUrls()[id];
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.qrUrls.update(map => ({ ...map, [id]: undefined }));
  }

  private perform<T>(request: Observable<T>, success: string, onDone?: () => void): void {
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
        this.error.set(errorMessage(e, 'The change could not be saved.'));
      },
    });
  }
}
