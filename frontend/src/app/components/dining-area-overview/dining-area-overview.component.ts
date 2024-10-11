import { Component, Output, EventEmitter, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { MatTabsModule } from '@angular/material/tabs';
import { TableStatusService } from '../../services/table-status.service';
import { WebSocketService } from '../../services/web-socket.service';
import { OrderService, Order } from '../../services/order.service';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  location?: string;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  hasOrders?: boolean;
  waiterCalled?: boolean;
  paymentCompleted?: boolean;
  restaurant: string;
  isPayInitiated?: boolean;
  paymentType?: string;
  orders?: Order[];
}

@Component({
  selector: 'app-dining-area-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatTabsModule
  ],
  templateUrl: './dining-area-overview.component.html',
  styleUrls: ['./dining-area-overview.component.scss']
})
export class DiningAreaOverviewComponent implements OnInit, OnDestroy {
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$: Observable<Table[]> = this.tablesSubject.asObservable();
  dineInTables$: Observable<Table[]>;
  parcelTables$: Observable<Table[]>;
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  isLoading$ = this.isLoadingSubject.asObservable();

  private subscription = new Subscription();
  private restaurantId: string | null = null;

  @Input() set tables(value: Table[] | null) {
    if (value) {
      this.tablesSubject.next(value);
      this.checkTablesForOrders(value);
      this.isLoadingSubject.next(false);
    } else {
      this.loadTablesFromDb();
    }
  }

  @Output() tableSelected = new EventEmitter<Table>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private tableStatusService: TableStatusService,
    private webSocketService: WebSocketService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) {
    this.dineInTables$ = this.tables$.pipe(
      map(tables => tables.filter(table => table.location !== 'Parcel - Take Away'))
    );
    this.parcelTables$ = this.tables$.pipe(
      map(tables => tables.filter(table => table.location === 'Parcel - Take Away'))
    );
  }

  ngOnInit() {
    this.restaurantId = this.getSelectedRestaurantId();
    if (this.restaurantId) {
      this.loadTablesFromDb();
      this.setupWebSocketListeners();
      this.orderService.startOrderRefresh();
    } else {
      console.error('Restaurant ID is not available');
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.orderService.stopOrderRefresh();
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  onTableSelect(table: Table) {
    this.tableSelected.emit(table);
  }

  getTableTooltip(table: Table): string {
    let status = table.isOccupied ? 'Occupied' : 'Available';
    if (table.hasOrders) {
      status += ' - Has Orders';
    }
    if (table.paymentCompleted) {
      status += ' - Payment Completed';
    }
    return `Table ${table.number} - ${status}`;
  }

  private loadTablesFromDb() {
    this.isLoadingSubject.next(true);
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.subscription.add(
      this.http.get<Table[]>(`${environment.apiUrl}/tables?restaurantId=${this.restaurantId}`, { headers }).pipe(
        switchMap(tables => {
          const billStatusChecks = tables.map(table => 
            this.http.get<any>(`${environment.apiUrl}/bills/check/${table.otp}?restaurantId=${this.restaurantId}`, { headers }).pipe(
              map(response => ({
                ...table,
                paymentCompleted: response.status === 'paid'
              })),
              catchError(() => of(table))
            )
          );
          return forkJoin(billStatusChecks);
        }),
        tap(tables => {
          this.tablesSubject.next(tables);
          this.isLoadingSubject.next(false);
        }),
        switchMap(tables => this.checkTablesForOrders(tables)),
        catchError(error => {
          console.error('Error loading tables:', error);
          this.isLoadingSubject.next(false);
          return of([]);
        })
      ).subscribe({
        next: (updatedTables: Table[]) => {
          this.tablesSubject.next(updatedTables);
          this.cdr.markForCheck();
        },
        error: (error) => console.error('Error updating tables:', error)
      })
    );
  }

  private checkTablesForOrders(tables: Table[]): Observable<Table[]> {
    const orderChecks = tables.map(table => 
      this.orderService.getOrdersByTableOtp(table.otp).pipe(
        map(orders => ({
          ...table,
          hasOrders: orders.length > 0,
          isOccupied: orders.length > 0 || table.isOccupied
        })),
        catchError(() => of(table))
      )
    );
  
    return forkJoin(orderChecks);
  }

  private setupWebSocketListeners() {
    this.subscription.add(
      this.webSocketService.listen('newOrder').subscribe((newOrder: Order) => {
        if (newOrder.restaurant === this.restaurantId) {
          this.updateTableStatus(newOrder.tableOtp, true, true);
        }
      })
    );

    this.subscription.add(
      this.webSocketService.listen('orderStatusChange').subscribe((data: { tableOtp: string, hasOrders: boolean, restaurantId: string }) => {
        if (data.restaurantId === this.restaurantId) {
          this.updateTableStatus(data.tableOtp, data.hasOrders, data.hasOrders);
        }
      })
    );

    this.subscription.add(
      this.tableStatusService.tableStatusUpdate$.subscribe(update => {
        this.updateTableStatus(update.tableOtp, true, true, update.paymentCompleted);
      })
    );

    this.subscription.add(
      this.webSocketService.listen('paymentCompleted').subscribe((data: { tableOtp: string, restaurantId: string }) => {
        if (data.restaurantId === this.restaurantId) {
          this.updateTableStatus(data.tableOtp, true, true, true);
        }
      })
    );
  }

  private updateTableStatus(tableOtp: string, isOccupied: boolean, hasOrders: boolean, paymentCompleted?: boolean) {
    const updatedTables = this.tablesSubject.value.map(table => 
      table.otp === tableOtp ? { 
        ...table, 
        isOccupied, 
        hasOrders, 
        paymentCompleted: paymentCompleted ?? table.paymentCompleted 
      } : table
    );
    this.tablesSubject.next(updatedTables);
    this.cdr.markForCheck();
  }
}