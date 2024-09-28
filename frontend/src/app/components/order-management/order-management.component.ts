import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
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

interface MenuItem {
  _id?: string;
  name: string;
  category: FoodType;
  price: number;
  description?: string;
  imageUrl?: string;
  isVegetarian: boolean;
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
    InhouseConfirmationComponent
  ],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() table!: Table;
  @Output() backToTableSelection = new EventEmitter<void>();
  @Output() viewOrders = new EventEmitter<string>();
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  @ViewChild('tabGroup', { read: ElementRef }) tabGroupElement!: ElementRef;
  private dialogRef: MatDialogRef<InhouseConfirmationComponent> | null = null;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  menuItems: MenuItem[] = [];
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

  constructor(
    private http: HttpClient,
    private orderService: OrderService,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadCategories();
    if (this.table && this.table.otp) {
      this.loadExistingOrders();
    }
    this.currentOrder.customerName = `${this.authService.getUsername()}(DS)`;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['table'] && !changes['table'].firstChange) {
      this.loadExistingOrders();
    }
  }

  ngAfterViewInit() {
    this.enableSwipeGesture();
  }

  loadCategories() {
    this.http.get<FoodType[]>(`${environment.apiUrl}/food-types`).subscribe({
      next: (types) => {
        this.categories = [{ _id: 'all', name: 'All', createdAt: '', updatedAt: '', __v: 0 }, ...types];
        this.loadMenuItems();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadMenuItems() {
    this.http.get<MenuItem[]>(`${environment.apiUrl}/food`).subscribe({
      next: (items) => {
        this.menuItems = items;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
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
    } else {
      this.currentOrder.items.push({
        name: item.name,
        quantity: 1,
        price: item.price,
        imageUrl: item.imageUrl
      });
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
  
    const orderData = {
      ...this.currentOrder,
      tableOtp: this.table.otp,
      customerName: this.currentOrder.customerName || `${this.authService.getUsername()}(DS)`
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
  }

  toggleVegetarian() {
    this.isVegetarian = !this.isVegetarian;
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg';
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  onTabChange(index: number) {
    this.selectCategory(this.categories[index]);
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
    // Implement search functionality
  }

  getFilteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => 
      (this.selectedCategory === 'All' || item.category.name === this.selectedCategory) &&
      (!this.isVegetarian || item.isVegetarian === true) &&
      item.name.toLowerCase().includes(this.searchQuery.toLowerCase())
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
}