import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { PlatformApi } from '../../core/api/platform.api';
import { PlatformSetting } from '../../core/models';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="page-head">
      <div>
        <h1>Platform settings</h1>
        <p class="muted">Values apply across the platform. Save each setting after changing it.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <section class="card">
      <div class="table-wrap">
        <table class="table stacked">
          <thead>
            <tr>
              <th>Setting</th>
              <th>Value</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (setting of settings(); track setting.key) {
              <tr>
                <td data-label="Setting">
                  <strong>{{ setting.key }}</strong>
                  <div class="small muted">{{ setting.description }}</div>
                </td>
                <td data-label="Value">
                  <input class="input" [name]="'setting-' + setting.key" [(ngModel)]="drafts[setting.key]" />
                </td>
                <td>
                  <button
                    class="btn btn-sm btn-primary"
                    type="button"
                    [disabled]="busyKey() === setting.key || drafts[setting.key] === setting.value"
                    (click)="save(setting)"
                  >Save</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="muted">No settings are defined.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class SettingsPageComponent implements OnInit {
  private readonly api = inject(PlatformApi);

  readonly settings = signal<PlatformSetting[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busyKey = signal<string | null>(null);

  drafts: Record<string, string> = {};

  ngOnInit(): void {
    this.load();
  }

  save(setting: PlatformSetting): void {
    const value = (this.drafts[setting.key] ?? '').trim();
    this.busyKey.set(setting.key);
    this.error.set(null);
    this.notice.set(null);
    this.api.updateSetting(setting.key, value).subscribe({
      next: updated => {
        this.busyKey.set(null);
        this.notice.set(`${updated.key} saved.`);
        this.settings.update(list => list.map(item => (item.key === updated.key ? updated : item)));
        this.drafts[updated.key] = updated.value;
      },
      error: (e: unknown) => {
        this.busyKey.set(null);
        this.error.set(errorMessage(e, 'The setting could not be saved.'));
      },
    });
  }

  private load(): void {
    this.api.settings().subscribe({
      next: list => {
        this.settings.set(list);
        this.drafts = Object.fromEntries(list.map(item => [item.key, item.value]));
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'Settings could not be loaded.')),
    });
  }
}
