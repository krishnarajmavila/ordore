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
  number: number;
  capacity: number;
  isOccupied: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
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
    MatExpansionModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  menuForm: FormGroup;
  tableForm: FormGroup;
  menuItems: MenuItem[] = [];
  tables: Table[] = [];
  editingItem: MenuItem | null = null;
  editingTable: Table | null = null;
  isLoading = false;
  displayedColumns: string[] = ['name', 'category', 'price', 'description', 'isVegetarian', 'image', 'actions'];
  displayedTableColumns: string[] = ['number', 'capacity', 'isOccupied', 'actions'];
  categories = ['Appetizers', 'Mains', 'Desserts', 'Beverages'];
  selectedFile: File | null = null;
  activeView = 'Add Menu';
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router
  ) {
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: [''],
      imageUrl: [''],
      isVegetarian: [null, Validators.required]
    });

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
        this.snackBar.open('Error loading menu items', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
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
        this.snackBar.open('Error loading tables', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.menuForm.valid) {
      this.isLoading = true;
      const formData = new FormData();
      Object.keys(this.menuForm.controls).forEach(key => {
        formData.append(key, this.menuForm.get(key)?.value);
      });

      if (this.selectedFile) {
        formData.append('image', this.selectedFile, this.selectedFile.name);
      }

      if (this.editingItem) {
        this.updateMenuItem(formData);
      } else {
        this.addMenuItem(formData);
      }
    } else {
      this.menuForm.markAllAsTouched();
    }
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

  addMenuItem(formData: FormData) {
    this.http.post<MenuItem>(`${environment.apiUrl}/food`, formData).subscribe({
      next: (newItem) => {
        this.menuItems = [...this.menuItems, newItem];
        this.resetForm();
        this.snackBar.open('Menu item added successfully', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      error: (error) => {
        console.error('Error adding menu item:', error);
        this.snackBar.open('Error adding menu item', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  updateMenuItem(formData: FormData) {
    if (!this.editingItem?._id) return;

    this.http.put<MenuItem>(`${environment.apiUrl}/food/${this.editingItem._id}`, formData).subscribe({
      next: (updatedItem) => {
        const index = this.menuItems.findIndex(item => item._id === updatedItem._id);
        if (index !== -1) {
          this.menuItems[index] = updatedItem;
          this.menuItems = [...this.menuItems];
        }
        this.resetForm();
        this.snackBar.open('Menu item updated successfully', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      error: (error) => {
        console.error('Error updating menu item:', error);
        this.snackBar.open('Error updating menu item', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  addTable(tableData: Table) {
    this.http.post<Table>(`${environment.apiUrl}/tables`, tableData).subscribe({
      next: (newTable) => {
        this.tables = [...this.tables, newTable];
        this.resetTableForm();
        this.snackBar.open('Table added successfully', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      error: (error) => {
        console.error('Error adding table:', error);
        this.snackBar.open('Error adding table', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
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
        this.snackBar.open('Table updated successfully', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      error: (error) => {
        console.error('Error updating table:', error);
        this.snackBar.open('Error updating table', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  editItem(item: MenuItem) {
    this.editingItem = item;
    this.menuForm.patchValue({
      ...item,
      isVegetarian: item.isVegetarian
    });
    this.selectedFile = null;
  }

  editTable(table: Table) {
    this.editingTable = table;
    this.tableForm.patchValue({
      number: table.number,
      capacity: table.capacity,
      isOccupied: table.isOccupied
    });
  }

  deleteItem(item: MenuItem) {
    if (!item._id) return;

    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/food/${item._id}`).subscribe({
      next: () => {
        this.menuItems = this.menuItems.filter(menuItem => menuItem._id !== item._id);
        this.snackBar.open('Menu item deleted successfully', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      error: (error) => {
        console.error('Error deleting menu item:', error);
        this.snackBar.open('Error deleting menu item', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  deleteTable(table: Table) {
    if (!table._id) return;

    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/tables/${table._id}`).subscribe({
      next: () => {
        this.tables = this.tables.filter(t => t._id !== table._id);
        this.snackBar.open('Table deleted successfully', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      error: (error) => {
        console.error('Error deleting table:', error);
        this.snackBar.open('Error deleting table', 'Close', { 
          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition 
        });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  resetForm() {
    this.menuForm.reset();
    this.editingItem = null;
    this.selectedFile = null;
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

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }
  getUniqueCategories(): string[] {
    return Array.from(new Set(this.menuItems.map(item => item.category)));
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get f() { return this.menuForm.controls; }
}