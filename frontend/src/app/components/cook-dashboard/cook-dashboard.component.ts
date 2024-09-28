import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MenuItem, MenuService } from '../../services/menu.service';
import { Order, OrderService } from '../../services/order.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { WebSocketService } from '../../services/web-socket.service';
import { Table } from '../../interfaces/shared-interfaces';

@Component({
  selector: 'app-cook-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatCardModule, 
    MatListModule, 
    MatIconModule, 
    DragDropModule, 
    MatSidenavModule, 
    MatExpansionModule, 
    MatSlideToggleModule
  ],
  templateUrl: './cook-dashboard.component.html',
  styleUrls: ['./cook-dashboard.component.scss']
})
export class CookDashboardComponent implements OnInit, OnDestroy {
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  tables$: Observable<Table[]> = this.tablesSubject.asObservable();
  menuItems$ = new BehaviorSubject<MenuItem[]>([]);
  orders$ = new BehaviorSubject<Order[]>([]);
  orderStatuses: string[] = ['pending', 'preparing', 'ready', 'completed'];
  ordersByStatus: { [key: string]: Order[] } = {};
  activeView = 'orders';
  private subscriptions: Subscription[] = [];
  private ordersMap = new Map<string, Order>();

  constructor(
    private menuService: MenuService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private webSocketService: WebSocketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('CookDashboardComponent initialized');
    this.loadInitialData();
    this.setupWebSocketListeners();
  }

  ngOnDestroy() {
    console.log('CookDashboardComponent destroyed');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  loadInitialData() {
    console.log('Loading initial data');
    
    // Fetch menu items
    this.menuService.fetchMenuItems();
    this.subscriptions.push(
      this.menuService.getMenuItems().subscribe(items => {
        console.log('Received menu items:', items);
        this.menuItems$.next(items);
        this.cdr.detectChanges();
      })
    );

    // Fetch orders
    this.orderService.fetchOrders();
    this.subscriptions.push(
      this.orderService.getOrders().subscribe(orders => {
        console.log('Received orders:', orders);
        this.updateOrdersList(orders);
        this.cdr.detectChanges();
      })
    );
  }

  updateOrdersList(orders: Order[]) {
    this.ordersMap.clear();
    orders.forEach(order => this.ordersMap.set(order._id, order));
    this.orders$.next(Array.from(this.ordersMap.values()));
    this.updateOrdersByStatus();
  }

  updateOrdersByStatus() {
    const orders = Array.from(this.ordersMap.values());
    console.log('Updating orders by status. Total orders:', orders.length);
    this.ordersByStatus = {};
    this.orderStatuses.forEach(status => {
      this.ordersByStatus[status] = orders.filter(order => order.status === status);
      console.log(`Status ${status}:`, this.ordersByStatus[status].length);
    });
    this.cdr.detectChanges();
  }

  drop(event: CdkDragDrop<Order[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      const draggedOrder = event.container.data[event.currentIndex];
      const newStatus = this.getStatusFromContainerId(event.container.id);
      
      this.updateOrderStatus(draggedOrder._id, newStatus);
    }
  }

  getStatusFromContainerId(containerId: string): string {
    return containerId.split('-')[1];
  }

  updateOrderStatus(orderId: string, newStatus: string) {
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      error: (error) => {
        console.error('Error updating order status:', error);
        this.loadInitialData(); // Reload all data if update fails
      }
    });
  }

  toggleStockStatus(item: MenuItem) {
    const newStockStatus = !item.isInStock;
    this.menuService.updateStockStatus(item._id, newStockStatus).subscribe({
      next: (updatedItem) => {
        console.log('Stock status updated:', updatedItem);
        this.webSocketService.emit('stockUpdate', updatedItem);
      },
      error: (error) => {
        console.error('Error updating stock status:', error);
        item.isInStock = !newStockStatus; // Revert the local change if the API call fails
      }
    });
  }

  deleteOrder(orderId: string) {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      this.orderService.deleteOrder(orderId).subscribe({
        error: (error) => {
          console.error('Failed to delete order:', error);
          alert(`Failed to delete order. ${error.message}`);
        }
      });
    }
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg';
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
  }

  getUniqueCategories(): string[] {
    const categories = Array.from(new Set(this.menuItems$.value.map(item => item.category.name)));
    console.log('Unique categories:', categories);
    return categories;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private setupWebSocketListeners() {
    console.log('Setting up WebSocket listeners');
    this.subscriptions.push(
      this.webSocketService.listen('menuUpdate').subscribe((updatedItem: MenuItem) => {
        console.log('Received menuUpdate:', updatedItem);
        const currentItems = this.menuItems$.value;
        const index = currentItems.findIndex(item => item._id === updatedItem._id);
        if (index !== -1) {
          currentItems[index] = updatedItem;
        } else {
          currentItems.push(updatedItem);
        }
        this.menuItems$.next([...currentItems]);
        this.cdr.detectChanges();
      }),

      this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: Order) => {
        console.log('Received orderUpdate:', updatedOrder);
        this.ordersMap.set(updatedOrder._id, updatedOrder);
        this.orders$.next(Array.from(this.ordersMap.values()));
        this.updateOrdersByStatus();
        this.cdr.detectChanges();
      }),

      this.webSocketService.listen('newOrder').subscribe((newOrder: Order) => {
        console.log('Received newOrder:', newOrder);
        this.ordersMap.set(newOrder._id, newOrder);
        this.orders$.next(Array.from(this.ordersMap.values()));
        this.updateOrdersByStatus();
        this.cdr.detectChanges();
      }),

      this.webSocketService.listen('orderDeleted').subscribe((deletedOrderId: string) => {
        console.log('Received orderDeleted:', deletedOrderId);
        this.ordersMap.delete(deletedOrderId);
        this.orders$.next(Array.from(this.ordersMap.values()));
        this.updateOrdersByStatus();
        this.cdr.detectChanges();
      })
    );
  }
}