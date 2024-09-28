import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { CartItem } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Router } from '@angular/router';
import { CustomerService } from '../../services/customer-service.service';
import { AuthService } from '../../services/auth.service';

export interface CustomerInfo {
  name: string;
  phoneNumber: string;
  tableOtp: string;
  tableNumber?: string;
  otpTimestamp?: number;
}

export interface DialogData {
  title?: string;
  message?: string;
  totalPrice: number;
  confirmAction?: () => void;
  cancelAction?: () => void;
  cartItems?: CartItem[];
  customerInfo?: CustomerInfo;
}

@Component({
  selector: 'app-inhouse-confirmation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 class="text-center" mat-dialog-title>{{ data.title || 'Confirm Order' }}</h2>
    <mat-dialog-content class="text-center">
      {{ data.message || 'Are you sure you want to place this order?' }}
      <p>Total: {{ data.totalPrice | currency: 'INR' }}</p>
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
export class InhouseConfirmationComponent {
  isSubmitting = false;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    public dialogRef: MatDialogRef<InhouseConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private orderService: OrderService,
    private customerService: CustomerService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService
  ) {}

  onCancel(): void {
    if (this.data.cancelAction) {
      this.data.cancelAction();
    }
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.isSubmitting = true;
    if (this.data.confirmAction) {
      // New flexible approach
      this.data.confirmAction();
    } else if (this.data.cartItems && this.data.customerInfo) {
      // Existing approach for customer orders
      this.submitCustomerOrder();
    } else {
      console.error('Invalid dialog configuration');
      this.showErrorSnackBar('An error occurred. Please try again.');
      this.isSubmitting = false;
    }
  }

  private submitCustomerOrder(): void {
    this.customerService.validateOtpWithServer().subscribe({
      next: (isValid) => {
        if (isValid) {
          this.processOrder();
        } else {
          this.handleInvalidOtp();
        }
      },
      error: (error) => {
        console.error('Error validating OTP:', error);
        this.showErrorSnackBar('Error validating Table OTP. Please try again or contact a waiter.');
        this.isSubmitting = false;
      }
    });
  }

  private processOrder(): void {
    if (!this.data.cartItems || !this.data.customerInfo) {
      this.showErrorSnackBar('Order information is missing. Please try again.');
      this.isSubmitting = false;
      return;
    }

    this.orderService.submitOrder(this.data.cartItems, this.data.totalPrice, this.data.customerInfo).subscribe({
      next: (response) => {
        console.log('Order submitted successfully', response);
        this.showSuccessSnackBar('Order submitted successfully!');
        this.dialogRef.close(true);
        this.router.navigate(['/customer-dashboard']);
      },
      error: (error) => {
        console.error('Error submitting order', error);
        let errorMessage = 'Error submitting order. Please try again or contact a waiter.';
        if (error.message.includes('Table not found') || error.message.includes('Failed to update table status')) {
          errorMessage += ' Your order may have been placed, but there was an issue updating the table status.';
        }
        this.showErrorSnackBar(errorMessage);
        this.isSubmitting = false;
      }
    });
  }

  private handleInvalidOtp(): void {
    this.showErrorSnackBar('Table OTP is not valid. Please request a new OTP from a waiter.');
    this.customerService.clearCustomerInfo();
    this.dialogRef.close(false);
    this.router.navigate(['/customer-login']);
    this.authService.logout();
  }

  showSuccessSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }

  showErrorSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }
}