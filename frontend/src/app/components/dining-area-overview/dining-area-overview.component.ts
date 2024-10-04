import { Component, Output, EventEmitter, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { MatTabsModule } from '@angular/material/tabs';

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
    private router: Router
  ) {
    this.dineInTables$ = this.tables$.pipe(
      map(tables => tables.filter(table => table.location !== 'Parcel - Take Away'))
    );
    this.parcelTables$ = this.tables$.pipe(
      map(tables => tables.filter(table => table.location === 'Parcel - Take Away'))
    );
  }

  ngOnInit() {
    this.loadTablesFromDb();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
    return `Table ${table.number} - ${status}`;
  }

  private loadTablesFromDb() {
    const restaurantId = this.getSelectedRestaurantId();
    this.isLoadingSubject.next(true);
    this.subscription.add(
      this.http.get<Table[]>(`${environment.apiUrl}/tables?restaurantId=${restaurantId}`).pipe(
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
        },
        error: (error) => console.error('Error updating tables:', error)
      })
    );
  }

  private checkTablesForOrders(tables: Table[]): Observable<Table[]> {
    const orderRequests = tables.map(table => 
      this.getOrdersByTableOtp(table.otp).pipe(
        map(orders => ({ ...table, hasOrders: orders.length > 0 })),
        catchError(error => {
          console.error(`Error fetching orders for table ${table.number}:`, error);
          return of({ ...table, hasOrders: false });
        })
      )
    );
  
    return forkJoin(orderRequests);
  }

  private getOrdersByTableOtp(tableOtp: string): Observable<Order[]> {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to fetch orders.');
      return of([]);
    }
  
    const url = `${environment.apiUrl}/orders`;
    const params = { tableOtp, restaurantId };
  
    return this.http.get<Order[]>(url, { params }).pipe(
      catchError((error) => {
        console.error('Error fetching orders:', error);
        return of([]);
      })
    );
  }
}