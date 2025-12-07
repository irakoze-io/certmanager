import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CreateCustomerRequest, CustomerResponse } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService extends ApiService {
  private readonly endpoint = '/customers';

  constructor(protected override http: HttpClient) {
    super(http);
  }

  /**
   * Create a new customer (onboarding)
   */
  createCustomer(request: CreateCustomerRequest): Observable<CustomerResponse> {
    return new Observable(observer => {
      this.post<CustomerResponse>(this.endpoint, request).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to create customer'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get customer by ID
   */
  getCustomerById(id: number): Observable<CustomerResponse> {
    return new Observable(observer => {
      this.get<CustomerResponse>(`${this.endpoint}/${id}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Customer not found'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get all customers
   */
  getAllCustomers(): Observable<CustomerResponse[]> {
    return new Observable(observer => {
      this.get<CustomerResponse[]>(this.endpoint).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(Array.isArray(response.data) ? response.data : [response.data]);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to fetch customers'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }
}
