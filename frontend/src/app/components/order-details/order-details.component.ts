import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { OrderService, Order } from '../../services/order.service';
import { CustomerService } from '../../services/customer-service.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-details',
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
    MatSlideToggleModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit {
  orders: Order[] = [];
  orderLoaded: boolean = false;

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar // Added MatSnackBar for error handling
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  private loadOrders() {
    const customerInfo = this.customerService.getCustomerInfo();
    if (customerInfo?.tableOtp) {
      this.orderService.getOrdersByTableOtp(customerInfo.tableOtp).subscribe({
        next: (orders) => {
          this.orders = orders;
          this.orderLoaded = true;
        },
        error: (error) => {
          console.error('Error fetching orders:', error);
          this.orderLoaded = true; // Set to true even on error
          this.showErrorSnackBar('Failed to load orders. Please try again.');
        }
      });
    } else {
      console.error('No table OTP found for the customer');
      this.orderLoaded = true;
      this.showErrorSnackBar('No table information found. Please contact staff.');
    }
  }

  lookDashboard() {
    this.router.navigate(['/customer-dashboard']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/customer-login']);
  }

  // Calculate Subtotal
  subTotal(): number {
    return this.orders.reduce((total, order) => 
      total + order.items.reduce((orderTotal, item) => 
        orderTotal + item.price * item.quantity, 0), 0);
  }

  // Calculate Service Charge (5% of Subtotal)
  serviceCharge(): number {
    return this.subTotal() * 0.05;
  }

  // Calculate GST (5% on Food)
  gst(): number {
    return this.subTotal() * 0.05;
  }

  // Calculate Total
  total(): number {
    return this.subTotal() + this.serviceCharge() + this.gst();
  }

  goBack() {
    this.router.navigate(['/customer-dashboard']);
  }

  selectMethod() {
    this.router.navigate(['/payment-type', { orders: JSON.stringify(this.orders) }]);
  }

  private showErrorSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top'
    });
  }
}