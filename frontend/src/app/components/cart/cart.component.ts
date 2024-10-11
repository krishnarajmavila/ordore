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
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ItemNotesSheetComponent } from '../item-notes-sheet/item-notes-sheet.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  chefNotes: string = '';

  constructor(private router: Router, private cartService: CartService, 
    private authService: AuthService, 
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet) {}

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
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }
    return `${environment.cloudinaryUrl}/image/upload/${imageUrl}`;
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  goBack() {
    this.router.navigate(['/customer-dashboard']);
  }
  lookOrders(){
    this.router.navigate(['/order-details']);
  }
  increaseQuantity(cartItem: CartItem) {
    this.cartService.addToCart(cartItem);
  }

  decreaseQuantity(cartItem: CartItem) {
    this.cartService.removeFromCart(cartItem._id);
  }

  placeOrder() {
    console.log('Placing order:', this.cartItems);
    console.log('Chef notes:', this.chefNotes);
  }
  openConfirmationDialog() {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: { 
        cartItems: this.cartItems,
        totalPrice: this.getTotalPrice(),
        chefNotes: this.chefNotes
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.placeOrder();
      }
    });
  }
  openItemNotesSheet(item: CartItem) {
    const bottomSheetRef = this.bottomSheet.open(ItemNotesSheetComponent, {
      data: { itemName: item.name, existingNotes: item.notes }
    });

    bottomSheetRef.afterDismissed().subscribe((notes: string | undefined) => {
      if (notes !== undefined) {
        this.cartService.updateItemNotes(item._id, notes);
      }
    });
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}