import { Component, OnInit, ViewChild, ChangeDetectorRef, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { environment } from '../../../environments/environment';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CartFilterPipe } from '../../pipe/cart-filter.pipe';
import { InhouseConfirmationComponent } from '../inhouse-confirmation/inhouse-confirmation.component';
import { ItemNotesSheetComponent } from '../item-notes-sheet/item-notes-sheet.component';
import { AddTableDialogComponent } from '../add-table-dialog/add-table-dialog.component';
import { BehaviorSubject } from 'rxjs';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  category: string;
  notes?: string;
}

interface Order {
  _id?: string;
  customerName: string;
  phoneNumber: string;
  items: OrderItem[];
  status: string;
  totalPrice: number;
  createdAt: Date;
  tableName?: string;
}

interface FoodType {
  _id: string;
  name: string;
}

interface MenuItem {
  _id?: string;
  name: string;
  category: FoodType;
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
  selector: 'app-parcel-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    CartFilterPipe,
    InhouseConfirmationComponent,
    ItemNotesSheetComponent,
    AddTableDialogComponent
  ],
  templateUrl: './parcel-order.component.html',
  styleUrls: ['./parcel-order.component.scss']
})
export class ParcelOrderComponent implements OnInit, AfterViewInit {
  @ViewChild('categorySlider') categorySlider!: ElementRef<HTMLElement>;
  
  private confirmationDialogRef: MatDialogRef<InhouseConfirmationComponent> | null = null;
  menuItems: MenuItem[] = [];
  categories: FoodType[] = [];
  selectedCategory: FoodType = { _id: 'all', name: 'All' };
  isVegetarian: boolean = false;
  searchQuery: string = '';
  isLeftArrowHidden: boolean = true;
  isRightArrowHidden: boolean = false;
  currentParcelTable: Table | null = null;
  isLoading: boolean = false;
  initialized: boolean = false;

  currentOrder: Order = {
    customerName: '',
    phoneNumber: '',
    items: [],
    status: 'Pending',
    totalPrice: 0,
    createdAt: new Date()
  };

  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$ = this.tablesSubject.asObservable();

  private restaurantId: string | null = null;

  constructor(
    private http: HttpClient,
    private orderService: OrderService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Only set initial values, don't load data
    this.currentOrder.customerName = `${this.authService.getUsernameSync()}(DS)`;
    this.restaurantId = this.getSelectedRestaurantId();
  }

  ngAfterViewInit() {
    this.checkArrowVisibility();
  }

  initializeComponent() {
    if (!this.initialized) {
      console.log('Initializing ParcelOrder component');
      this.isLoading = true;
      this.loadCategories();
      this.initialized = true;
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkArrowVisibility();
  }

  loadCategories() {
    console.log('Loading categories...');
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to load categories.');
      this.showErrorSnackBar('Restaurant ID is missing. Please select a restaurant.');
      this.isLoading = false;
      return;
    }

    this.http.get<FoodType[]>(`${environment.apiUrl}/food-types?restaurantId=${restaurantId}`).subscribe({
      next: (types) => {
        console.log('Categories loaded:', types);
        this.categories = [
          { _id: 'all', name: 'All' },
          ...types,
          { _id: 'uncategorized', name: 'Uncategorized' }
        ];
        this.loadMenuItems();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.showErrorSnackBar('Error loading categories. Please try again.');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadMenuItems() {
    console.log('Loading menu items...');
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to load menu items.');
      this.showErrorSnackBar('Restaurant ID is missing. Please select a restaurant.');
      this.isLoading = false;
      return;
    }

    this.http.get<MenuItem[]>(`${environment.apiUrl}/food?restaurantId=${restaurantId}`).subscribe({
      next: (items) => {
        console.log('Menu items loaded:', items.length);
        this.menuItems = items.map(item => {
          if (!item.category || !this.categories.some(cat => cat._id === item.category._id)) {
            return { ...item, category: { _id: 'uncategorized', name: 'Uncategorized' } };
          }
          return item;
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        this.showErrorSnackBar('Error loading menu items. Please try again.');
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openAddTableDialog() {
    if (!this.restaurantId) {
      console.error('No restaurant ID found');
      return;
    }

    const dialogRef = this.dialog.open(AddTableDialogComponent, {
      width: '30%',
      height: 'auto',
      disableClose: true,
      data: { restaurantId: this.restaurantId }
    });

    dialogRef.componentInstance.tableAdded.subscribe((newTable: Table) => {
      const updatedTables = [...this.tablesSubject.value, newTable];
      this.tablesSubject.next(updatedTables);
      this.currentParcelTable = newTable;
      this.cdr.markForCheck();
    });
  }

  addItemToOrder(item: MenuItem) {
    const existingItemIndex = this.currentOrder.items.findIndex(orderItem => orderItem.name === item.name);
    
    if (existingItemIndex > -1) {
      this.currentOrder.items[existingItemIndex].quantity += 1;
    } else {
      const newItem: OrderItem = {
        name: item.name,
        quantity: 1,
        price: item.price,
        imageUrl: item.imageUrl,
        category: item.category._id
      };
      this.currentOrder.items.push(newItem);
    }
    
    this.calculateTotalPrice();
    this.cdr.markForCheck();
  }

  removeItemFromOrder(item: OrderItem) {
    const existingItemIndex = this.currentOrder.items.findIndex(orderItem => orderItem.name === item.name);
  
    if (existingItemIndex > -1) {
      if (this.currentOrder.items[existingItemIndex].quantity > 1) {
        this.currentOrder.items[existingItemIndex].quantity -= 1;
      } else {
        this.currentOrder.items.splice(existingItemIndex, 1);
      }
  
      this.calculateTotalPrice();
      this.cdr.markForCheck();
    }
  }

  calculateTotalPrice() {
    this.currentOrder.totalPrice = this.currentOrder.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  openConfirmationDialog() {
    if (!this.currentParcelTable) {
      this.showErrorSnackBar('Please create a parcel table first.');
      return;
    }

    this.confirmationDialogRef = this.dialog.open(InhouseConfirmationComponent, {
      width: '300px',
      data: {
        title: 'Confirm Take Away Order',
        message: `Are you sure you want to place this take away order for table ${this.currentParcelTable.number}?`,
        totalPrice: this.currentOrder.totalPrice,
        confirmAction: () => this.submitOrder()
      }
    });

    this.confirmationDialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Take away order confirmed');
      } else {
        console.log('Take away order cancelled');
      }
      this.confirmationDialogRef = null;
    });
  }

  submitOrder() {
    if (!this.currentParcelTable) {
      this.showErrorSnackBar('Take away table information is missing. Unable to submit order.');
      return;
    }

    if (!this.restaurantId) {
      this.showErrorSnackBar('Restaurant ID is missing. Unable to submit order.');
      return;
    }

    const orderData = {
      ...this.currentOrder,
      items: this.currentOrder.items.map(item => ({
        ...item,
        notes: item.notes || ''
      })),
      customerName: this.currentOrder.customerName || `${this.authService.getUsername()}(DS)`,
      restaurant: this.restaurantId,
      isParcel: true,
      tableNumber: this.currentParcelTable.number,
      tableOtp: this.currentParcelTable.otp
    };

    this.http.post<Order>(`${environment.apiUrl}/orders`, orderData).subscribe({
      next: (newOrder) => {
        this.showSuccessSnackBar('Take away order submitted successfully!');
        this.resetComponentState();
        if (this.confirmationDialogRef) {
          this.confirmationDialogRef.close();
        }
      },
      error: (error) => {
        console.error('Error submitting take away order:', error);
        this.showErrorSnackBar('Error submitting take away order. Please try again.');
      }
    });
  }

  resetComponentState() {
    this.currentOrder = {
      customerName: `${this.authService.getUsername()}(DS)`,
      phoneNumber: '',
      items: [],
      status: 'Pending',
      totalPrice: 0,
      createdAt: new Date()
    };
    this.currentParcelTable = null;
    this.cdr.markForCheck();
  }

  private showSuccessSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  toggleVegetarian() {
    this.isVegetarian = !this.isVegetarian;
    this.cdr.markForCheck();
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

  onSearch() {
    this.cdr.markForCheck();
  }

  getFilteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => 
      (this.selectedCategory.name === 'All' || item.category._id === this.selectedCategory._id) &&
      (!this.isVegetarian || item.isVegetarian === true) &&
      item.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  incrementCartItem(item: OrderItem) {
    item.quantity++;
    this.calculateTotalPrice();
    this.cdr.markForCheck();
  }

  decrementCartItem(item: OrderItem) {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.removeItemFromOrder(item);
    }
    this.calculateTotalPrice();
    this.cdr.markForCheck();
  }

  openItemNotesSheet(item: OrderItem) {
    const bottomSheetRef = this.bottomSheet.open(ItemNotesSheetComponent, {
      data: { itemName: item.name, existingNotes: item.notes }
    });
  
    bottomSheetRef.afterDismissed().subscribe((notes: string | undefined) => {
      if (notes !== undefined) {
        const index = this.currentOrder.items.findIndex(i => i.name === item.name);
        if (index !== -1) {
          this.currentOrder.items[index].notes = notes;
          this.cdr.markForCheck();
        }
      }
    });
  }

  canPlaceOrder(): boolean {
    return this.currentOrder.items.length > 0 && !!this.currentParcelTable;
  }

  placeOrder() {
    if (this.canPlaceOrder()) {
      this.openConfirmationDialog();
    } else {
      this.showErrorSnackBar('Please add items to the cart and create a parcel table before placing an order.');
    }
  }

  refreshMenuItems() {
    console.log('Refreshing menu items...');
    this.isLoading = true;
    this.loadMenuItems();
    this.cdr.markForCheck();
  }

  clearParcelTable() {
    console.log('Clearing parcel table...');
    this.currentParcelTable = null;
    this.cdr.markForCheck();
  }

  private handleError(error: any) {
    console.error('An error occurred:', error);
    this.showErrorSnackBar('An unexpected error occurred. Please try again.');
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  selectCategory(category: FoodType) {
    console.log('Selecting category:', category.name);
    this.selectedCategory = category;
    this.cdr.markForCheck();
  }

  scrollCategories(direction: 'left' | 'right') {
    const slider = this.categorySlider.nativeElement;
    const scrollAmount = slider.offsetWidth / 2;
    
    if (direction === 'left') {
      slider.scrollLeft -= scrollAmount;
    } else {
      slider.scrollLeft += scrollAmount;
    }
    
    // Check arrow visibility after scrolling
    setTimeout(() => {
      this.checkArrowVisibility();
    }, 100);
  }

  checkArrowVisibility() {
    const slider = this.categorySlider.nativeElement;
    this.isLeftArrowHidden = slider.scrollLeft <= 0;
    this.isRightArrowHidden = slider.scrollLeft + slider.offsetWidth >= slider.scrollWidth;
    this.cdr.detectChanges();
  }
}