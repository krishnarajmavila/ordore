// cart.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { CartService, CartItem } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];

  constructor(private router: Router, private cartService: CartService, private authService: AuthService, private dialog: MatDialog) {}

  ngOnInit() {
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      console.log('Received cart items:', this.cartItems);
    });
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg';
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  goBack() {
    this.router.navigate(['/customer-dashboard']);
  }

  increaseQuantity(cartItem: CartItem) {
    this.cartService.addToCart(cartItem);
  }

  decreaseQuantity(cartItem: CartItem) {
    this.cartService.removeFromCart(cartItem._id);
  }

  placeOrder() {
    console.log('Placing order:', this.cartItems);
    // Implement order placement logic here
  }
  openConfirmationDialog() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: { 
        cartItems: this.cartItems,
        totalPrice: this.getTotalPrice() 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.placeOrder();
      }
    });
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}