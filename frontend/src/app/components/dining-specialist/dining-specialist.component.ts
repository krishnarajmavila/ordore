import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TableSelectionComponent } from '../table-selection/table-selection.component';
import { OrderManagementComponent } from '../order-management/order-management.component';
import { DsOrderCheckComponent } from '../ds-order-check/ds-order-check.component';
import { TableResetDialogComponent } from '../table-reset-dialog/table-reset-dialog.component';
import { catchError, throwError } from 'rxjs';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  location?: string;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  restaurant: string;
}

@Component({
  selector: 'app-dining-specialist',
  standalone: true,
  imports: [
    CommonModule,
    TableSelectionComponent,
    OrderManagementComponent,
    DsOrderCheckComponent
  ],
  templateUrl: './dining-specialist.component.html',
  styleUrls: ['./dining-specialist.component.scss']
})
export class DiningSpecialistComponent implements OnInit {
  tables: Table[] = [];
  selectedTable: Table | null = null;
  showOrderManagement = false;
  showOrderCheck = false;
  selectedTableOtp: string | null = null;
  isLoading = false;
  restaurantId: string | null = null;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    // Get restaurant ID from local storage
    this.restaurantId = this.getSelectedRestaurantId();
    if (this.restaurantId) {
      this.loadTables();  // Load tables only if the restaurant ID is available
    } else {
      this.handleError('Restaurant ID is not available');
    }
  }

  // Method to retrieve the selected restaurant ID from local storage
  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  loadTables() {
    if (!this.restaurantId) {
      this.handleError('Restaurant ID is not available');
      return;
    }

    this.isLoading = true;
    this.http.get<Table[]>(`${environment.apiUrl}/tables?restaurantId=${this.restaurantId}`)
      .pipe(
        catchError(this.handleHttpError.bind(this))
      )
      .subscribe({
        next: (tables) => {
          this.tables = tables;
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError('Error loading tables', error);
          this.isLoading = false;
        }
      });
  }

  onTableSelected(table: Table) {
    this.selectedTable = table;
    this.selectedTableOtp = table.otp;
    this.showOrderManagement = true;
    this.showOrderCheck = false;
  }

  onBackToTableSelection() {
    this.showOrderManagement = false;
    this.showOrderCheck = false;
    this.selectedTable = null;
    this.selectedTableOtp = null;
  }

  onBackToOrderManagement() {
    this.showOrderCheck = false;
    this.showOrderManagement = true;
  }

  onViewOrders(tableOtp: string) {
    this.showOrderManagement = false;
    this.showOrderCheck = true;
    this.selectedTableOtp = tableOtp;
  }

  refreshOTP(table: Table) {
    const dialogRef = this.dialog.open(TableResetDialogComponent, {
      width: 'auto',
      data: { tableNumber: table.number }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.http.post<Table>(`${environment.apiUrl}/tables/${table._id}/refresh-otp`, {}).subscribe({
          next: (updatedTable) => {
            const index = this.tables.findIndex(t => t._id === updatedTable._id);
            if (index !== -1) {
              this.tables[index] = updatedTable;
              this.tables = [...this.tables];
            }
            this.showSnackBar('Table reset and OTP refreshed successfully');
          },
          error: (error) => {
            console.error('Error resetting table and refreshing OTP:', error);
            this.showSnackBar('Error resetting table and refreshing OTP');
          },
          complete: () => {
            this.isLoading = false;
          }
        });
      }
    });
  } 
  

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }

  private handleError(message: string, error?: any) {
    console.error(message, error);
    this.showSnackBar(message);
    if (error) {
      // Additional error logging for better diagnostics
      if (error.error) {
        console.error('Server error:', error.error);
      } else {
        console.error('HTTP Error:', error);
      }
    }
    if (!this.restaurantId) {
      this.router.navigate(['/login']);
    }
  }

  private handleHttpError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      // Log more details for debugging
      if (error.error) {
        console.error('Server error response:', error.error);
      }
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
