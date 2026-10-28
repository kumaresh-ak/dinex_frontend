import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuditEntry,
  AuditFilter,
  ExportFormat,
  HotelProfile,
  Page,
  PlatformDashboard,
  PlatformSetting,
  Subscription,
  SubscriptionStatus,
  SupportStatus,
  SupportStatusUpdate,
  SupportTicket,
} from '../models';

/** Endpoints for the platform owner (SUPER_ADMIN). */
@Injectable({ providedIn: 'root' })
export class PlatformApi {
  private readonly http = inject(HttpClient);

  dashboard(): Observable<PlatformDashboard> {
    return this.http.get<PlatformDashboard>('/api/v1/admin/dashboard');
  }

  hotels(page: number, size: number): Observable<Page<HotelProfile>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size)).set('sort', 'id,desc');
    return this.http.get<Page<HotelProfile>>('/api/v1/admin/hotels', { params });
  }

  setHotelEnabled(id: number, enabled: boolean): Observable<HotelProfile> {
    return this.http.patch<HotelProfile>(`/api/v1/admin/hotels/${id}/enabled`, { enabled });
  }

  deleteHotel(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/admin/hotels/${id}`);
  }

  subscriptions(status?: SubscriptionStatus): Observable<Subscription[]> {
    const params = status ? new HttpParams().set('status', status) : new HttpParams();
    return this.http.get<Subscription[]>('/api/v1/admin/subscriptions', { params });
  }

  approve(id: number): Observable<Subscription> {
    return this.http.post<Subscription>(`/api/v1/admin/subscriptions/${id}/approve`, {});
  }

  reject(id: number, reason: string): Observable<Subscription> {
    return this.http.post<Subscription>(`/api/v1/admin/subscriptions/${id}/reject`, { reason });
  }

  proofBlob(key: string): Observable<Blob> {
    const name = key.replace(/^proofs\//, '');
    return this.http.get(`/api/v1/admin/files/proofs/${name}`, { responseType: 'blob' });
  }

  settings(): Observable<PlatformSetting[]> {
    return this.http.get<PlatformSetting[]>('/api/v1/admin/settings');
  }

  updateSetting(key: string, value: string): Observable<PlatformSetting> {
    return this.http.put<PlatformSetting>(`/api/v1/admin/settings/${key}`, { value });
  }

  auditLogs(filter: AuditFilter): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>('/api/v1/admin/audit-logs', { params: this.filterParams(filter) });
  }

  exportAuditLogs(filter: AuditFilter, format: ExportFormat): Observable<Blob> {
    const params = this.filterParams(filter).set('format', format);
    return this.http.get('/api/v1/admin/audit-logs/export', { params, responseType: 'blob' });
  }

  supportTickets(status?: SupportStatus): Observable<SupportTicket[]> {
    const params = status ? new HttpParams().set('status', status) : new HttpParams();
    return this.http.get<SupportTicket[]>('/api/v1/admin/support/tickets', { params });
  }

  updateSupportTicket(id: number, body: SupportStatusUpdate): Observable<SupportTicket> {
    return this.http.patch<SupportTicket>(`/api/v1/admin/support/tickets/${id}`, body);
  }

  private filterParams(filter: AuditFilter): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}
