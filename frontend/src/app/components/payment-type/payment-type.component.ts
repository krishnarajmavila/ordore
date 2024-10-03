import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { Order } from '../../services/order.service';
import { WebSocketService } from '../../services/web-socket.service';

@Component({
  selector: 'app-payment-type',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './payment-type.component.html',
  styleUrls: ['./payment-type.component.scss']
})
export class PaymentTypeComponent {
  orders: Order[] = [];
  selectedPaymentType: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const ordersParam = params.get('orders');
      if (ordersParam) {
        this.orders = JSON.parse(ordersParam);
      }
    });
  }

  selectPaymentType(type: string) {
    this.selectedPaymentType = type;
  }

  isSelected(type: string): boolean {
    return this.selectedPaymentType === type;
  }

  initiatePayment() {
    if (this.selectedPaymentType && this.orders.length > 0) {
      console.log('PaymentTypeComponent: Initiating payment', {
        paymentType: this.selectedPaymentType,
        orders: this.orders
      });

      this.webSocketService.emit('payOrder', {
        orders: this.orders,
        paymentType: this.selectedPaymentType,
        tableOtp: this.orders[0].tableOtp
      });

      console.log('PaymentTypeComponent: payOrder event emitted');

      this.router.navigate(['/customer-dashboard']);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['login']);
  }

  goBack() {
    this.router.navigate(['/customer-dashboard']);
  }
}