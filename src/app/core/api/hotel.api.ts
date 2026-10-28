import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { fileForm } from '../files';
import {
  CurrentSubscription,
  DateRange,
  ExportFormat,
  FeedbackView,
  HotelDashboard,
  HotelDetailsUpdate,
  HotelProfile,
  NotificationView,
  ReportTable,
  ReportType,
  StaffMember,
  StaffRequest,
  Subscription,
  SupportTicket,
  SupportTicketRequest,
} from '../models';

/** Endpoints for the signed-in restaurant (HOTEL_ADMIN). */
@Injectable({ providedIn: 'root' })
export class HotelApi {
  private readonly http = inject(HttpClient);

  profile(): Observable<HotelProfile> {
    return this.http.get<HotelProfile>('/api/v1/hotel/profile');
  }

  updateProfile(body: HotelDetailsUpdate): Observable<HotelProfile> {
    return this.http.put<HotelProfile>('/api/v1/hotel/profile', body);
  }

  uploadLogo(file: File): Observable<HotelProfile> {
    return this.http.post<HotelProfile>('/api/v1/hotel/profile/logo', fileForm(file));
  }

  uploadPaymentQr(file: File): Observable<HotelProfile> {
    return this.http.post<HotelProfile>('/api/v1/hotel/profile/qr', fileForm(file));
  }

  dashboard(): Observable<HotelDashboard> {
    return this.http.get<HotelDashboard>('/api/v1/hotel/dashboard');
  }

  staff(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>('/api/v1/hotel/staff');
  }

  createStaff(body: StaffRequest): Observable<StaffMember> {
    return this.http.post<StaffMember>('/api/v1/hotel/staff', body);
  }

  setStaffEnabled(id: number, enabled: boolean): Observable<StaffMember> {
    return this.http.patch<StaffMember>(`/api/v1/hotel/staff/${id}/status`, { enabled });
  }

  deleteStaff(id: number): Observable<void> {
    return this.http.delete<void>(`/api/v1/hotel/staff/${id}`);
  }

  feedback(): Observable<FeedbackView[]> {
    return this.http.get<FeedbackView[]>('/api/v1/hotel/feedback');
  }

  notifications(): Observable<NotificationView[]> {
    return this.http.get<NotificationView[]>('/api/v1/hotel/notifications');
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.http.get<{ unread: number }>('/api/v1/hotel/notifications/unread-count');
  }

  markRead(id: number): Observable<NotificationView> {
    return this.http.patch<NotificationView>(`/api/v1/hotel/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>('/api/v1/hotel/notifications/read-all', {});
  }

  report(type: ReportType, range: DateRange): Observable<ReportTable> {
    return this.http.get<ReportTable>(`/api/v1/hotel/reports/${type}`, { params: this.rangeParams(range) });
  }

  exportReport(type: ReportType, range: DateRange, format: ExportFormat): Observable<Blob> {
    const params = this.rangeParams(range).set('format', format);
    return this.http.get(`/api/v1/hotel/reports/${type}/export`, { params, responseType: 'blob' });
  }

  subscription(): Observable<CurrentSubscription> {
    return this.http.get<CurrentSubscription>('/api/v1/hotel/subscription');
  }

  requestSubscription(form: FormData): Observable<Subscription> {
    return this.http.post<Subscription>('/api/v1/hotel/subscription/requests', form);
  }

  supportTickets(): Observable<SupportTicket[]> {
    return this.http.get<SupportTicket[]>('/api/v1/hotel/support/tickets');
  }

  raiseTicket(body: SupportTicketRequest): Observable<SupportTicket> {
    return this.http.post<SupportTicket>('/api/v1/hotel/support/tickets', body);
  }

  private rangeParams(range: DateRange): HttpParams {
    return new HttpParams({ fromObject: { from: range.from, to: range.to, period: range.period } });
  }
}
