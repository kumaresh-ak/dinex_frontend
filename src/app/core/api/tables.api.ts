import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DiningTable, TableRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class TablesApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/hotel/tables';

  list(): Observable<DiningTable[]> {
    return this.http.get<DiningTable[]>(this.base);
  }

  create(body: TableRequest): Observable<DiningTable> {
    return this.http.post<DiningTable>(this.base, body);
  }

  update(id: number, body: TableRequest): Observable<DiningTable> {
    return this.http.put<DiningTable>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  regenerateQr(id: number): Observable<DiningTable> {
    return this.http.post<DiningTable>(`${this.base}/${id}/regenerate-qr`, {});
  }

  qrPng(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/qr`, { responseType: 'blob' });
  }
}
