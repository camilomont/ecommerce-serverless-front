import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiMessage, ListResponse, Product, Purchase, User } from '../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  getUsers(limit = 25): Observable<ListResponse<User>> {
    return this.http.get<ListResponse<User>>(`${API_BASE_URL}/users?limit=${limit}`);
  }

  createUser(user: User): Observable<ApiMessage & { item: User }> {
    return this.http.post<ApiMessage & { item: User }>(`${API_BASE_URL}/users`, user);
  }

  getProducts(limit = 25): Observable<ListResponse<Product>> {
    return this.http.get<ListResponse<Product>>(`${API_BASE_URL}/products?limit=${limit}`);
  }

  createProduct(product: Product): Observable<ApiMessage & { item: Product }> {
    return this.http.post<ApiMessage & { item: Product }>(`${API_BASE_URL}/products`, product);
  }

  getOrdersByUser(userId: string, limit = 25): Observable<ListResponse<Purchase>> {
    return this.http.get<ListResponse<Purchase>>(
      `${API_BASE_URL}/users/${encodeURIComponent(userId)}/products?limit=${limit}`
    );
  }

  createOrder(userId: string, payload: { productId: string; quantity: number }): Observable<ApiMessage & { purchase: Purchase }> {
    return this.http.post<ApiMessage & { purchase: Purchase }>(
      `${API_BASE_URL}/users/${encodeURIComponent(userId)}/products`,
      payload
    );
  }
}
