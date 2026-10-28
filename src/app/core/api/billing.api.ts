import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Bill, BillStatus, PaymentMethod, PaymentRecord } from '../models';

@Injectable({ providedIn: 'root' })
export class BillingApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/hotel/billing';

  generate(sessionId: number): Observable<Bill> {
    return this.http.post<Bill>(`${this.base}/sessions/${sessionId}/bill`, {});
  }

  bills(status?: BillStatus): Observable<Bill[]> {
    const params = status ? new HttpParams().set('status', status) : new HttpParams();
    return this.http.get<Bill[]>(`${this.base}/bills`, { params });
  }

  settle(billId: number, paymentMethod: PaymentMethod): Observable<Bill> {
    return this.http.post<Bill>(`${this.base}/bills/${billId}/settle`, { paymentMethod });
  }

  pdf(billId: number): Observable<Blob> {
    return this.http.get(`${this.base}/bills/${billId}/pdf`, { responseType: 'blob' });
  }

  payments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.base}/payments`);
  }
}
