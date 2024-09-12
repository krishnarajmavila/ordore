import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartItem } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

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

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cartItems: CartItem[], totalPrice: number },
    private orderService: OrderService,
    private snackBar: MatSnackBar
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.isSubmitting = true;
    this.orderService.submitOrder(this.data.cartItems, this.data.totalPrice).subscribe(
      response => {
        console.log('Order submitted successfully', response);
        this.snackBar.open('Order submitted successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error => {
        console.error('Error submitting order', error);
        this.snackBar.open('Error submitting order. Please try again.', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    );
  }
}