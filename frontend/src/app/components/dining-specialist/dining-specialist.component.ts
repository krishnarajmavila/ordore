import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarModule, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { TableResetDialogComponent } from '../table-reset-dialog/table-reset-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { OrderManagementComponent } from '../order-management/order-management.component';
import { TableSelectionComponent } from '../table-selection/table-selection.component';
import { DsOrderCheckComponent } from '../ds-order-check/ds-order-check.component';

interface MenuItem {
  _id?: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isVegetarian: boolean;
}

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  location?: string;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
}

@Component({
  selector: 'app-dining-specialist',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatListModule,
    DragDropModule,
    MatSidenavModule,
    MatCheckboxModule,
    MatExpansionModule,
    TableSelectionComponent,
    OrderManagementComponent,
    DsOrderCheckComponent
  ],
  templateUrl: './dining-specialist.component.html',
  styleUrls: ['./dining-specialist.component.scss']
})
export class DiningSpecialistComponent implements OnInit {
  tableForm: FormGroup;
  menuItems: MenuItem[] = [];
  tables: Table[] = [];
  editingTable: Table | null = null;
  isLoading = false;
  displayedTableColumns: string[] = ['number', 'capacity', 'isOccupied', 'otp', 'actions'];
  categories = ['Appetizers', 'Mains', 'Desserts', 'Beverages'];
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  
  showOrderManagement = false;
  showOrderCheck = false;
  selectedTable: Table | null = null;
  selectedTableOtp: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.tableForm = this.fb.group({
      number: ['', [Validators.required, Validators.min(1)]],
      capacity: ['', [Validators.required, Validators.min(1)]],
      isOccupied: [false]
    });
  }

  ngOnInit() {
    this.loadTables();
  }

  loadTables() {
    this.isLoading = true;
    this.http.get<Table[]>(`${environment.apiUrl}/tables`).subscribe({
      next: (tables) => {
        this.tables = tables;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tables:', error);
        this.showSnackBar('Error loading tables');
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

  showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }
}