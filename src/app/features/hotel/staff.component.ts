import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { StaffMember, StaffRequest } from '../../core/models';

const blankStaff = (): StaffRequest => ({ displayName: '', username: '', mobileNumber: '', password: '' });

@Component({
  selector: 'app-staff-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="page-head">
      <div>
        <h1>Staff</h1>
        <p class="muted">Kitchen chefs sign in with their own username and see only the kitchen display.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    <div class="grid-2">
      <section class="card">
        <h2>Add chef</h2>
        <form #staffForm="ngForm" (ngSubmit)="create()">
          <label class="field">
            <span>Display name</span>
            <input class="input" name="displayName" required maxlength="100" [(ngModel)]="form.displayName" />
          </label>
          <label class="field">
            <span>Username</span>
            <input class="input" name="username" required maxlength="60" [(ngModel)]="form.username" />
          </label>
          <label class="field">
            <span>Mobile number (optional)</span>
            <input class="input" name="mobile" maxlength="20" [(ngModel)]="form.mobileNumber" />
          </label>
          <label class="field">
            <span>Temporary password (8-72 characters, letters and numbers)</span>
            <input class="input" name="password" type="password" required minlength="8" maxlength="72" [(ngModel)]="form.password" />
          </label>
          <button class="btn btn-primary" type="submit" [disabled]="busy() || staffForm.invalid">Add chef</button>
        </form>
      </section>

      <section class="card">
        <h2>Team</h2>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (member of staff(); track member.id) {
                <tr>
                  <td>
                    <strong>{{ member.displayName }}</strong>
                    @if (member.mobileNumber) {
                      <div class="small muted">{{ member.mobileNumber }}</div>
                    }
                  </td>
                  <td>{{ member.username }}</td>
                  <td>
                    <input type="checkbox" [checked]="member.enabled" (change)="toggle(member)" aria-label="Active" />
                  </td>
                  <td>
                    <button class="btn btn-sm btn-danger" type="button" (click)="remove(member)">Remove</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="muted">No staff added yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class StaffPageComponent implements OnInit {
  private readonly api = inject(HotelApi);

  readonly staff = signal<StaffMember[]>([]);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);

  form: StaffRequest = blankStaff();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.staff().subscribe({
      next: staff => this.staff.set(staff),
      error: (e: unknown) => this.error.set(errorMessage(e, 'Staff could not be loaded.')),
    });
  }

  create(): void {
    const body: StaffRequest = {
      displayName: this.form.displayName.trim(),
      username: this.form.username.trim(),
      mobileNumber: (this.form.mobileNumber ?? '').trim() || undefined,
      password: this.form.password,
    };
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.createStaff(body).subscribe({
      next: member => {
        this.busy.set(false);
        this.notice.set(`${member.displayName} was added.`);
        this.form = blankStaff();
        this.load();
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The chef could not be added.'));
      },
    });
  }

  toggle(member: StaffMember): void {
    this.api.setStaffEnabled(member.id, !member.enabled).subscribe({
      next: () => this.load(),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The status could not be changed.')),
    });
  }

  remove(member: StaffMember): void {
    if (!confirm(`Remove ${member.displayName}? They will no longer be able to sign in.`)) {
      return;
    }
    this.api.deleteStaff(member.id).subscribe({
      next: () => this.load(),
      error: (e: unknown) => this.error.set(errorMessage(e, 'The chef could not be removed.')),
    });
  }
}
