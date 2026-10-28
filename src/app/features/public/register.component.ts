import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { PublicApi } from '../../core/api/public.api';
import { HotelRegistration } from '../../core/models';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card wide">
        <h1>Register your restaurant</h1>
        <p class="muted">Create your console now. Ordering is enabled after you request and get a subscription approved.</p>
        @if (error(); as message) {
          <div class="alert alert-error">{{ message }}</div>
        }
        @if (done()) {
          <div class="alert alert-ok">Registration received. <a routerLink="/login">Sign in</a> and request a subscription to go live.</div>
        } @else {
          <form #f="ngForm" (ngSubmit)="submit()" class="form-grid">
            <label class="field"><span>Restaurant name</span><input class="input" name="hotelName" required [(ngModel)]="form.hotelName" /></label>
            <label class="field"><span>Owner name</span><input class="input" name="ownerName" required [(ngModel)]="form.ownerName" /></label>
            <label class="field"><span>Mobile number</span><input class="input" name="mobileNumber" required [(ngModel)]="form.mobileNumber" /></label>
            <label class="field"><span>Login email</span><input class="input" name="email" type="email" required [(ngModel)]="form.email" /></label>
            <label class="field"><span>Password (8-72 characters)</span><input class="input" name="password" type="password" minlength="8" maxlength="72" required [(ngModel)]="form.password" /></label>
            <label class="field"><span>UPI ID</span><input class="input" name="upiId" required [(ngModel)]="form.upiId" /></label>
            <label class="field full"><span>Address</span><input class="input" name="address" required [(ngModel)]="form.address" /></label>
            <label class="field"><span>City</span><input class="input" name="city" required [(ngModel)]="form.city" /></label>
            <label class="field"><span>State</span><input class="input" name="state" required [(ngModel)]="form.state" /></label>
            <label class="field"><span>Country</span><input class="input" name="country" required [(ngModel)]="form.country" /></label>
            <label class="field"><span>Pincode (6 digits)</span><input class="input" name="pincode" required pattern="[0-9]{6}" [(ngModel)]="form.pincode" /></label>
            <label class="field"><span>GST number (optional)</span><input class="input" name="gstNumber" [(ngModel)]="form.gstNumber" /></label>
            <label class="field"><span>Restaurant logo (optional)</span><input class="input" type="file" accept="image/*" (change)="pick($event, 'logo')" /></label>
            <label class="field"><span>Payment QR code (optional)</span><input class="input" type="file" accept="image/*" (change)="pick($event, 'qr')" /></label>
            <div class="full">
              <button class="btn btn-primary" type="submit" [disabled]="busy() || f.invalid">{{ busy() ? 'Submitting...' : 'Create account' }}</button>
              <a class="btn btn-ghost" routerLink="/login">Back to sign in</a>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly api = inject(PublicApi);

  form: HotelRegistration = {
    hotelName: '',
    ownerName: '',
    mobileNumber: '',
    email: '',
    password: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    gstNumber: '',
    upiId: '',
  };
  logo: File | null = null;
  qr: File | null = null;
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  pick(event: Event, target: 'logo' | 'qr'): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (target === 'logo') {
      this.logo = file;
    } else {
      this.qr = file;
    }
  }

  submit(): void {
    this.busy.set(true);
    this.error.set(null);
    const data = new FormData();
    data.append('data', new Blob([JSON.stringify(this.form)], { type: 'application/json' }));
    if (this.logo) {
      data.append('logo', this.logo);
    }
    if (this.qr) {
      data.append('qr', this.qr);
    }
    this.api.register(data).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'Registration failed.'));
      },
    });
  }
}
