import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuCategory, MenuCategoryRequest, MenuItem, MenuItemRequest, MenuQrInfo } from '../models';
import { fileForm } from '../files';

@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/hotel/menu';

  categories(): Observable<MenuCategory[]> {
    return this.http.get<MenuCategory[]>(`${this.base}/categories`);
  }

  createCategory(body: MenuCategoryRequest): Observable<MenuCategory> {
    return this.http.post<MenuCategory>(`${this.base}/categories`, body);
  }

  updateCategory(id: number, body: MenuCategoryRequest): Observable<MenuCategory> {
    return this.http.put<MenuCategory>(`${this.base}/categories/${id}`, body);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  items(categoryId?: number): Observable<MenuItem[]> {
    const params = categoryId ? new HttpParams().set('categoryId', String(categoryId)) : new HttpParams();
    return this.http.get<MenuItem[]>(`${this.base}/items`, { params });
  }

  createItem(body: MenuItemRequest): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.base}/items`, body);
  }

  updateItem(id: number, body: MenuItemRequest): Observable<MenuItem> {
    return this.http.put<MenuItem>(`${this.base}/items/${id}`, body);
  }

  deleteItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/items/${id}`);
  }

  setAvailability(id: number, value: boolean): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.base}/items/${id}/availability`, { value });
  }

  setVisibility(id: number, value: boolean): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.base}/items/${id}/visibility`, { value });
  }

  uploadImage(id: number, file: File): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.base}/items/${id}/image`, fileForm(file));
  }

  menuQr(): Observable<MenuQrInfo> {
    return this.http.get<MenuQrInfo>('/api/v1/hotel/menu-qr');
  }

  generateMenuQr(): Observable<MenuQrInfo> {
    return this.http.post<MenuQrInfo>('/api/v1/hotel/menu-qr', {});
  }

  menuQrPng(): Observable<Blob> {
    return this.http.get('/api/v1/hotel/menu-qr/image', { responseType: 'blob' });
  }
}
