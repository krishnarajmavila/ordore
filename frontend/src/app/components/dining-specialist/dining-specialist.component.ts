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
    OrderManagementComponent
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
  activeView = 'tables';
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  
  selectedTable: Table | null = null;

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
    this.loadMenuItems();
    this.loadTables();
  }

  loadMenuItems() {
    this.isLoading = true;
    this.http.get<MenuItem[]>(`${environment.apiUrl}/food`).subscribe({
      next: (items) => {
        this.menuItems = items;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        this.showSnackBar('Error loading menu items');
        this.isLoading = false;
      }
    });
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

  onTableSubmit() {
    if (this.tableForm.valid) {
      this.isLoading = true;
      const tableData = this.tableForm.value;

      if (this.editingTable) {
        this.updateTable(tableData);
      } else {
        this.addTable(tableData);
      }
    } else {
      this.tableForm.markAllAsTouched();
    }
  }

  addTable(tableData: Table) {
    this.http.post<Table>(`${environment.apiUrl}/tables`, tableData).subscribe({
      next: (newTable) => {
        this.tables = [...this.tables, newTable];
        this.resetTableForm();
        this.showSnackBar('Table added successfully');
      },
      error: (error) => {
        console.error('Error adding table:', error);
        this.showSnackBar('Error adding table');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  updateTable(tableData: Table) {
    if (!this.editingTable?._id) return;

    this.http.put<Table>(`${environment.apiUrl}/tables/${this.editingTable._id}`, tableData).subscribe({
      next: (updatedTable) => {
        const index = this.tables.findIndex(table => table._id === updatedTable._id);
        if (index !== -1) {
          this.tables[index] = updatedTable;
          this.tables = [...this.tables];
        }
        this.resetTableForm();
        this.showSnackBar('Table updated successfully');
      },
      error: (error) => {
        console.error('Error updating table:', error);
        this.showSnackBar('Error updating table');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  editTable(table: Table) {
    this.editingTable = table;
    this.tableForm.patchValue({
      number: table.number,
      capacity: table.capacity,
      isOccupied: table.isOccupied
    });
  }

  deleteTable(table: Table) {
    if (!table._id) return;

    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/tables/${table._id}`).subscribe({
      next: () => {
        this.tables = this.tables.filter(t => t._id !== table._id);
        this.showSnackBar('Table deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting table:', error);
        this.showSnackBar('Error deleting table');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  refreshOTP(table: Table) {
    const dialogRef = this.dialog.open(TableResetDialogComponent, {
      width: '40%',
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

  resetTableForm() {
    this.tableForm.reset();
    this.editingTable = null;
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg'; // Path to a default image
    }
    // Remove '/api' from the environment.apiUrl and append the imageUrl
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  getUniqueCategories(): string[] {
    return Array.from(new Set(this.menuItems.map(item => item.category)));
  }

  onTableSelected(table: Table) {
    this.router.navigate(['/order-management', table._id], { state: { table } });
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