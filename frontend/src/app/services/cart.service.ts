import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface CartItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  quantity: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject: BehaviorSubject<CartItem[]>;
  cartItems$: Observable<CartItem[]>;

  constructor() {
    const savedCart = this.getCartFromLocalStorage();
    this.cartItemsSubject = new BehaviorSubject<CartItem[]>(savedCart);
    this.cartItems$ = this.cartItemsSubject.asObservable();
  }

  private getCartFromLocalStorage(): CartItem[] {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  }

  private saveCartToLocalStorage(cart: CartItem[]) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  addToCart(item: CartItem) {
    const currentItems = this.cartItemsSubject.getValue();
    const existingItemIndex = currentItems.findIndex(i => i._id === item._id);

    if (existingItemIndex > -1) {
      currentItems[existingItemIndex].quantity += 1;
    } else {
      currentItems.push({ ...item, quantity: 1 });
    }

    this.cartItemsSubject.next(currentItems);
    this.saveCartToLocalStorage(currentItems);
  }

  removeFromCart(itemId: string) {
    const currentItems = this.cartItemsSubject.getValue();
    const updatedItems = currentItems.map(item => 
      item._id === itemId
        ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 0 }
        : item
    ).filter(item => item.quantity > 0);

    this.cartItemsSubject.next(updatedItems);
    this.saveCartToLocalStorage(updatedItems);
  }

  getCartItems(): CartItem[] {
    return this.cartItemsSubject.getValue();
  }

  updateItemNotes(itemId: string, notes: string) {
    const currentItems = this.cartItemsSubject.getValue();
    const updatedItems = currentItems.map(item => 
      item._id === itemId ? { ...item, notes } : item
    );
    this.cartItemsSubject.next(updatedItems);
    this.saveCartToLocalStorage(updatedItems);
  }

  clearCart() {
    this.cartItemsSubject.next([]);
    this.saveCartToLocalStorage([]);
  }

  // New method: resetCart
  resetCart() {
    this.clearCart(); // We can use the existing clearCart method
  }
}