import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { OrderService, Order } from '../../services/order.service';
import { CustomerService } from '../../services/customer-service.service';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [ CommonModule,
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
    MatTabsModule],
  templateUrl: './order-details.component.html',
  styleUrls: ['./order-details.component.scss']
})
export class OrderDetailsComponent implements OnInit {
  orders: Order[] = [];

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const customerInfo = this.customerService.getCustomerInfo();
    if (customerInfo && customerInfo.tableOtp) {
      this.orderService.getOrdersByTableOtp(customerInfo.tableOtp).subscribe(
        (orders) => {
          this.orders = orders;
        },
        (error) => {
          console.error('Error fetching orders:', error);
        }
      );
    } else {
      console.error('No table OTP found for the customer');
    }
  }
  lookDashboard(){
    this.router.navigate(['/customer-dashboard']);
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/customer-login']);
  }
  // Calculate Subtotal
  subTotal() {
    let total = 0;
    this.orders.forEach(order => {
      order.items.forEach(item => {
        total += item.price * item.quantity;
      });
    });
    return total;
  }

  // Calculate Service Charge (5% of Subtotal)
  serviceCharge() {
    return this.subTotal() * 0.05;
  }

  // Calculate GST (5% on Food)
  gst() {
    return this.subTotal() * 0.05;
  }

  // Calculate Total
  total() {
    return this.subTotal() + this.serviceCharge() + this.gst();
  }

  goBack() {
    this.router.navigate(['/customer-dashboard']);
  }
  selectMethod() {
    this.router.navigate(['/payment-type', { orders: JSON.stringify(this.orders) }]);
  }
}