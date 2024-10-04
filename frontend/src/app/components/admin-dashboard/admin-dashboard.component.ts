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
import { MatSnackBar, MatSnackBarModule, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { TableResetDialogComponent } from '../table-reset-dialog/table-reset-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { UserManagementComponent } from '../user-management/user-management.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ReportingComponent } from '../reports/reporting.component';
import { RestaurantService } from '../../services/restaurant.service';
import { RestaurantSelectorComponent } from '../restaurant-selector/restaurant-selector.component';

interface MenuItem {
  _id?: string;
  name: string;
  category: string | FoodType;
  price: number;
  description?: string;
  imageUrl?: string;
  isVegetarian: boolean;
  restaurant: string;
}

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

interface FoodType {
  _id: string;
  name: string;
  restaurant: string;
}

interface Restaurant {
  _id: string;
  name: string;
  parentOrganization: string;
  type: 'branch' | 'franchisee';
  city: string;
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
    MatSidenavModule,
    MatCheckboxModule,
    MatExpansionModule,
    UserManagementComponent,
    MatToolbarModule,
    ReportingComponent,
    RestaurantSelectorComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  menuForm: FormGroup;
  tableForm: FormGroup;
  foodTypeForm: FormGroup;
  restaurantForm: FormGroup;
  menuItems: MenuItem[] = [];
  tables: Table[] = [];
  foodTypes: FoodType[] = [];
  restaurants: Restaurant[] = [];
  editingItem: MenuItem | null = null;
  editingTable: Table | null = null;
  editingFoodType: FoodType | null = null;
  editingRestaurant: Restaurant | null = null;
  isLoading = false;
  displayedColumns: string[] = ['name', 'category', 'price', 'description', 'isVegetarian', 'image', 'actions'];
  displayedTableColumns: string[] = ['number', 'capacity', 'location', 'isOccupied', 'otp', 'actions'];
  displayedFoodTypeColumns: string[] = ['name', 'actions'];
  displayedRestaurantColumns: string[] = ['name', 'parentOrganization', 'type', 'city', 'actions'];
  categories: string[] = [];
  selectedFile: File | null = null;
  activeView: string;
  sidenavCollapsed: boolean = false;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  currentRestaurant: Restaurant | null = null;
  
  tableLocations: string[] = [
    'Parcel - Take Away',
    'First Floor - Main Dining Area',
    'First Floor - Bar Area',
    'First Floor - Patio',
    'Second Floor - Fine Dining Section',
    'Second Floor - Lounge Area',
    'Second Floor - Balcony',
    'Mezzanine - Private Dining Room A',
    'Mezzanine - Private Dining Room B',
    'Mezzanine - Corridor',
    'Rooftop - Open-Air Dining',
    'Rooftop - Rooftop Bar'
  ];

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private restaurantService: RestaurantService
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
      location: [''],
      isOccupied: [false]
    });

    this.foodTypeForm = this.fb.group({
      name: ['', Validators.required]
    });

    this.restaurantForm = this.fb.group({
      name: ['', Validators.required],
      parentOrganization: ['', Validators.required],
      type: ['', Validators.required],
      city: ['', Validators.required]
    });

    this.activeView = localStorage.getItem('activeView') || 'Add Menu';
    this.sidenavCollapsed = localStorage.getItem('sidenavCollapsed') === 'true';
  }

  ngOnInit() {
    this.restaurantService.getCurrentRestaurant().subscribe(restaurantId => {
      if (restaurantId) {
        this.restaurantService.getRestaurant(restaurantId).subscribe(restaurant => {
          this.currentRestaurant = restaurant;
          this.loadMenuItems();
          this.loadTables();
          this.loadFoodTypes();
        });
      }
    });
    this.loadRestaurants();
  }

  loadMenuItems() {
    if (!this.currentRestaurant) return;
    this.isLoading = true;
    this.http.get<MenuItem[]>(`${environment.apiUrl}/food?restaurantId=${this.currentRestaurant._id}`).subscribe({
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
    if (!this.currentRestaurant) return;
    this.isLoading = true;
    this.http.get<Table[]>(`${environment.apiUrl}/tables?restaurantId=${this.currentRestaurant._id}`).subscribe({
      next: (tables) => {
        this.tables = this.sortTables(tables);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tables:', error);
        this.showSnackBar('Error loading tables');
        this.isLoading = false;
      }
    });
  }

  loadFoodTypes() {
    if (!this.currentRestaurant) return;
    this.isLoading = true;
    this.http.get<FoodType[]>(`${environment.apiUrl}/food-types?restaurantId=${this.currentRestaurant._id}`).subscribe({
      next: (types) => {
        this.foodTypes = types;
        this.categories = types.map(type => type.name);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading food types:', error);
        this.showSnackBar('Error loading food types');
        this.isLoading = false;
      }
    });
  }

  loadRestaurants() {
    this.isLoading = true;
    this.restaurantService.getRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants = restaurants;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
        this.showSnackBar('Error loading restaurants');
        this.isLoading = false;
      }
    });
  }

  sortTables(tables: Table[]): Table[] {
    return tables.sort((a, b) => {
      if (a.location === 'Parcel - Take Away') return -1;
      if (b.location === 'Parcel - Take Away') return 1;
      return 0;
    });
  }

  onSubmit() {
    if (this.menuForm.valid && this.currentRestaurant) {
      this.isLoading = true;
      const formData = new FormData();
      Object.keys(this.menuForm.controls).forEach(key => {
        if (key === 'category') {
          const categoryName = this.menuForm.get(key)?.value;
          const category = this.foodTypes.find(type => type.name === categoryName);
          formData.append(key, category ? category._id : categoryName);
        } else {
          formData.append(key, this.menuForm.get(key)?.value);
        }
      });

      formData.append('restaurant', this.currentRestaurant._id);

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
    if (this.tableForm.valid && this.currentRestaurant) {
      this.isLoading = true;
      const tableData = { ...this.tableForm.value, restaurant: this.currentRestaurant._id };

      if (this.editingTable) {
        this.updateTable(tableData);
      } else {
        this.addTable(tableData);
      }
    } else {
      this.tableForm.markAllAsTouched();
    }
  }

  onFoodTypeSubmit() {
    if (this.foodTypeForm.valid && this.currentRestaurant) {
      this.isLoading = true;
      const foodTypeData = { ...this.foodTypeForm.value, restaurant: this.currentRestaurant._id };

      if (this.editingFoodType) {
        this.updateFoodType(foodTypeData);
      } else {
        this.addFoodType(foodTypeData);
      }
    } else {
      this.foodTypeForm.markAllAsTouched();
    }
  }

  onRestaurantSubmit() {
    if (this.restaurantForm.valid) {
      this.isLoading = true;
      const restaurantData = this.restaurantForm.value;

      if (this.editingRestaurant) {
        this.updateRestaurant(restaurantData);
      } else {
        this.addRestaurant(restaurantData);
      }
    } else {
      this.restaurantForm.markAllAsTouched();
    }
  }

  addMenuItem(formData: FormData) {
    this.http.post<MenuItem>(`${environment.apiUrl}/food`, formData).subscribe({
      next: (newItem) => {
        this.menuItems = [...this.menuItems, newItem];
        this.resetForm();
        this.showSnackBar('Menu item added successfully');
      },
      error: (error) => {
        console.error('Error adding menu item:', error);
        this.showSnackBar('Error adding menu item');
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
      this.showSnackBar('Menu item updated successfully');
    },
    error: (error) => {
      console.error('Error updating menu item:', error);
      this.showSnackBar('Error updating menu item');
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}

  addTable(tableData: Table) {
    this.http.post<Table>(`${environment.apiUrl}/tables`, tableData).subscribe({
      next: (newTable) => {
        this.tables = this.sortTables([...this.tables, newTable]);
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
        const updatedTables = this.tables.map(table => 
          table._id === updatedTable._id ? updatedTable : table
        );
        this.tables = this.sortTables(updatedTables);
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

  addFoodType(foodTypeData: FoodType) {
    this.http.post<FoodType>(`${environment.apiUrl}/food-types`, foodTypeData).subscribe({
      next: (newType) => {
        this.foodTypes = [...this.foodTypes, newType];
        this.categories = this.foodTypes.map(type => type.name);
        this.resetFoodTypeForm();
        this.showSnackBar('Food type added successfully');
      },
      error: (error) => {
        console.error('Error adding food type:', error);
        this.showSnackBar('Error adding food type');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  updateFoodType(foodTypeData: FoodType) {
    if (!this.editingFoodType?._id) return;

    this.http.put<FoodType>(`${environment.apiUrl}/food-types/${this.editingFoodType._id}`, foodTypeData).subscribe({
      next: (updatedType) => {
        const index = this.foodTypes.findIndex(type => type._id === updatedType._id);
        if (index !== -1) {
          this.foodTypes[index] = updatedType;
          this.foodTypes = [...this.foodTypes];
          this.categories = this.foodTypes.map(type => type.name);
        }
        this.resetFoodTypeForm();
        this.showSnackBar('Food type updated successfully');
      },
      error: (error) => {
        console.error('Error updating food type:', error);
        this.showSnackBar('Error updating food type');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  addRestaurant(restaurantData: Restaurant) {
    this.restaurantService.createRestaurant(restaurantData).subscribe({
      next: (newRestaurant) => {
        this.restaurants = [...this.restaurants, newRestaurant];
        this.resetRestaurantForm();
        this.showSnackBar('Restaurant added successfully');
      },
      error: (error) => {
        console.error('Error adding restaurant:', error);
        this.showSnackBar('Error adding restaurant');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  updateRestaurant(restaurantData: Restaurant) {
    if (!this.editingRestaurant?._id) return;

    this.restaurantService.updateRestaurant(this.editingRestaurant._id, restaurantData).subscribe({
      next: (updatedRestaurant) => {
        const index = this.restaurants.findIndex(r => r._id === updatedRestaurant._id);
        if (index !== -1) {
          this.restaurants[index] = updatedRestaurant;
          this.restaurants = [...this.restaurants];
        }
        this.resetRestaurantForm();
        this.showSnackBar('Restaurant updated successfully');
      },
      error: (error) => {
        console.error('Error updating restaurant:', error);
        this.showSnackBar('Error updating restaurant');
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
      category: typeof item.category === 'object' ? item.category._id : item.category,
      isVegetarian: item.isVegetarian
    });
    this.selectedFile = null;
  }

  editTable(table: Table) {
    this.editingTable = table;
    this.tableForm.patchValue({
      number: table.number,
      capacity: table.capacity,
      location: table.location,
      isOccupied: table.isOccupied
    });
  }

  editFoodType(foodType: FoodType) {
    this.editingFoodType = foodType;
    this.foodTypeForm.patchValue({
      name: foodType.name
    });
  }

  editRestaurant(restaurant: Restaurant) {
    this.editingRestaurant = restaurant;
    this.restaurantForm.patchValue({
      name: restaurant.name,
      parentOrganization: restaurant.parentOrganization,
      type: restaurant.type,
      city: restaurant.city
    });
  }

  deleteItem(item: MenuItem) {
    if (!item._id) return;

    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/food/${item._id}`).subscribe({
      next: () => {
        this.menuItems = this.menuItems.filter(menuItem => menuItem._id !== item._id);
        this.showSnackBar('Menu item deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting menu item:', error);
        this.showSnackBar('Error deleting menu item');
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
        this.tables = this.sortTables(this.tables.filter(t => t._id !== table._id));
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

  deleteFoodType(foodType: FoodType) {
    if (!foodType._id) return;

    this.isLoading = true;
    this.http.delete(`${environment.apiUrl}/food-types/${foodType._id}`).subscribe({
      next: () => {
        this.foodTypes = this.foodTypes.filter(type => type._id !== foodType._id);
        this.categories = this.foodTypes.map(type => type.name);
        this.showSnackBar('Food type deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting food type:', error);
        this.showSnackBar('Error deleting food type');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  deleteRestaurant(restaurant: Restaurant) {
    if (!restaurant._id) return;

    this.isLoading = true;
    this.restaurantService.deleteRestaurant(restaurant._id).subscribe({
      next: () => {
        this.restaurants = this.restaurants.filter(r => r._id !== restaurant._id);
        this.showSnackBar('Restaurant deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting restaurant:', error);
        this.showSnackBar('Error deleting restaurant');
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
            const updatedTables = this.tables.map(t => 
              t._id === updatedTable._id ? updatedTable : t
            );
            this.tables = this.sortTables(updatedTables);
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

  resetForm() {
    this.menuForm.reset();
    this.editingItem = null;
    this.selectedFile = null;
  }

  resetTableForm() {
    this.tableForm.reset({}, { emitEvent: false });
    this.editingTable = null;
    
    this.tableForm.markAsPristine();
    this.tableForm.markAsUntouched();
  }

  resetFoodTypeForm() {
    this.foodTypeForm.reset();
    this.editingFoodType = null;
  }

  resetRestaurantForm() {
    this.restaurantForm.reset();
    this.editingRestaurant = null;
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg';
    }
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }
    return `${environment.cloudinaryUrl}/image/upload/${imageUrl}`;
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  getUniqueCategories(): FoodType[] {
    return this.foodTypes;
  }

  getCategoryName(category: string | FoodType | undefined): string {
    if (typeof category === 'string') {
      return category;
    } else if (category && typeof category === 'object' && 'name' in category) {
      return category.name;
    }
    return '';
  }

  getDisplayCategory(item: MenuItem): string {
    return this.getCategoryName(item.category);
  }

  setActiveView(view: string) {
    this.activeView = view;
    localStorage.setItem('activeView', view);
  }

  toggleSidenav() {
    this.sidenavCollapsed = !this.sidenavCollapsed;
    localStorage.setItem('sidenavCollapsed', this.sidenavCollapsed.toString());
  }

  navigateTo(view: string) {
    this.setActiveView(view);
    // You can add additional logic here if needed
  }

  isUserManagementActive(): boolean {
    return this.activeView === 'User Management';
  }

  isReportingActive(): boolean {
    return this.activeView === 'Reporting';
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

  onRestaurantChange(restaurant: Restaurant) {
    this.currentRestaurant = restaurant;
    this.loadMenuItems();
    this.loadTables();
    this.loadFoodTypes();
  }

  get f() { return this.menuForm.controls; }
}