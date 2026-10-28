import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../core/api-error';
import { HotelApi } from '../../core/api/hotel.api';
import { assetUrl } from '../../core/files';
import { HotelDetailsUpdate, HotelProfile } from '../../core/models';
import { HumanizePipe, statusTone } from '../../core/ui';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [FormsModule, HumanizePipe],
  template: `
    <header class="page-head">
      <div>
        <h1>Restaurant profile</h1>
        <p class="muted">These details appear on bills and the guest menu.</p>
      </div>
    </header>

    @if (error(); as message) {
      <div class="alert alert-error">{{ message }}</div>
    }
    @if (notice(); as message) {
      <div class="alert alert-ok">{{ message }}</div>
    }

    @if (profile(); as p) {
      <div class="grid-2">
        <section class="card">
          <h2>Details</h2>
          <form #profileForm="ngForm" (ngSubmit)="save()">
            <label class="field">
              <span>Restaurant name</span>
              <input class="input" name="hotelName" required maxlength="160" [(ngModel)]="form.hotelName" />
            </label>
            <label class="field">
              <span>Owner name</span>
              <input class="input" name="ownerName" required maxlength="120" [(ngModel)]="form.ownerName" />
            </label>
            <label class="field">
              <span>Mobile number</span>
              <input class="input" name="mobileNumber" required maxlength="20" [(ngModel)]="form.mobileNumber" />
            </label>
            <label class="field">
              <span>Address</span>
              <input class="input" name="address" required maxlength="255" [(ngModel)]="form.address" />
            </label>
            <div class="form-grid">
              <label class="field">
                <span>City</span>
                <input class="input" name="city" required maxlength="100" [(ngModel)]="form.city" />
              </label>
              <label class="field">
                <span>State</span>
                <input class="input" name="state" required maxlength="100" [(ngModel)]="form.state" />
              </label>
              <label class="field">
                <span>Country</span>
                <input class="input" name="country" required maxlength="100" [(ngModel)]="form.country" />
              </label>
              <label class="field">
                <span>Pincode</span>
                <input class="input" name="pincode" required maxlength="10" [(ngModel)]="form.pincode" />
              </label>
              <label class="field">
                <span>GST number (optional)</span>
                <input class="input" name="gstNumber" maxlength="20" [(ngModel)]="form.gstNumber" />
              </label>
              <label class="field">
                <span>UPI ID</span>
                <input class="input" name="upiId" required maxlength="100" [(ngModel)]="form.upiId" />
              </label>
            </div>
            <button class="btn btn-primary" type="submit" [disabled]="busy() || profileForm.invalid">Save details</button>
          </form>
        </section>

        <section class="card">
          <h2>Account</h2>
          <dl class="facts">
            <dt>Login email</dt>
            <dd>{{ p.email }}</dd>
            <dt>Subscription</dt>
            <dd><span class="badge badge-{{ tone(p.subscriptionStatus) }}">{{ p.subscriptionStatus | humanize }}</span></dd>
          </dl>

          <h2>Logo</h2>
          @if (assetUrl(p.logoUrl); as src) {
            <img class="logo-preview" [src]="src" alt="Restaurant logo" width="120" height="120" />
          }
          <input type="file" accept="image/*" name="logo" (change)="uploadLogo($event)" />

          <h2>Payment QR</h2>
          <p class="small muted">Shown to guests at the bill step for UPI payments.</p>
          @if (assetUrl(p.qrImageUrl); as src) {
            <img class="logo-preview" [src]="src" alt="UPI payment QR" width="160" height="160" />
          }
          <input type="file" accept="image/*" name="paymentQr" (change)="uploadQr($event)" />
        </section>
      </div>
    } @else if (!error()) {
      <p class="muted">Loading...</p>
    }
  `,
})
export class ProfilePageComponent implements OnInit {
  private readonly api = inject(HotelApi);

  readonly assetUrl = assetUrl;
  readonly tone = statusTone;

  readonly profile = signal<HotelProfile | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly busy = signal(false);

  form: HotelDetailsUpdate = {
    hotelName: '',
    ownerName: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    gstNumber: '',
    upiId: '',
  };

  ngOnInit(): void {
    this.api.profile().subscribe({
      next: profile => {
        this.profile.set(profile);
        this.form = {
          hotelName: profile.hotelName,
          ownerName: profile.ownerName,
          mobileNumber: profile.mobileNumber,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          pincode: profile.pincode,
          gstNumber: profile.gstNumber ?? '',
          upiId: profile.upiId,
        };
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The profile could not be loaded.')),
    });
  }

  save(): void {
    const body: HotelDetailsUpdate = {
      hotelName: this.form.hotelName.trim(),
      ownerName: this.form.ownerName.trim(),
      mobileNumber: this.form.mobileNumber.trim(),
      address: this.form.address.trim(),
      city: this.form.city.trim(),
      state: this.form.state.trim(),
      country: this.form.country.trim(),
      pincode: this.form.pincode.trim(),
      gstNumber: this.form.gstNumber.trim(),
      upiId: this.form.upiId.trim(),
    };
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.updateProfile(body).subscribe({
      next: profile => {
        this.busy.set(false);
        this.profile.set(profile);
        this.notice.set('Details saved.');
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(e, 'The details could not be saved.'));
      },
    });
  }

  uploadLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.api.uploadLogo(file).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.notice.set('Logo updated.');
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The logo could not be uploaded.')),
    });
  }

  uploadQr(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.api.uploadPaymentQr(file).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.notice.set('Payment QR updated.');
      },
      error: (e: unknown) => this.error.set(errorMessage(e, 'The payment QR could not be uploaded.')),
    });
  }
}
