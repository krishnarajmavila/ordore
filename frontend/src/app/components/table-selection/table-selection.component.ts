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
  preparingOrders$!: Observable<Order[]>;
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
    if (!this.restaurantId) {
      console.error('No restaurant ID found');
      return;
    }
    this.setupWebSocketListeners();
    this.listenForWaiterCalls();
    this.fetchTables();
    this.orderService.fetchOrders();
    this.updateFetchTime();
    this.preparingOrders$ = this.orderService.getOrders().pipe(
      tap(orders => console.log('All fetched orders:', orders)),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of([]); // Return an empty array if an error occurs
      })
    );
    this.startOrderFetch();
    this.orderService.startOrderRefresh();
  }
  private startOrderFetch(): void {
    this.subscription = interval(60000).subscribe(() => {
      this.orderService.fetchOrders(); // Call to fetch orders
    });
  }
  private updateFetchTime(): void {
    this.lastFetchedTime = Date.now();
    this.updateSecondsAgo();
  }

  private updateSecondsAgo(): void {
    const currentTime = Date.now();
    const differenceInSeconds = Math.floor((currentTime - this.lastFetchedTime) / 1000);
    this.secondsAgo = differenceInSeconds;
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
    }).subscribe(
      tables => {
        console.log('Fetched tables:', tables);
        this.tables = tables;
        this.tablesSubject.next(tables);
        this.cdr.detectChanges();
      },
      error => console.error('Error fetching tables:', error)
    );
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
    event.stopPropagation();
    const key = `waiterCalled_${table.number}`;
    localStorage.removeItem(key);

    const payload = {
      tableId: table._id || table.number,
      restaurantId: this.restaurantId
    };

    this.http.post(`${environment.apiUrl}/waiter-calls/acknowledge`, payload)
      .subscribe(
        () => {
          this.updateWaiterCallStatus(table.number, false);
          const updatedTables = this.tablesSubject.value.map(t =>
            t.number === table.number ? { ...t, waiterCalled: false } : t
          );
          this.tablesSubject.next(updatedTables);
          this.cdr.detectChanges();

          this.webSocketService.emit('waiterCallAcknowledged', { tableNumber: table.number, restaurantId: this.restaurantId });

          console.log(`Waiter call acknowledged for table ${table.number}`);
        },
        error => {
          console.error('Error acknowledging waiter call:', error);
        }
      );
  }
  private updateWaiterCallStatus(tableNumber: string, status: boolean) {
    const updatedTables = this.tablesSubject.value.map(table => {
        if (table.number === tableNumber) {
            // Update the waiterCalled status
            return { ...table, waiterCalled: status };
        }
        return table;
    });
    this.tablesSubject.next(updatedTables); // Update the BehaviorSubject with the new table statuses

    // Update local storage to persist the waiter call status
    const key = `waiterCalled_${tableNumber}`;
    if (status) {
        localStorage.setItem(key, 'true'); // Set as true if the waiter was called
    } else {
        localStorage.removeItem(key); // Remove from local storage if the call was acknowledged
    }
    this.cdr.markForCheck(); // Ensure the view is updated
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
      this.webSocketService.listen('payOrder').subscribe(
        (data: { orders: Order[], paymentType: string, tableOtp: string }) => {
          console.log('TableSelectionComponent: Received payOrder event:', data);
          this.updateTablePaymentStatus(data.tableOtp, true, data.paymentType);
        },
        error => console.error('TableSelectionComponent: Error in payOrder listener:', error)
      )
    );
    this.subscription.add(
      this.webSocketService.listen('tableUpdate').subscribe(
        (updatedTable: Table & { restaurantId: string }) => {
          console.log('Received table update:', updatedTable);
          if (updatedTable.restaurantId === this.restaurantId) {
            this.ngZone.run(() => {
              this.updateTableInList(updatedTable);
              this.cdr.detectChanges();
            });
          }
        },
        error => console.error('Error in tableUpdate listener:', error)
      )
    );

    this.subscription.add(
      this.webSocketService.listen('newOrder').subscribe(
        (newOrder: Order & { restaurantId: string }) => {
          if (newOrder.restaurantId === this.restaurantId) {
            console.log('Received newOrder event:', newOrder);
            this.updateTableStatus(newOrder.tableOtp, true);
          }
        },
        error => console.error('Error in newOrder listener:', error)
      )
    );

    this.subscription.add(
      this.webSocketService.listen('orderStatusChange').subscribe(
        (data: { tableOtp: string, hasOrders: boolean, restaurantId: string }) => {
          if (data.restaurantId === this.restaurantId) {
            console.log('Received orderStatusChange event:', data);
            this.updateTableStatus(data.tableOtp, data.hasOrders);
          }
        },
        error => console.error('Error in orderStatusChange listener:', error)
      )
    );

    this.subscription.add(
      this.webSocketService.listen('orderUpdated').subscribe(
        (updatedOrder: Order) => {
          console.log('Received orderUpdated event:', updatedOrder);
          
          // Update the order in the current list
          const currentOrders = this.ordersSubject.value;
          const updatedOrders = currentOrders.map(order =>
            order._id === updatedOrder._id ? updatedOrder : order
          );
          this.ordersSubject.next(updatedOrders); // Emit the updated orders
          this.cdr.detectChanges(); // Refresh the UI if needed
        },
        error => console.error('Error in orderUpdated listener:', error)
      )
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
    this.cdr.detectChanges();
  }

  private listenForWaiterCalls() {
    const waiterCallKey = `waiterCalled_${this.restaurantId}`;
    this.subscription.add(
      this.webSocketService.listen('waiterCalled').subscribe(
        (tableNumber: string) => {
          console.log(`Waiter called for table: ${tableNumber}`);
          localStorage.setItem(waiterCallKey, 'true');
          const updatedTables = this.tablesSubject.value.map(table => {
            if (table.number === tableNumber) {
              return { ...table, waiterCalled: true };
            }
            return table;
          });
          this.tablesSubject.next(updatedTables);
          this.cdr.detectChanges();
        },
        error => console.error('Error in waiterCalled listener:', error)
      )
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

    forkJoin(orderChecks).subscribe(
      (updatedTables: Table[]) => {
        console.log('Initial table status check:', updatedTables);
        this.tablesSubject.next(updatedTables);
        this.cdr.detectChanges();
      },
      error => console.error('Error checking initial table status:', error)
    );
  }
  openAddTableDialog() {
    if (!this.restaurantId) {
        console.error('No restaurant ID found');
        return; // Exit if there's no restaurant ID
    }

    const dialogRef = this.dialog.open(AddTableDialogComponent, {
        width: '80%', // Set the width of the dialog
        height: 'auto', // Set the height of the dialog
        data: { restaurantId: this.restaurantId } // Pass the restaurant ID to the dialog
    });

    // Subscribe to the tableAdded event from the dialog
    dialogRef.componentInstance.tableAdded.subscribe((newTable: Table) => {
        const updatedTables = [...this.tablesSubject.value, newTable]; // Add the new table to the existing list
        this.tablesSubject.next(updatedTables); // Update the BehaviorSubject with the new tables list
        this.cdr.detectChanges(); // Trigger change detection to refresh the view
    });
}

}
