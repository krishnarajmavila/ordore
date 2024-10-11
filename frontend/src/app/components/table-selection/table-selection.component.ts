import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../../services/web-socket.service';
import { MatDialog } from '@angular/material/dialog';
import { AddTableDialogComponent } from '../add-table-dialog/add-table-dialog.component';
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
  restaurant: string;
  isPayInitiated?: boolean;
  paymentType?: string;
  orders?: Order[];
}

interface GroupedOrder {
  tableNumber: string;
  items: {
    name: string;
    quantity: number;
    status: string;
  }[];
}

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSidenavModule,
    MatListModule
  ],
  templateUrl: './table-selection.component.html',
  styleUrls: ['./table-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSelectionComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav: any;
  @ViewChild('addTableModal') addTableModal: any;

  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$: Observable<Table[]> = this.tablesSubject.asObservable();
  dineInTables$: Observable<Table[]>;
  parcelTables$: Observable<Table[]>;
  groupedOrders$!: Observable<GroupedOrder[]>;
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  orders$ = this.ordersSubject.asObservable();
  public secondsAgo: number = 0;
  private lastFetchedTime: number = Date.now();

  private subscription: Subscription = new Subscription();
  private restaurantId: string | null = null;

  @Output() tableSelected = new EventEmitter<Table>();
  @Output() otpRefreshRequested = new EventEmitter<Table>();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private webSocketService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private orderService: OrderService,
    private ngZone: NgZone
  ) {
    this.dineInTables$ = this.tables$.pipe(
      map(tables => tables.filter(table => table.location !== 'Parcel - Take Away'))
    );
    this.parcelTables$ = this.tables$.pipe(
      map(tables => tables.filter(table => table.location === 'Parcel - Take Away'))
    );
  }

  @Input() set tables(value: Table[]) {
    console.log('Tables input received:', value);
    const tablesWithWaiterStatus = this.applyPersistedWaiterStatus(value);
    this.tablesSubject.next(tablesWithWaiterStatus);
    this.checkTablesForOrders();
  }

  ngOnInit() {
    this.restaurantId = this.getSelectedRestaurantId();
    console.log('Restaurant ID:', this.restaurantId);
    if (!this.restaurantId) {
      console.error('No restaurant ID found');
      return;
    }
    this.setupWebSocketListeners();
    this.listenForWaiterCalls();
    this.fetchTables();
    this.orderService.fetchOrders();
    this.updateFetchTime();
    this.groupedOrders$ = this.orderService.getOrders().pipe(
      map(orders => this.groupOrdersByTable(orders)),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of([]);
      })
    );
    this.startOrderFetch();
    this.orderService.startOrderRefresh();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.orderService.stopOrderRefresh();
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  private fetchTables() {
    if (!this.restaurantId) return;

    this.http.get<Table[]>(`${environment.apiUrl}/tables`, {
      params: new HttpParams().set('restaurantId', this.restaurantId)
    }).subscribe({
      next: (tables) => {
        console.log('Fetched tables:', tables);
        this.tables = tables;
        this.tablesSubject.next(tables);
        this.cdr.markForCheck();
      },
      error: (error) => console.error('Error fetching tables:', error)
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  selectTable(table: Table) {
    this.tableSelected.emit(table);
  }

  refreshOTP(table: Table, event: Event) {
    event.stopPropagation();
    const cardElement = (event.currentTarget as HTMLElement).closest('.card.h-100');
    if (cardElement) {
      cardElement.classList.add('clicked');
      setTimeout(() => cardElement.classList.remove('clicked'), 300);
    }
    this.otpRefreshRequested.emit(table);
  }

  acknowledgeWaiterCall(table: Table, event: Event) {
    console.log('Acknowledging waiter call for table:', table);
    event.stopPropagation();
    const key = `waiterCalled_${table.number}_${this.restaurantId}`;
    localStorage.removeItem(key);

    const payload = {
      tableId: table._id || table.number,
      restaurantId: this.restaurantId,
      tableOtp: table.otp
    };

    this.http.post(`${environment.apiUrl}/waiter-calls/acknowledge`, payload)
      .subscribe({
        next: () => {
          this.updateWaiterCallStatus(table.number, false);
          const updatedTables = this.tablesSubject.value.map(t =>
            t.number === table.number ? { ...t, waiterCalled: false } : t
          );
          this.tablesSubject.next(updatedTables);
          this.cdr.markForCheck();

          this.webSocketService.emit('waiterCallAcknowledged', { 
            tableNumber: table.number, 
            restaurantId: this.restaurantId,
            tableOtp: table.otp
          });

          console.log(`Waiter call acknowledged for table ${table.number}`);
        },
        error: (error) => {
          console.error('Error acknowledging waiter call:', error);
        }
      });
  }

  private updateWaiterCallStatus(tableNumber: string, status: boolean) {
    const updatedTables = this.tablesSubject.value.map(table => {
      if (table.number === tableNumber) {
        return { ...table, waiterCalled: status };
      }
      return table;
    });
    this.tablesSubject.next(updatedTables);

    const key = `waiterCalled_${tableNumber}_${this.restaurantId}`;
    if (status) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
    
    console.log(`Updated waiter call status for table ${tableNumber}: ${status}`);
    this.cdr.markForCheck();
  }

  private updateTablePaymentStatus(tableOtp: string, isPayInitiated: boolean, paymentType: string) {
    const updatedTables = this.tablesSubject.value.map(table => {
      if (table.otp === tableOtp) {
        const updatedTable = { ...table, isPayInitiated, hasOrders: !isPayInitiated, paymentType };
        localStorage.setItem(`table_${table._id}`, JSON.stringify(updatedTable));
        return updatedTable;
      }
      return table;
    });
    this.tablesSubject.next(updatedTables);
    this.cdr.markForCheck();
  }

  private setupWebSocketListeners() {
    this.subscription.add(
      this.webSocketService.listen('payOrder').subscribe({
        next: (data: { orders: Order[], paymentType: string, tableOtp: string }) => {
          console.log('TableSelectionComponent: Received payOrder event:', data);
          this.updateTablePaymentStatus(data.tableOtp, true, data.paymentType);
        },
        error: error => console.error('TableSelectionComponent: Error in payOrder listener:', error)
      })
    );

    this.subscription.add(
      this.webSocketService.listen('tableUpdate').subscribe({
        next: (updatedTable: Table & { restaurantId: string }) => {
          console.log('Received table update:', updatedTable);
          if (updatedTable.restaurantId === this.restaurantId) {
            this.ngZone.run(() => {
              this.updateTableInList(updatedTable);
              this.cdr.markForCheck();
            });
          }
        },
        error: error => console.error('Error in tableUpdate listener:', error)
      })
    );

    this.subscription.add(
      this.webSocketService.listen('newOrder').subscribe({
        next: (newOrder: Order & { restaurantId: string }) => {
          if (newOrder.restaurantId === this.restaurantId) {
            console.log('Received newOrder event:', newOrder);
            this.updateTableStatus(newOrder.tableOtp, true);
          }
        },
        error: error => console.error('Error in newOrder listener:', error)
      })
    );

    this.subscription.add(
      this.webSocketService.listen('orderStatusChange').subscribe({
        next: (data: { tableOtp: string, hasOrders: boolean, restaurantId: string }) => {
          if (data.restaurantId === this.restaurantId) {
            console.log('Received orderStatusChange event:', data);
            this.updateTableStatus(data.tableOtp, data.hasOrders);
          }
        },
        error: error => console.error('Error in orderStatusChange listener:', error)
      })
    );

    this.subscription.add(
      this.webSocketService.listen('orderUpdated').subscribe({
        next: (updatedOrder: Order) => {
          console.log('Received orderUpdated event:', updatedOrder);
          this.orderService.fetchOrders(); // Refetch all orders to ensure we have the latest data
          this.cdr.markForCheck();
        },
        error: error => console.error('Error in orderUpdated listener:', error)
      })
    );
  }

  private updateTableInList(updatedTable: Table) {
    const updatedTables = this.tablesSubject.value.map(table => {
      if (table.otp === updatedTable.otp) {
        return { ...table, ...updatedTable };
      }
      return table;
    });
    this.tablesSubject.next(updatedTables);
  }

  private updateTableStatus(tableOtp: string, hasOrders: boolean) {
    const updatedTables = this.tablesSubject.value.map(table => {
      if (table.otp === tableOtp) {
        return { ...table, hasOrders, isOccupied: hasOrders };
      }
      return table;
    });
    this.tablesSubject.next(updatedTables);
    this.cdr.markForCheck();
  }

  private listenForWaiterCalls() {
    this.subscription.add(
      this.webSocketService.listen('waiterCalled').subscribe({
        next: (data: { tableOtp: string, restaurantId: string }) => {
          console.log('Waiter called:', data);
          if (data.restaurantId === this.restaurantId) {
            const table = this.tablesSubject.value.find(t => t.otp === data.tableOtp);
            if (table) {
              this.updateWaiterCallStatus(table.number, true);
            } else {
              console.error('Table not found for OTP:', data.tableOtp);
            }
          }
        },
        error: error => console.error('Error in waiterCalled listener:', error)
      })
    );
  }

  private applyPersistedWaiterStatus(tables: Table[]): Table[] {
    return tables.map(table => ({
      ...table,
      waiterCalled: localStorage.getItem(`waiterCalled_${table.number}_${this.restaurantId}`) === 'true'
    }));
  }

  private checkTablesForOrders() {
    const tables = this.tablesSubject.value;
    if (tables.length === 0 || !this.restaurantId) return;

    const orderChecks = tables.map(table => 
      this.orderService.getOrdersByTableOtp(table.otp).pipe(
        map(orders => ({
          ...table,
          hasOrders: orders.length > 0,
          isOccupied: orders.length > 0
        })),
        catchError(() => of({ ...table, hasOrders: false, isOccupied: false }))
      )
    );

    forkJoin(orderChecks).subscribe({
      next: (updatedTables: Table[]) => {
        console.log('Initial table status check:', updatedTables);
        this.tablesSubject.next(updatedTables);
        this.cdr.markForCheck();
      },
      error: error => console.error('Error checking initial table status:', error)
    });
  }

  openAddTableDialog() {
    if (!this.restaurantId) {
      console.error('No restaurant ID found');
      return;
    }

    const dialogRef = this.dialog.open(AddTableDialogComponent, {
      width: '80%',
      height: 'auto',
      data: { restaurantId: this.restaurantId }
    });

    dialogRef.componentInstance.tableAdded.subscribe((newTable: Table) => {
      const updatedTables = [...this.tablesSubject.value, newTable];
      this.tablesSubject.next(updatedTables);
      this.cdr.markForCheck();
    });
  }

  private startOrderFetch(): void {
    this.subscription.add(
      interval(60000).subscribe(() => {
        this.orderService.fetchOrders();
        this.updateFetchTime();
      })
    );
  }

  private updateFetchTime(): void {
    this.lastFetchedTime = Date.now();
    this.updateSecondsAgo();
  }

  private updateSecondsAgo(): void {
    const currentTime = Date.now();
    const differenceInSeconds = Math.floor((currentTime - this.lastFetchedTime) / 1000);
    this.secondsAgo = differenceInSeconds;
    this.cdr.markForCheck();
  }

  refreshOrders(): void {
    this.orderService.fetchOrders();
    this.updateFetchTime();
  }

  private groupOrdersByTable(orders: Order[]): GroupedOrder[] {
    const groupedOrders: { [tableNumber: string]: GroupedOrder } = {};
  
    orders.forEach(order => {
      if (!groupedOrders[order.tableNumber]) {
        groupedOrders[order.tableNumber] = {
          tableNumber: order.tableNumber,
          items: []
        };
      }
  
      order.items.forEach(item => {
        const existingItem = groupedOrders[order.tableNumber].items.find(i => i.name === item.name);
        if (existingItem) {
          existingItem.quantity += item.quantity;
          // Ensure we always have a valid string for status
          existingItem.status = this.determineStatus(existingItem.status, item.status);
        } else {
          groupedOrders[order.tableNumber].items.push({
            name: item.name,
            quantity: item.quantity,
            status: item.status || 'unknown' // Provide a default value if status is undefined
          });
        }
      });
    });
  
    return Object.values(groupedOrders);
  }
  private determineStatus(existingStatus: string, newStatus: string | undefined): string {
    if (existingStatus === 'pending' || newStatus === 'pending') {
      return 'pending';
    }
    if (newStatus === undefined) {
      return existingStatus;
    }
    return newStatus;
  }
  private handleError(error: any): void {
    console.error('An error occurred:', error);
    // Implement any error handling logic here, such as displaying a user-friendly message
  }

  // You can add any additional methods or properties here if needed

}