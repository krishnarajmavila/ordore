// customer-dashboard.component.ts
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MenuService, MenuItem } from '../../services/menu.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CartFilterPipe } from '../../pipe/cart-filter.pipe';
import { CartService, CartItem } from '../../services/cart.service';

@Component({
  selector: 'app-customer-dashboard',
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
    CartFilterPipe
  ],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.scss']
})
export class CustomerDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  @ViewChild('tabGroup', { read: ElementRef }) tabGroupElement!: ElementRef;

  menuItems: MenuItem[] = [];
  categories: string[] = [];
  selectedCategory: string = 'All';
  isVegetarian: boolean = false;
  cartItems: CartItem[] = [];

  constructor(
    private menuService: MenuService,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loadMenuItems();
    this.loadCart();
  }

  ngAfterViewInit() {
    this.enableSwipeGesture();
  }

  loadMenuItems() {
    this.menuService.getMenuItems().subscribe({
      next: (items) => {
        this.menuItems = items;
        this.categories = ['All', ...new Set(items.map(item => item.category))];
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
      }
    });
  }

  loadCart() {
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg';
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
  }

  toggleVegetarian() {
    this.isVegetarian = !this.isVegetarian;
  }

  addToCart(item: MenuItem) {
    this.cartService.addToCart({
      _id: item._id,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      imageUrl: item.imageUrl,
      quantity: 1
    });
  }

  decreaseQuantity(item: MenuItem) {
    this.cartService.removeFromCart(item._id);
  }

  increaseQuantity(item: MenuItem) {
    this.addToCart(item);
  }

  getCartItemQuantity(item: MenuItem): number {
    const cartItem = this.cartItems.find(ci => ci._id === item._id);
    return cartItem ? cartItem.quantity : 0;
  }

  getCartItemCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getCartTotal(): number {
    return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  viewCart() {
    this.router.navigate(['/cart']);
  }

  getFilteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => 
      (this.selectedCategory === 'All' || item.category === this.selectedCategory) &&
      (!this.isVegetarian || item.isVegetarian === true) // Assuming 'Mains' are non-vegetarian
    );
  }

  onTabChange(index: number) {
    this.selectCategory(this.categories[index]);
  }

  onSwipe(event: TouchEvent, direction: string) {
    const currentIndex = this.tabGroup?.selectedIndex;
  
    if (currentIndex !== null && currentIndex !== undefined) {
      if (direction === 'left' && currentIndex < this.categories.length - 1) {
        this.tabGroup.selectedIndex = currentIndex + 1;
      } else if (direction === 'right' && currentIndex > 0) {
        this.tabGroup.selectedIndex = currentIndex - 1;
      }
    }
  }
  

  private enableSwipeGesture() {
    let touchStartX: number;
    const element = this.tabGroupElement.nativeElement;
  
    element.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    });
  
    element.addEventListener('touchend', (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
  
      if (Math.abs(diff) > 50) { // Minimum swipe distance
        if (diff > 0) {
          this.onSwipe(e, 'left');
        } else {
          this.onSwipe(e, 'right');
        }
      }
    });
  }
  
}