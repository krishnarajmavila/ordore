import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WebSocketService } from './web-socket.service';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

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
export class ReportingService {
  private apiUrl = `${environment.apiUrl}/orders`;
  private tableApiUrl = `${environment.apiUrl}/tables`;
  private repoapiUrl = `${environment.apiUrl}/reports`;
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private refreshInterval: any;

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.setupWebSocketListeners();
  }

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
          map(() => newOrder),
          catchError(error => {
            console.warn('Failed to update table status, but order was submitted:', error);
            return of(newOrder);
          })
        );
      }),
      tap(newOrder => {
        const currentOrders = this.ordersSubject.value;
        this.ordersSubject.next([...currentOrders, newOrder]);
        this.webSocketService.emit('newOrder', newOrder);
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
        this.webSocketService.emit('orderUpdate', updatedOrder);
      }),
      catchError(this.handleError)
    );
  }

  deleteOrder(orderId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${orderId}`).pipe(
      tap(() => {
        const currentOrders = this.ordersSubject.value;
        const updatedOrders = currentOrders.filter(order => order._id !== orderId);
        this.ordersSubject.next(updatedOrders);
        this.webSocketService.emit('orderDeleted', orderId);
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
  getReportData(date: Date): Observable<any> {
    const formattedDate = date.toISOString().split('T')[0];
    return this.http.get(`${this.apiUrl}/${formattedDate}`);
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

  private updateTableStatus(tableOtp: string, isOccupied: boolean): Observable<void> {
    return this.http.get<Table[]>(`${this.tableApiUrl}?otp=${tableOtp}`).pipe(
      switchMap(tables => {
        if (tables.length === 0) {
          return throwError(() => new Error('Table not found'));
        }
        const table = tables[0];
        return this.http.patch<void>(`${this.tableApiUrl}/${table._id}`, { isOccupied });
      }),
      catchError(error => {
        console.error('Error updating table status:', error);
        return throwError(() => new Error('Failed to update table status'));
      })
    );
  }

  private setupWebSocketListeners(): void {
    this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: Order) => {
      const currentOrders = this.ordersSubject.value;
      const updatedOrders = currentOrders.map(order =>
        order._id === updatedOrder._id ? updatedOrder : order
      );
      this.ordersSubject.next(updatedOrders);
    });

    this.webSocketService.listen('newOrder').subscribe((newOrder: Order) => {
      const currentOrders = this.ordersSubject.value;
      this.ordersSubject.next([...currentOrders, newOrder]);
    });

    this.webSocketService.listen('orderDeleted').subscribe((deletedOrderId: string) => {
      const currentOrders = this.ordersSubject.value;
      const updatedOrders = currentOrders.filter(order => order._id !== deletedOrderId);
      this.ordersSubject.next(updatedOrders);
    });
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

  getReportbillData(date: Date): Observable<any> {
    const formattedDate = date.toISOString().split('T')[0];
    return this.http.get<any>(`${this.repoapiUrl}?date=${formattedDate}`);
  }
}