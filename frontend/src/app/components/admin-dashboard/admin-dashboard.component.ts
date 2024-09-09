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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface MenuItem {
  _id?: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
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
    MatSnackBarModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  menuForm: FormGroup;
  menuItems: MenuItem[] = [];
  editingItem: MenuItem | null = null;
  isLoading = false;
  displayedColumns: string[] = ['name', 'category', 'price', 'description', 'actions'];

  categories = ['Appetizers', 'Mains', 'Desserts', 'Beverages'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.menuForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      description: [''],
      imageUrl: ['']
    });
  }

  ngOnInit() {
    this.loadMenuItems();
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
        this.snackBar.open('Error loading menu items', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  onSubmit() {
    if (this.menuForm.valid) {
      this.isLoading = true;
      if (this.editingItem) {
        this.updateMenuItem();
      } else {
        this.addMenuItem();
      }
    } else {
      this.menuForm.markAllAsTouched();
    }
  }

  addMenuItem() {
    this.http.post<MenuItem>(`${environment.apiUrl}/food`, this.menuForm.value).subscribe({
      next: (newItem) => {
        this.menuItems = [...this.menuItems, newItem]; // Update local state
        this.resetForm();
        this.snackBar.open('Menu item added successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error adding menu item:', error);
        this.snackBar.open('Error adding menu item', 'Close', { duration: 3000 });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  updateMenuItem() {
    if (!this.editingItem?._id) return;

    this.http.put<MenuItem>(`${environment.apiUrl}/food/${this.editingItem._id}`, this.menuForm.value).subscribe({
      next: (updatedItem) => {
        const index = this.menuItems.findIndex(item => item._id === updatedItem._id);
        if (index !== -1) {
          this.menuItems = [
            ...this.menuItems.slice(0, index),
            updatedItem,
            ...this.menuItems.slice(index + 1)
          ];
        }
        this.resetForm();
        this.snackBar.open('Menu item updated successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating menu item:', error);
        this.snackBar.open('Error updating menu item', 'Close', { duration: 3000 });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  editItem(item: MenuItem) {
    this.editingItem = item;
    this.menuForm.patchValue(item);
  }

  deleteItem(item: MenuItem) {
    if (!item._id) return;

    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/food/${item._id}`).subscribe({
      next: () => {
        this.menuItems = this.menuItems.filter(menuItem => menuItem._id !== item._id);
        this.snackBar.open('Menu item deleted successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error deleting menu item:', error);
        this.snackBar.open('Error deleting menu item', 'Close', { duration: 3000 });
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  resetForm() {
    this.menuForm.reset();
    this.editingItem = null;
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // In a real application, you would upload the file to a server and get a URL back
      // For this example, we'll just use a fake URL
      this.menuForm.patchValue({
        imageUrl: URL.createObjectURL(file)
      });
    }
  }

  // Getter for easy access to form fields
  get f() { return this.menuForm.controls; }
}