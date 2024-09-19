import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { CartItem } from './cart.service';
import { environment } from '../../environments/environment';

export interface Order {
  _id: string;
  items: CartItem[];
  totalPrice: number;
  customerName: string;
  phoneNumber: string;
  tableOtp: string;
  status: string;
  createdAt: Date;
}

interface Table {
  _id: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;
  private tableApiUrl = `${environment.apiUrl}/tables`;
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private refreshInterval: any;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.ordersSubject.asObservable();
  }

  fetchOrders(): void {
    this.http.get<Order[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    ).subscribe(
      orders => this.ordersSubject.next(orders)
    );
  }

  submitOrder(cartItems: CartItem[], totalPrice: number, customerInfo: { name: string, phoneNumber: string, tableOtp: string }): Observable<Order> {
    const orderData = {
      items: cartItems,
      totalPrice: totalPrice,
      customerName: customerInfo.name,
      phoneNumber: customerInfo.phoneNumber,
      tableOtp: customerInfo.tableOtp
    };

    return this.http.post<Order>(this.apiUrl, orderData).pipe(
      switchMap(newOrder => {
        return this.updateTableStatus(customerInfo.tableOtp, true).pipe(
          map(() => newOrder)
        );
      }),
      tap(newOrder => {
        const currentOrders = this.ordersSubject.value;
        this.ordersSubject.next([...currentOrders, newOrder]);
      }),
      catchError(this.handleError)
    );
  }

  updateOrderStatus(orderId: string, newStatus: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}`, { status: newStatus }).pipe(
      tap(updatedOrder => {
        const currentOrders = this.ordersSubject.value;
        const updatedOrders = currentOrders.map(order =>
          order._id === updatedOrder._id ? updatedOrder : order
        );
        this.ordersSubject.next(updatedOrders);
      }),
      catchError(this.handleError)
    );
  }

  startOrderRefresh(intervalMs: number = 30000): void {
    this.stopOrderRefresh();
    this.refreshInterval = setInterval(() => this.fetchOrders(), intervalMs);
  }

  stopOrderRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  getOrdersByTableOtp(tableOtp: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}?tableOtp=${tableOtp}`).pipe(
      catchError(this.handleError)
    );
  }

  getLastOrderTime(tableOtp: string): Observable<Date | undefined> {
    return this.getOrdersByTableOtp(tableOtp).pipe(
      map(orders => {
        if (orders.length === 0) {
          return undefined;
        }
        const latestOrder = orders.reduce((latest, current) => 
          latest.createdAt > current.createdAt ? latest : current
        );
        return new Date(latestOrder.createdAt);
      }),
      catchError(this.handleError)
    );
  }

  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${orderId}`).pipe(
      tap(() => console.log(`Order ${orderId} deleted successfully`)),
      catchError(this.handleError)
    );
  }

  private updateTableStatus(tableOtp: string, isOccupied: boolean): Observable<void> {
    return this.http.get<Table[]>(`${this.tableApiUrl}?otp=${tableOtp}`).pipe(
      switchMap(tables => {
        if (tables.length === 0) {
          return throwError(() => new Error('Table not found'));
        }
        const table = tables[0];
        return this.http.patch<void>(`${this.tableApiUrl}/${table._id}`, { isOccupied });
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && typeof error.error === 'object') {
        errorMessage += `\nDetails: ${JSON.stringify(error.error)}`;
      }
    }
    console.error('Error in OrderService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}