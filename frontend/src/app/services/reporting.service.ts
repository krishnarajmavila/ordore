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

export interface DailyReport {
  dailyRevenue: number;
  dailyOrderCount: number;
  averageOrderValue: number;
  topSellingItems: { _id: string; totalQuantity: number }[];
}

export interface WeeklyReport {
  totalBills: number;
  totalRevenue: number;
  averageDailyRevenue: number;
  dailyOrderCounts: { [date: string]: number };
}

export interface MostOrderedItem {
  name: string;
  count: number;
}

export interface Bill {
  _id: string;
  billNumber: string;
  tableNumber: string;
  total: number;
  status: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private apiUrl = `${environment.apiUrl}/orders`;
  private tableApiUrl = `${environment.apiUrl}/tables`;
  private reportsApiUrl = `${environment.apiUrl}/reports`;
  private billsApiUrl = `${environment.apiUrl}/bills`;
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  private billsSubject = new BehaviorSubject<Bill[]>([]);
  private refreshInterval: any;

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.setupWebSocketListeners();
  }

  // Order related methods
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

  getOrdersByTableOtp(tableOtp: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}`, { params: { tableOtp } }).pipe(
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

  // Bill related methods
  getRealTimeBills(): Observable<Bill[]> {
    return this.billsSubject.asObservable();
  }

  fetchRealTimeBills() {
    this.http.get<Bill[]>(`${this.billsApiUrl}/recent`).pipe(
      catchError(this.handleError)
    ).subscribe(
      bills => this.billsSubject.next(bills)
    );
  }

  // Report related methods
  getDailyReport(date: Date, restaurantId: string): Observable<DailyReport> {
    const params = new HttpParams()
      .set('date', date.toISOString().split('T')[0])
      .set('restaurantId', restaurantId);
    return this.http.get<DailyReport>(`${this.reportsApiUrl}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getWeeklyReport(restaurantId: string): Observable<WeeklyReport> {
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.get<WeeklyReport>(`${this.reportsApiUrl}/weekly`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getMostOrderedItems(restaurantId: string): Observable<MostOrderedItem[]> {
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.get<MostOrderedItem[]>(`${this.reportsApiUrl}/most-ordered`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // Utility methods
  startOrderRefresh(intervalMs: number = 30000): void {
    this.stopOrderRefresh();
    this.refreshInterval = setInterval(() => this.fetchOrders(), intervalMs);
  }

  stopOrderRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  startRealTimeBillsRefresh(intervalMs: number = 30000): void {
    this.stopRealTimeBillsRefresh();
    this.refreshInterval = setInterval(() => this.fetchRealTimeBills(), intervalMs);
  }

  stopRealTimeBillsRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private updateTableStatus(tableOtp: string, isOccupied: boolean): Observable<void> {
    return this.http.get<any[]>(`${this.tableApiUrl}`, { params: { otp: tableOtp } }).pipe(
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

    this.webSocketService.listen('newBill').subscribe((newBill: Bill) => {
      const currentBills = this.billsSubject.value;
      this.billsSubject.next([newBill, ...currentBills].slice(0, 10)); // Keep only the 10 most recent bills
    });

    this.webSocketService.listen('billUpdated').subscribe((updatedBill: Bill) => {
      const currentBills = this.billsSubject.value;
      const updatedBills = currentBills.map(bill =>
        bill._id === updatedBill._id ? updatedBill : bill
      );
      this.billsSubject.next(updatedBills);
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
    console.error('Error in ReportingService:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}