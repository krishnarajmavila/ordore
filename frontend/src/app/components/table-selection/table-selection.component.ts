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
import { MatTabsModule } from '@angular/material/tabs'; // Added for MatTabs
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { WebSocketService } from '../../services/web-socket.service';
import { FormGroup } from '@angular/forms';
import { AddTableDialogComponent } from '../add-table-dialog/add-table-dialog.component';
import { MatDialog } from '@angular/material/dialog';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  location?: string;  // Dine In or Parcel
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  hasOrders?: boolean;
  waiterCalled?: boolean;
}

interface Order {
  _id: string;
  tableOtp: string;
}

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTabsModule], // Added MatTabsModule
  templateUrl: './table-selection.component.html',
  styleUrls: ['./table-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSelectionComponent implements OnInit, OnDestroy {
  @ViewChild('addTableModal') addTableModal: any;
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$: Observable<Table[]> = this.tablesSubject.asObservable();
  // Separate observables for dine-in and parcel tables
  dineInTables$: Observable<Table[]>;
  parcelTables$: Observable<Table[]>;

  private subscription: Subscription = new Subscription();

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
    // Filter tables into Dine In and Parcel
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
    this.setupWebSocketListeners();
    this.listenForWaiterCalls();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
          
          this.webSocketService.emit('waiterCallAcknowledged', { tableNumber: table.number });
  
          console.log(`Waiter call acknowledged for table ${table.number}`);
        },
        error => {
          console.error('Error acknowledging waiter call:', error);
        }
      );
  }

  private setupWebSocketListeners() {
    // Listen for table updates
    this.subscription.add(
      this.webSocketService.listen('tableUpdate').subscribe(
        (updatedTable: Table) => {
          console.log('Received tableUpdate event:', updatedTable);
          const updatedTables = this.tablesSubject.value.map(table =>
            table._id === updatedTable._id ? { ...table, ...updatedTable } : table
          );
          this.tablesSubject.next(updatedTables);
          this.cdr.detectChanges();
        },
        error => console.error('Error in tableUpdate listener:', error)
      )
    );

    // Listen for new orders
    this.subscription.add(
      this.webSocketService.listen('newOrder').subscribe(
        (newOrder: Order) => {
          console.log('Received newOrder event:', newOrder);
          this.updateTableStatus(newOrder.tableOtp, true);
        },
        error => console.error('Error in newOrder listener:', error)
      )
    );

    // Listen for order status changes
    this.subscription.add(
      this.webSocketService.listen('orderStatusChange').subscribe(
        (data: { tableOtp: string, hasOrders: boolean }) => {
          console.log('Received orderStatusChange event:', data);
          this.updateTableStatus(data.tableOtp, data.hasOrders);
        },
        error => console.error('Error in orderStatusChange listener:', error)
      )
    );
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
    if (tables.length === 0) return;

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
    const url = `${environment.apiUrl}/orders?tableOtp=${tableOtp}`;
    return this.http.get<Order[]>(url).pipe(
      catchError(() => of([]))
    );
  }

  private listenForWaiterCalls() {
    this.subscription.add(
      this.webSocketService.listen('waiterCalled').subscribe(
        (data: { tableOtp: string }) => {
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
        },
        error => console.error('Error in waiterCalled listener:', error)
      )
    );

    this.subscription.add(
      this.webSocketService.listen('waiterCallAcknowledged').subscribe(
        (data: { tableNumber: string }) => {
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
        },
        error => console.error('Error in waiterCallAcknowledged listener:', error)
      )
    );
  }

  private updateWaiterCallStatus(tableNumber: string, status: boolean) {
    const key = `waiterCalled_${tableNumber}`;
    if (status) {
      localStorage.setItem(key, 'true');
    } else {
      localStorage.removeItem(key);
    }
  }

  private applyPersistedWaiterStatus(tables: Table[]): Table[] {
    return tables.map(table => ({
      ...table,
      waiterCalled: localStorage.getItem(`waiterCalled_${table.number}`) === 'true'
    }));
  }

  openAddTableDialog() {
    const dialogRef = this.dialog.open(AddTableDialogComponent, {
      width: '80%',
      height: 'auto'
    });

    dialogRef.componentInstance.tableAdded.subscribe((newTable: Table) => {
      // Logic to add the new table to the Parcel tab
      const updatedTables = [...this.tablesSubject.value, newTable];
      this.tablesSubject.next(updatedTables);
      this.cdr.detectChanges();
    });
  }
  
}