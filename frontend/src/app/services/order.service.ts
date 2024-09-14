import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
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

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private refreshInterval: any;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.ordersSubject.asObservable();
  }

  fetchOrders(): void {
    this.http.get<Order[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching orders:', error);
        return [];
      })
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
      tap(newOrder => {
        const currentOrders = this.ordersSubject.value;
        this.ordersSubject.next([...currentOrders, newOrder]);
      }),
      catchError(error => {
        console.error('Error submitting order:', error);
        throw error;
      })
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
      catchError(error => {
        console.error('Error updating order status:', error);
        throw error;
      })
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
    return this.http.get<Order[]>(`${this.apiUrl}?tableOtp=${tableOtp}`);
  }
}