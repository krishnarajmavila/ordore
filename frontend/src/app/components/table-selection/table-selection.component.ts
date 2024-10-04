import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../../services/web-socket.service';
import { MatDialog } from '@angular/material/dialog';
import { AddTableDialogComponent } from '../add-table-dialog/add-table-dialog.component';

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
}

interface Order {
  _id: string;
  tableOtp: string;
}

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTabsModule],
  templateUrl: './table-selection.component.html',
  styleUrls: ['./table-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSelectionComponent implements OnInit, OnDestroy {
  @ViewChild('addTableModal') addTableModal: any;
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$: Observable<Table[]> = this.tablesSubject.asObservable();
  dineInTables$: Observable<Table[]>;
  parcelTables$: Observable<Table[]>;

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
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
          if (updatedTable.restaurantId === this.restaurantId) {
            console.log('Received tableUpdate event:', updatedTable);
            this.updateTableInList(updatedTable);
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
  }

  private updateTableInList(updatedTable: Table) {
    const updatedTables = this.tablesSubject.value.map(table =>
      table._id === updatedTable._id ? { ...table, ...updatedTable } : table
    );
    this.tablesSubject.next(updatedTables);
    this.cdr.detectChanges();
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

  private checkTablesForOrders() {
    const tables = this.tablesSubject.value;
    if (tables.length === 0 || !this.restaurantId) return;

    const orderChecks = tables.map(table => 
      this.getOrdersByTableOtp(table.otp).pipe(
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

  private getOrdersByTableOtp(tableOtp: string): Observable<Order[]> {
    if (!this.restaurantId) return of([]);
    const url = `${environment.apiUrl}/orders`;
    const params = new HttpParams()
      .set('tableOtp', tableOtp)
      .set('restaurantId', this.restaurantId);
    return this.http.get<Order[]>(url, { params }).pipe(
      catchError(() => of([]))
    );
  }

  private listenForWaiterCalls() {
    this.subscription.add(
      this.webSocketService.listen('waiterCalled').subscribe(
        (data: { tableOtp: string, restaurantId: string }) => {
          if (data.restaurantId === this.restaurantId) {
            console.log('Received waiterCalled event:', data);
            const updatedTables = this.tablesSubject.value.map(table => {
              if (table.otp === data.tableOtp) {
                this.updateWaiterCallStatus(table.number, true);
                return { ...table, waiterCalled: true };
              }
              return table;
            });
            this.tablesSubject.next(updatedTables);
            this.cdr.detectChanges();
          }
        },
        error => console.error('Error in waiterCalled listener:', error)
      )
    );

    this.subscription.add(
      this.webSocketService.listen('waiterCallAcknowledged').subscribe(
        (data: { tableNumber: string, restaurantId: string }) => {
          if (data.restaurantId === this.restaurantId) {
            console.log('Received waiterCallAcknowledged event:', data);
            const updatedTables = this.tablesSubject.value.map(table => {
              if (table.number === data.tableNumber) {
                this.updateWaiterCallStatus(table.number, false);
                return { ...table, waiterCalled: false };
              }
              return table;
            });
            this.tablesSubject.next(updatedTables);
            this.cdr.detectChanges();
          }
        },
        error => console.error('Error in waiterCallAcknowledged listener:', error)
      )
    );
  }

  private updateWaiterCallStatus(tableNumber: string, status: boolean) {
    const key = `waiterCalled_${tableNumber}_${this.restaurantId}`;
    if (status) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
  }

  private applyPersistedWaiterStatus(tables: Table[]): Table[] {
    return tables.map(table => ({
      ...table,
      waiterCalled: localStorage.getItem(`waiterCalled_${table.number}_${this.restaurantId}`) === 'true'
    }));
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
      this.cdr.detectChanges();
    });
  }
}