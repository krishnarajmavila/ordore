import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Table, MenuItem } from '../../interfaces/shared-interfaces';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';
import { Subscription, throwError } from 'rxjs';
import { OrderService } from '../../services/order.service';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
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

@Component({
  selector: 'app-order-management',
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
    MatTableModule
  ],
  templateUrl: './order-management.component.html',
  styleUrls: ['./order-management.component.scss']
})
export class OrderManagementComponent implements OnInit, OnChanges {
  @Input() table!: Table;
  @Output() backToTableSelection = new EventEmitter<void>();
  menuItems: MenuItem[] = [];
  orders: Order[] = [];
  currentOrder: Order = {
    customerName: '',
    phoneNumber: '',
    items: [],
    status: 'Pending',
    totalPrice: 0,
    createdAt: new Date()
  };
  selectedItem: MenuItem | null = null;
  selectedQuantity: number = 1;
  displayedColumns: string[] = ['name', 'quantity', 'price', 'actions'];
  isLoading: boolean = false;
  loadError: string | null = null;
  private ordersSubscription: Subscription | null = null;

  constructor(private http: HttpClient, private orderService: OrderService) {}

  ngOnInit() {
    console.log('Component initialized with table:', this.table);
    this.loadMenuItems();
    if (this.table && this.table.otp) {
      this.loadExistingOrders();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['table'] && !changes['table'].firstChange) {
      console.log('Table changed:', this.table);
      this.loadExistingOrders();
    }
  }

  loadMenuItems() {
    this.http.get<MenuItem[]>(`${environment.apiUrl}/food`)
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (items) => {
          this.menuItems = items;
          console.log('Menu items loaded:', this.menuItems);
        },
        error: (error) => {
          console.error('Error loading menu items:', error);
        }
      });
  }

  loadExistingOrders() {
    if (!this.table.otp) {
      this.loadError = 'Table OTP is missing, cannot load orders';
      console.error(this.loadError);
      return;
    }
    
    this.isLoading = true;
    this.loadError = null;
    
    console.log('Loading orders for table OTP:', this.table.otp);
    this.ordersSubscription = this.orderService.getOrdersByTableOtp(this.table.otp).subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoading = false;
        console.log('Existing orders loaded:', this.orders);
      },
      error: (error) => {
        this.loadError = 'Error loading existing orders. Please try again.';
        this.isLoading = false;
        console.error('Error loading existing orders:', error);
      }
    });
  }
  addItemToOrder() {
    if (this.selectedItem && this.selectedQuantity > 0) {
      const existingItemIndex = this.currentOrder.items.findIndex(item => item.name === this.selectedItem!.name);
      
      if (existingItemIndex > -1) {
        this.currentOrder.items[existingItemIndex].quantity += this.selectedQuantity;
      } else {
        this.currentOrder.items.push({
          name: this.selectedItem.name,
          quantity: this.selectedQuantity,
          price: this.selectedItem.price
        });
      }
      
      this.selectedItem = null;
      this.selectedQuantity = 1;
      console.log('Current order updated:', this.currentOrder);
    }
  }

  removeItemFromOrder(index: number) {
    this.currentOrder.items.splice(index, 1);
    console.log('Item removed from order, current order:', this.currentOrder);
  }

  calculateTotalPrice(): number {
    return this.currentOrder.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  submitOrder() {
    if (!this.table.otp) {
      console.error('Table OTP is missing');
      return;
    }

    const orderData = {
      ...this.currentOrder,
      tableOtp: this.table.otp,
      totalPrice: this.calculateTotalPrice()
    };

    console.log('Submitting order:', orderData);

    this.http.post<Order>(`${environment.apiUrl}/orders`, orderData)
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (newOrder) => {
          this.orders.push(newOrder);
          this.currentOrder = {
            customerName: '',
            phoneNumber: '',
            items: [],
            status: 'Pending',
            totalPrice: 0,
            createdAt: new Date()
          };
          console.log('Order submitted successfully, new order:', newOrder);
          console.log('Updated orders list:', this.orders);
          this.refreshTableData();
        },
        error: (error) => {
          console.error('Error submitting order:', error);
        }
      });
  }

  refreshTableData() {
    if (!this.table._id) return;

    this.http.get<Table>(`${environment.apiUrl}/tables/${this.table._id}`)
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (updatedTable) => {
          this.table = updatedTable;
          console.log('Table data refreshed:', this.table);
        },
        error: (error) => {
          console.error('Error refreshing table data:', error);
        }
      });
  }
  goBackToTableSelection() {
    this.backToTableSelection.emit();
  }
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}