import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Bill, GuestSession, MenuQrSession, PaymentMethod, PublicMenu, SessionStart, TableMenu } from '../models';

export interface OrderRequestLine {
  menuItemId: number;
  quantity: number;
  specialInstructions?: string;
}

/** Guest endpoints reached from the table QR code. No sign-in is required. */
@Injectable({ providedIn: 'root' })
export class GuestApi {
  private readonly http = inject(HttpClient);

  startSession(qrToken: string): Observable<SessionStart> {
    return this.http.post<SessionStart>(`/api/v1/public/tables/${qrToken}/session`, {});
  }

  menu(qrToken: string): Observable<TableMenu> {
    return this.http.get<TableMenu>(`/api/v1/public/tables/${qrToken}/menu`);
  }

  publicMenu(menuToken: string): Observable<PublicMenu> {
    return this.http.get<PublicMenu>(`/api/v1/public/menu-qr/${menuToken}`);
  }

  startMenuSession(menuToken: string, tableNumber: string): Observable<MenuQrSession> {
    return this.http.post<MenuQrSession>(`/api/v1/public/menu-qr/${menuToken}/session`, { tableNumber });
  }

  session(sessionToken: string): Observable<GuestSession> {
    return this.http.get<GuestSession>(`/api/v1/public/sessions/${sessionToken}`);
  }

  identify(sessionToken: string, customerName: string, mobileNumber: string): Observable<GuestSession> {
    return this.http.put<GuestSession>(`/api/v1/public/sessions/${sessionToken}/customer`, { customerName, mobileNumber });
  }

  placeOrder(sessionToken: string, items: OrderRequestLine[], notes: string): Observable<unknown> {
    return this.http.post(`/api/v1/public/sessions/${sessionToken}/orders`, { items, notes: notes || undefined });
  }

  callWaiter(sessionToken: string): Observable<void> {
    return this.http.post<void>(`/api/v1/public/sessions/${sessionToken}/assistance`, {});
  }

  requestBill(sessionToken: string): Observable<Bill> {
    return this.http.post<Bill>(`/api/v1/public/sessions/${sessionToken}/bill`, {});
  }

  setTip(sessionToken: string, tipAmount: number): Observable<Bill> {
    return this.http.put<Bill>(`/api/v1/public/sessions/${sessionToken}/tip`, { tipAmount });
  }

  pay(sessionToken: string, paymentMethod: PaymentMethod): Observable<Bill> {
    return this.http.post<Bill>(`/api/v1/public/sessions/${sessionToken}/payment`, { paymentMethod });
  }

  billPdf(sessionToken: string): Observable<Blob> {
    return this.http.get(`/api/v1/public/sessions/${sessionToken}/bill/pdf`, { responseType: 'blob' });
  }

  feedback(sessionToken: string, rating: number, comments: string): Observable<void> {
    return this.http.post<void>(`/api/v1/public/sessions/${sessionToken}/feedback`, { rating, comments: comments || undefined });
  }
}
