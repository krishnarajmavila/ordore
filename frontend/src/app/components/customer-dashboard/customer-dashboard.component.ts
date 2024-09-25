import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule, MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
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
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { WebSocketService } from '../../services/web-socket.service';
import { CustomerService } from '../../services/customer-service.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
export class CustomerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  @ViewChild('tabGroup', { read: ElementRef }) tabGroupElement!: ElementRef;

  menuItems: MenuItem[] = [];
  categories: string[] = [];
  selectedCategory: string = 'All';
  isVegetarian: boolean = false;
  cartItems: CartItem[] = [];
  searchQuery: string = '';
  isSidenavOpen: boolean = false;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  menuItems$ = this.menuItemsSubject.asObservable();
  private menuUpdateSubscription!: Subscription;

  private userDataSubject = new BehaviorSubject<any>(null);
  userData$: Observable<any> = this.userDataSubject.asObservable();

  private usersSubject = new BehaviorSubject<any[]>([]);
  users$: Observable<any[]> = this.usersSubject.asObservable();

  constructor(
    private menuService: MenuService,
    private authService: AuthService,
    private router: Router,
    private cartService: CartService,
    private webSocketService: WebSocketService,
    private snackBar: MatSnackBar,
    private customerService: CustomerService
  ) {}

  ngOnInit() {
    this.loadMenuItems();
    this.loadCart();
    this.subscribeToMenuUpdates();
    this.menuService.startMenuRefresh(30000);
    this.loadUserData();
  }

  ngAfterViewInit() {
    this.enableSwipeGesture();
  }

  ngOnDestroy() {
    if (this.menuUpdateSubscription) {
      this.menuUpdateSubscription.unsubscribe();
    }
    this.menuService.stopMenuRefresh();
  }

  loadMenuItems() {
    this.menuService.fetchMenuItems();
    this.menuService.menuItems$.subscribe(items => {
      this.menuItems = items;
      this.categories = ['All', ...new Set(items.map(item => item.category))];
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
    this.router.navigate(['/customer-login']);
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

  getTotalPrice(): number {
    return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
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

  getFilteredMenuItems(): Observable<MenuItem[]> {
    return this.menuService.menuItems$.pipe(
      map(items => items.filter(item => 
        (this.selectedCategory === 'All' || item.category === this.selectedCategory) &&
        (!this.isVegetarian || item.isVegetarian === true) &&
        item.isInStock &&
        (this.searchQuery === '' || item.name.toLowerCase().includes(this.searchQuery.toLowerCase()))
      ))
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

  lookOrders() {
    this.router.navigate(['/order-details']);
  }

  onSearch() {
    this.menuService.searchMenuItems(this.searchQuery).subscribe({
      next: (items) => {
        this.menuItems = items;
        this.menuItemsSubject.next(items);
      },
      error: (error) => {
        console.error('Error searching menu items:', error);
      }
    });
  }

  private subscribeToMenuUpdates() {
    this.menuUpdateSubscription = this.webSocketService.listen('menuUpdate').subscribe(
      (updatedItem: MenuItem) => {
        this.updateMenuItem(updatedItem);
      }
    );
  }

  private updateMenuItem(updatedItem: MenuItem) {
    const index = this.menuItems.findIndex(item => item._id === updatedItem._id);
    if (index !== -1) {
      this.menuItems[index] = updatedItem;
      this.menuItemsSubject.next([...this.menuItems]);
    }
  }

  loadUserData() {
    const storedUserData = localStorage.getItem('otpUserData');
    if (storedUserData) {
      const userData = JSON.parse(storedUserData);
      this.userDataSubject.next(userData);

      this.authService.getUsersByTableOtp(userData.tableOtp).subscribe({
        next: (response) => {
          this.usersSubject.next(response.users);
        },
        error: (error) => {
          console.error('Error fetching users by tableOtp:', error);
        },
      });
    }
  }

  openSidenav() {
    this.isSidenavOpen = true;
  }

  closeSidenav() {
    this.isSidenavOpen = false;
  }

  callWaiter() {
    const customerInfo = this.customerService.getCustomerInfo();
    if (customerInfo && customerInfo.tableOtp) {
      this.webSocketService.emit('callWaiter', { tableOtp: customerInfo.tableOtp });
      this.snackBar.open('Waiter has been called', 'Close', {       duration: 5000,
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition });
    } else {
      this.snackBar.open('Unable to call waiter. Please try again.', 'Close', {       duration: 5000,
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition });
    }
  }
}