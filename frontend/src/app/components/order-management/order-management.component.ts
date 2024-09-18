import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MenuService, MenuItem } from '../../services/menu.service';
import { OrderService, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../services/cart.service';

interface Table {
  _id: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
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
    MatTableModule
  ],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit {
  table: Table | null = null;
  menuItems: MenuItem[] = [];
  currentOrder: {
    items: CartItem[];
    totalPrice: number;
    customerName: string;
    phoneNumber: string;
  } = {
    items: [],
    totalPrice: 0,
    customerName: '',
    phoneNumber: ''
  };
  selectedItem: MenuItem | null = null;
  selectedQuantity: number = 1;
  displayedColumns: string[] = ['name', 'quantity', 'price', 'actions'];
  orders: Order[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private menuService: MenuService,
    private orderService: OrderService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const tableId = params['tableId'];
      this.loadTable(tableId);
    });
    this.loadMenuItems();
  }

  loadTable(tableId: string) {
    this.http.get<Table>(`${environment.apiUrl}/tables/${tableId}`).subscribe({
      next: (table) => {
        this.table = table;
        this.loadOrdersForTable();
        this.loadOrderFromStorage();
      },
      error: (error) => {
        console.error('Error loading table:', error);
        this.snackBar.open('Error loading table details', 'Close', { duration: 3000 });
        this.router.navigate(['/dining-specialist']);
      }
    });
  }

  loadMenuItems() {
    this.menuService.getMenuItems().subscribe({
      next: (items) => {
        this.menuItems = items;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
        this.snackBar.open('Error loading menu items', 'Close', { duration: 3000 });
      }
    });
  }

  loadOrdersForTable() {
    if (!this.table) return;
    
    this.orderService.getOrdersByTableOtp(this.table.otp).subscribe({
      next: (orders: Order[]) => {
        this.orders = orders;
      },
      error: (error: any) => {
        console.error(`Error loading orders for table ${this.table?.otp}:`, error);
        this.snackBar.open('Error loading orders', 'Close', { duration: 3000 });
      }
    });
  }

  addItemToOrder() {
    if (this.selectedItem && this.selectedQuantity > 0) {
      const existingItemIndex = this.currentOrder.items.findIndex(item => item._id === this.selectedItem!._id);
      if (existingItemIndex !== -1) {
        this.currentOrder.items[existingItemIndex].quantity += this.selectedQuantity;
      } else {
        this.currentOrder.items.push({ ...this.selectedItem, quantity: this.selectedQuantity });
      }
      this.selectedItem = null;
      this.selectedQuantity = 1;
      this.updateOrder();
      this.changeDetectorRef.detectChanges(); // Force change detection
    } else {
      this.snackBar.open('Please select an item and specify a quantity', 'Close', { duration: 3000 });
    }
  }
  removeItemFromOrder(index: number) {
    this.currentOrder.items.splice(index, 1);
    this.updateOrder();
    this.changeDetectorRef.detectChanges(); // Force change detection
  }

  updateOrder() {
    this.currentOrder.totalPrice = this.calculateTotalPrice();
    this.saveOrderToStorage();
    this.changeDetectorRef.detectChanges(); // Force change detection
  }

  calculateTotalPrice(): number {
    return this.currentOrder.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  submitOrder() {
    if (this.currentOrder.items.length === 0) {
      this.snackBar.open('Please add items to the order', 'Close', { duration: 3000 });
      return;
    }

    if (!this.table) {
      this.snackBar.open('Table information is missing', 'Close', { duration: 3000 });
      return;
    }

    this.orderService.submitOrder(
      this.currentOrder.items,
      this.currentOrder.totalPrice,
      {
        name: this.currentOrder.customerName,
        phoneNumber: this.currentOrder.phoneNumber,
        tableOtp: this.table.otp
      }
    ).subscribe({
      next: (response) => {
        console.log('Order submitted successfully', response);
        this.snackBar.open('Order submitted successfully!', 'Close', { duration: 3000 });
        this.clearOrder();
        this.loadOrdersForTable();
      },
      error: (error) => {
        console.error('Error submitting order', error);
        this.snackBar.open('Error submitting order. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  clearOrder() {
    this.currentOrder = {
      items: [],
      totalPrice: 0,
      customerName: '',
      phoneNumber: ''
    };
    this.saveOrderToStorage();
  }

  saveOrderToStorage() {
    if (this.table) {
      localStorage.setItem(`currentOrder_${this.table._id}`, JSON.stringify(this.currentOrder));
    }
  }

  loadOrderFromStorage() {
    if (this.table) {
      const savedOrder = localStorage.getItem(`currentOrder_${this.table._id}`);
      if (savedOrder) {
        this.currentOrder = JSON.parse(savedOrder);
      } else {
        this.clearOrder();
      }
    }
  }

  goBack() {
    this.router.navigate(['/dining-specialist']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}