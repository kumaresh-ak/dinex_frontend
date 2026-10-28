import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Order, OrderStatus, SessionSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);

  /** Hotel console: active orders, optionally filtered by status. */
  orders(statuses: OrderStatus[] = []): Observable<Order[]> {
    let params = new HttpParams();
    for (const status of statuses) {
      params = params.append('status', status);
    }
    return this.http.get<Order[]>('/api/v1/hotel/orders', { params });
  }

  setStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/v1/hotel/orders/${id}/status`, { status });
  }

  /** Hotel console: sessions that are not yet closed. */
  sessions(): Observable<SessionSummary[]> {
    return this.http.get<SessionSummary[]>('/api/v1/hotel/sessions');
  }

  /** Kitchen queue: active orders (ORDERED through READY) by default. */
  kitchenQueue(): Observable<Order[]> {
    return this.http.get<Order[]>('/api/v1/kitchen/orders');
  }

  kitchenSetStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/v1/kitchen/orders/${id}/status`, { status });
  }
}
