import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { Table } from '../../interfaces/shared-interfaces';
import { environment } from '../../../environments/environment';
import { OrderService } from '../../services/order.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartFilterPipe } from '../../pipe/cart-filter.pipe';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { InhouseConfirmationComponent } from '../inhouse-confirmation/inhouse-confirmation.component';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { ItemNotesSheetComponent } from '../item-notes-sheet/item-notes-sheet.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, Subscription } from 'rxjs';
import { WebSocketService } from '../../services/web-socket.service';
import { MenuUpdateService } from '../../services/menu-update.service';

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
}

interface FoodType {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface MenuItem {
  _id?: string;
  name: string;
  category: FoodType;
  price: number;
  description?: string;
  imageUrl?: string;
  isVegetarian?: boolean;
  isInStock?: boolean;
}

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSlideToggleModule,
    MatTabsModule,
    CartFilterPipe,
    InhouseConfirmationComponent,
    MatBottomSheetModule,
    ItemNotesSheetComponent,
    MatProgressSpinnerModule
  ],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() table!: Table;
  @Output() backToTableSelection = new EventEmitter<void>();
  @Output() viewOrders = new EventEmitter<string>();
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  @ViewChild('tabGroup', { read: ElementRef }) tabGroupElement!: ElementRef;
  private dialogRef: MatDialogRef<InhouseConfirmationComponent> | null = null;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  selectedTabIndex: number = 0;
  orders: Order[] = [];
  categories: FoodType[] = [];
  selectedCategory: string = 'All';
  isVegetarian: boolean = false;
  searchQuery: string = '';
  currentOrder: Order = {
    customerName: '',
    phoneNumber: '',
    items: [],
    status: 'Pending',
    totalPrice: 0,
    createdAt: new Date()
  };
  displayedColumns: string[] = ['name', 'quantity', 'price', 'actions'];
  showCart: boolean = false;
  restaurantId: string | null = this.getSelectedRestaurantId();
  menuLoaded: boolean = false;

  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  menuItems$ = this.menuItemsSubject.asObservable();
  private menuUpdateSubscription!: Subscription;

  constructor(
    private http: HttpClient,
    private orderService: OrderService,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private webSocketService: WebSocketService,
    private menuUpdateService: MenuUpdateService
  ) {}

  ngOnInit() {
    this.updateSelectedTabIndex();
    this.loadCategories();
    if (this.table && this.table.otp) {
      this.loadExistingOrders();
    }
    this.currentOrder.customerName = `${this.authService.getUsernameSync()}(DS)`;
    this.subscribeToMenuUpdates();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['table'] && !changes['table'].firstChange) {
      this.loadExistingOrders();
    }
  }

  ngAfterViewInit() {
    this.enableSwipeGesture();
  }

  ngOnDestroy() {
    if (this.menuUpdateSubscription) {
      this.menuUpdateSubscription.unsubscribe();
    }
  }

  loadCategories() {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to load categories.');
      this.showErrorSnackBar('Restaurant ID is missing. Please select a restaurant.');
      return;
    }
  
    this.http.get<FoodType[]>(`${environment.apiUrl}/food-types?restaurantId=${restaurantId}`).subscribe({
      next: (types) => {
        this.categories = [
          { _id: 'all', name: 'All', createdAt: '', updatedAt: '', __v: 0 }, 
          ...types,
          { _id: 'uncategorized', name: 'Uncategorized', createdAt: '', updatedAt: '', __v: 0 }
        ];
        this.loadMenuItems();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.showErrorSnackBar('Error loading categories. Please try again.');
      }
    });
  }

  loadMenuItems() {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to load menu items.');
      this.showErrorSnackBar('Restaurant ID is missing. Please select a restaurant.');
      return;
    }
  
    this.http.get<MenuItem[]>(`${environment.apiUrl}/food?restaurantId=${restaurantId}`).subscribe({
      next: (items) => {
        const menuItems = items.map(item => {
          if (!item.category || !this.categories.some(cat => cat._id === item.category._id)) {
            return { ...item, category: { _id: 'uncategorized', name: 'Uncategorized', createdAt: '', updatedAt: '', __v: 0 } };
          }
          return item;
        });
        this.menuItemsSubject.next(menuItems);
        this.menuLoaded = true;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        this.showErrorSnackBar('Error loading menu items. Please try again.');
      }
    });
  }
  
  loadExistingOrders() {
    if (!this.table.otp) {
      console.error('Table OTP is missing, cannot load orders');
      return;
    }
    
    this.orderService.getOrdersByTableOtp(this.table.otp).subscribe({
      next: (orders) => {
        this.orders = orders;
      },
      error: (error) => {
        console.error('Error loading existing orders:', error);
      }
    });
  }

  addItemToOrder(item: MenuItem) {
    const existingItemIndex = this.currentOrder.items.findIndex(orderItem => orderItem.name === item.name);
    
    if (existingItemIndex > -1) {
      this.currentOrder.items[existingItemIndex].quantity += 1;
      // this.openItemNotesSheet(this.currentOrder.items[existingItemIndex]);
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
  }

  removeItemFromOrder(item: MenuItem) {
    const existingItemIndex = this.currentOrder.items.findIndex(orderItem => orderItem.name === item.name);
  
    if (existingItemIndex > -1) {
      if (this.currentOrder.items[existingItemIndex].quantity > 1) {
        this.currentOrder.items[existingItemIndex].quantity -= 1;
      } else {
        this.currentOrder.items.splice(existingItemIndex, 1);
      }
  
      this.calculateTotalPrice();
    }
  }

  calculateTotalPrice() {
    this.currentOrder.totalPrice = this.currentOrder.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  openConfirmationDialog() {
    this.dialogRef = this.dialog.open(InhouseConfirmationComponent, {
      width: '300px',
      data: {
        title: 'Confirm Order',
        message: 'Are you sure you want to place this order?',
        totalPrice: this.currentOrder.totalPrice,
        confirmAction: () => this.submitOrder()
      }
    });

    this.dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Order confirmed');
      } else {
        console.log('Order cancelled');
      }
      this.dialogRef = null;
    });
  }

  submitOrder() {
    if (!this.table.otp) {
      console.error('Table OTP is missing');
      this.showErrorSnackBar('Table OTP is missing. Unable to submit order.');
      if (this.dialogRef) {
        this.dialogRef.close();
      }
      return;
    }
  
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing');
      this.showErrorSnackBar('Restaurant ID is missing. Unable to submit order.');
      if (this.dialogRef) {
        this.dialogRef.close();
      }
      return;
    }
  
    const orderData = {
      ...this.currentOrder,
      items: this.currentOrder.items.map(item => ({
        ...item,
        notes: item.notes || ''
      })),
      tableOtp: this.table.otp,
      customerName: this.currentOrder.customerName || `${this.authService.getUsername()}(DS)`,
      restaurant: restaurantId
    };
  
    this.http.post<Order>(`${environment.apiUrl}/orders`, orderData).subscribe({
      next: (newOrder) => {
        this.orders.push(newOrder);
        this.resetCurrentOrder();
        this.refreshTableData();
        this.showCart = false;
  
        this.showSuccessSnackBar('Order submitted successfully!');
        if (this.dialogRef) {
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        console.error('Error submitting order:', error);
        this.showErrorSnackBar('Error submitting order. Please try again.');
        if (this.dialogRef) {
          this.dialogRef.close(false);
        }
      }
    });
  }

  resetCurrentOrder() {
    this.currentOrder = {
      customerName: `${this.authService.getUsername()}(DS)`,
      phoneNumber: '',
      items: [],
      status: 'Pending',
      totalPrice: 0,
      createdAt: new Date()
    };
  }

  private showSuccessSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }

  private showErrorSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  refreshTableData() {
    if (!this.table._id) return;

    this.http.get<Table>(`${environment.apiUrl}/tables/${this.table._id}`).subscribe({
      next: (updatedTable) => {
        this.table = updatedTable;
      },
      error: (error) => {
        console.error('Error refreshing table data:', error);
      }
    });
  }

  goBackToTableSelection() {
    this.backToTableSelection.emit();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  selectCategory(category: FoodType) {
    this.selectedCategory = category.name;
    this.updateSelectedTabIndex();
  }

  updateSelectedTabIndex() {
    const index = this.categories.findIndex(cat => cat.name === this.selectedCategory);
    this.selectedTabIndex = index !== -1 ? index : 0;
  }

  toggleVegetarian() {
    this.isVegetarian = !this.isVegetarian;
  }

  isCategorySelected(category: FoodType): boolean {
    return this.selectedCategory === category.name;
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

  onTabChange(index: number) {
    const category = this.categories[index];
    this.selectCategory(category);
  }

  onSwipe(event: TouchEvent, direction: string) {
    const currentIndex = this.tabGroup?.selectedIndex;
  
    if (currentIndex !== null && currentIndex !== undefined) {
      if (direction === 'left' && currentIndex < this.categories.length - 1) {
        this.tabGroup.selectedIndex = currentIndex + 1;
      } else if (direction === 'right' && currentIndex > 0) {
        this.tabGroup.selectedIndex = currentIndex - 1;
      }
    }
  }

  private enableSwipeGesture() {
    let touchStartX: number;
    const element = this.tabGroupElement.nativeElement;
  
    element.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    });
  
    element.addEventListener('touchend', (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
  
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          this.onSwipe(e, 'left');
        } else {
          this.onSwipe(e, 'right');
        }
      }
    });
  }

  onSearch() {
    // Implement search functionality if needed
    // This method is currently empty as per the original code
  }

  getFilteredMenuItems(): MenuItem[] {
    return this.menuItemsSubject.getValue().filter(item => 
      (this.selectedCategory === 'All' || 
       this.selectedCategory === item.category.name || 
       (this.selectedCategory === 'Uncategorized' && item.category.name === 'Uncategorized')) &&
      (!this.isVegetarian || item.isVegetarian === true) &&
      item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
      item.isInStock === true
    );
  }

  getOrderItemQuantity(item: MenuItem): number {
    const orderItem = this.currentOrder.items.find(i => i.name === item.name);
    return orderItem ? orderItem.quantity : 0;
  }

  getOrderItemCount(): number {
    return this.currentOrder.items.reduce((total, item) => total + item.quantity, 0);
  }

  navigateToCart() {
    this.showCart = true;
  }

  goBackToMenu() {
    this.showCart = false;
  }

  incrementCartItem(item: OrderItem) {
    item.quantity++;
    this.calculateTotalPrice();
  }

  decrementCartItem(item: OrderItem) {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      const index = this.currentOrder.items.indexOf(item);
      if (index > -1) {
        this.currentOrder.items.splice(index, 1);
      }
    }
    this.calculateTotalPrice();
  }

  lookOrders() {
    if (this.table && this.table.otp) {
      this.viewOrders.emit(this.table.otp);
    } else {
      console.error('Table OTP is missing');
      this.showErrorSnackBar('Unable to view orders. Table information is missing.');
    }
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
        }
      }
    });
  }

  private subscribeToMenuUpdates() {
    this.menuUpdateSubscription = this.webSocketService.listen('menuUpdate').subscribe(
      (updatedItem: MenuItem) => {
        this.updateMenuItem(updatedItem);
      }
    );

    this.menuUpdateService.menuUpdate$.subscribe(updatedItem => {
      this.updateMenuItem(updatedItem);
    });
  }

  private updateMenuItem(updatedItem: MenuItem) {
    const currentItems = this.menuItemsSubject.getValue();
    const index = currentItems.findIndex(item => item._id === updatedItem._id);
    if (index !== -1) {
      currentItems[index] = {
        ...currentItems[index],
        ...updatedItem,
        category: currentItems[index].category, // Preserve the existing category
        isVegetarian: updatedItem.isVegetarian ?? currentItems[index].isVegetarian, // Handle potential undefined
        isInStock: updatedItem.isInStock ?? currentItems[index].isInStock // Handle potential undefined
      };
      this.menuItemsSubject.next([...currentItems]);
    }
  }
}