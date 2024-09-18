import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { CartItem, CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Router } from '@angular/router';
import { CustomerService } from '../../services/customer-service.service';
import { AuthService } from '../../services/auth.service';
export interface CustomerInfo {
  name: string;
  phoneNumber: string;
  tableOtp: string;
  tableNumber?: number;
  otpTimestamp?: number;
}
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 class="text-center" mat-dialog-title>Confirm Order</h2>
    <mat-dialog-content class="text-center">
      Are you sure you want to place this order?
      <p>Total: {{ data.totalPrice | currency }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="center" class="pb-4">
      <div class="d-flex">
        <button class="text-center" mat-button (click)="onCancel()">CANCEL</button>
        <button class="text-center" color="primary" mat-button (click)="onConfirm()" [disabled]="isSubmitting">
          {{ isSubmitting ? 'SUBMITTING...' : 'CONFIRM' }}
        </button>
      </div>
    </mat-dialog-actions>
  `,
})
export class ConfirmationDialogComponent {
  isSubmitting = false;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cartItems: CartItem[], totalPrice: number },
    private orderService: OrderService,
    private customerService: CustomerService,
    private cartService: CartService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService,
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.isSubmitting = true;
    const customerInfo = this.customerService.getCustomerInfo();
    
    if (!customerInfo) {
      this.showErrorSnackBar('Customer information not found. Please log in again.');
      this.dialogRef.close(false);
      this.router.navigate(['/customer-login']);
      return;
    }
    
    this.customerService.validateOtpWithServer().subscribe({
      next: (isValid) => {
        if (isValid) {
          this.submitOrder(customerInfo);
        } else {
          this.showErrorSnackBar('Table OTP is not valid. Please request a new OTP from a waiter.');
          this.customerService.clearCustomerInfo();
          this.dialogRef.close(false);
          this.router.navigate(['/customer-login']);
          this.authService.logout();
        }
      },
      error: (error) => {
        console.error('Error validating OTP:', error);
        this.showErrorSnackBar('Error validating Table OTP. Please try again or contact a waiter.');
        this.isSubmitting = false;
      }
    });
  }

  private submitOrder(customerInfo: CustomerInfo): void {
    this.orderService.submitOrder(this.data.cartItems, this.data.totalPrice, customerInfo).subscribe({
      next: (response) => {
        console.log('Order submitted successfully', response);
        this.showSuccessSnackBar('Order submitted successfully!');
        this.cartService.resetCart();
        this.dialogRef.close(true);
        this.router.navigate(['/customer-dashboard']);
      },
      error: (error) => {
        console.error('Error submitting order', error);
        this.showErrorSnackBar('Error submitting order. Please try again or contact a waiter.');
        this.isSubmitting = false;
      }
    });
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
}