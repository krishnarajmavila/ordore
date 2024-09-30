import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { WebSocketService } from './web-socket.service';

export interface CartItem {
  name: string;
  price: number;
  quantity: number;
  category: string; 
}

export interface Order {
  _id: string;
  items: CartItem[];
  totalPrice: number;
  customerName: string;
  phoneNumber: string;
  tableOtp: string;
  tableNumber: string;
  status: string;
  createdAt: Date;
  restaurant: string;
}

interface Table {
  _id: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  restaurant: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;
  private tableApiUrl = `${environment.apiUrl}/tables`;
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private refreshInterval: any;

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.setupWebSocketListeners();
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  getOrders(): Observable<Order[]> {
    return this.ordersSubject.asObservable();
  }

  fetchOrders(): void {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID not set');
      return;
    }
    const params = new HttpParams().set('restaurantId', restaurantId);
    this.http.get<Order[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    ).subscribe(
      orders => this.ordersSubject.next(orders)
    );
  }

  submitOrder(cartItems: CartItem[], totalPrice: number, customerInfo: { name: string, phoneNumber: string, tableOtp: string }): Observable<Order> {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      return throwError(() => new Error('Restaurant ID not set'));
    }
    const orderData = {
      items: cartItems.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category // Include category in the order data
      })),
      totalPrice: totalPrice,
      customerName: customerInfo.name,
      phoneNumber: customerInfo.phoneNumber,
      tableOtp: customerInfo.tableOtp,
      restaurant: restaurantId
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
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      return throwError(() => new Error('Restaurant ID not set'));
    }
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.patch<Order>(`${this.apiUrl}/${orderId}`, { status: newStatus }, { params }).pipe(
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
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      return throwError(() => new Error('Restaurant ID not set'));
    }
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.delete<void>(`${this.apiUrl}/${orderId}`, { params }).pipe(
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

  getOrdersByTableOtp(tableOtp: string): Observable<Order[]> {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      return throwError(() => new Error('Restaurant ID not set'));
    }
    const params = new HttpParams()
      .set('tableOtp', tableOtp)
      .set('restaurantId', restaurantId);
    return this.http.get<Order[]>(this.apiUrl, { params }).pipe(
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
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      return throwError(() => new Error('Restaurant ID not set'));
    }
    const params = new HttpParams()
      .set('otp', tableOtp)
      .set('restaurantId', restaurantId);
    return this.http.get<Table[]>(this.tableApiUrl, { params }).pipe(
      switchMap(tables => {
        if (tables.length === 0) {
          return throwError(() => new Error('Table not found'));
        }
        const table = tables[0];
        return this.http.patch<void>(`${this.tableApiUrl}/${table._id}`, { isOccupied }, { params });
      }),
      catchError(error => {
        console.error('Error updating table status:', error);
        return throwError(() => new Error('Failed to update table status'));
      })
    );
  }

  private setupWebSocketListeners(): void {
    this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: Order) => {
      const restaurantId = this.getSelectedRestaurantId();
      if (updatedOrder.restaurant === restaurantId) {
        const currentOrders = this.ordersSubject.value;
        const updatedOrders = currentOrders.map(order =>
          order._id === updatedOrder._id ? updatedOrder : order
        );
        this.ordersSubject.next(updatedOrders);
      }
    });

    this.webSocketService.listen('newOrder').subscribe((newOrder: Order) => {
      const restaurantId = this.getSelectedRestaurantId();
      if (newOrder.restaurant === restaurantId) {
        const currentOrders = this.ordersSubject.value;
        this.ordersSubject.next([...currentOrders, newOrder]);
      }
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
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && typeof error.error === 'object') {
        errorMessage += `\nDetails: ${JSON.stringify(error.error)}`;
      }
    }
    console.error('Error in OrderService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}