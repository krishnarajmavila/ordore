import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, Subscription, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap, take } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; // Adjust the path as needed
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  hasOrders?: boolean;
}

interface Order {
  _id: string;
  tableOtp: string;
  // ... other properties
}

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './table-selection.component.html',
  styleUrls: ['./table-selection.component.scss']
})
export class TableSelectionComponent implements OnInit, OnDestroy {
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$: Observable<Table[]> = this.tablesSubject.asObservable();
  
  private subscription: Subscription = new Subscription();

  @Output() tableSelected = new EventEmitter<Table>();
  @Output() otpRefreshRequested = new EventEmitter<Table>();

  constructor(private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  @Input() set tables(value: Table[]) {
    this.tablesSubject.next(value);
    this.checkTablesForOrders();
  }

  ngOnInit() {
    // Check for orders immediately on component initialization
    this.checkTablesForOrders();
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
  refreshOTP(table: Table) {
    this.otpRefreshRequested.emit(table);
  }
  private checkTablesForOrders() {
    this.subscription.add(
      this.tables$.pipe(
        take(1), // Take only the current value of tables
        switchMap(tables => {
          if (tables.length === 0) {
            return of([]); // If no tables, return empty array
          }
          const orderChecks = tables.map(table => 
            this.getOrdersByTableOtp(table.otp).pipe(
              map(orders => ({ 
                ...table, 
                hasOrders: orders.length > 0,
                isOccupied: orders.length > 0 // Update isOccupied based on orders
              })),
              catchError(() => of({ ...table, hasOrders: false, isOccupied: false }))
            )
          );
          return forkJoin(orderChecks);
        })
      ).subscribe({
        next: (updatedTables: Table[]) => {
          console.log('Updated tables:', updatedTables);
          if (updatedTables.length > 0) {
            this.tablesSubject.next(updatedTables);
          }
        },
        error: (error) => console.error('Error checking orders:', error)
      })
    );
  }

  private getOrdersByTableOtp(tableOtp: string): Observable<Order[]> {
    const url = `${environment.apiUrl}/orders?tableOtp=${tableOtp}`;
    console.log(`Fetching orders from: ${url}`);
    return this.http.get<Order[]>(url).pipe(
      tap(orders => console.log(`API response for tableOtp ${tableOtp}:`, orders)),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<Order[]> {
    if (error.error instanceof ErrorEvent) {
      console.error('A client-side or network error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return of([]);
  }
}