import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { WebSocketService } from '../../services/web-socket.service';

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
  styleUrls: ['./cook-dashboard.component.scss'],
  animations: [
    trigger('itemAnimation', [
      state('normal', style({
        transform: 'scale(1)',
        'box-shadow': 'none',
        'z-index': 1
      })),
      state('dragging', style({
        transform: 'scale(1.05)',
        'box-shadow': '0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12)',
        'z-index': 10
      })),
      transition('normal => dragging', animate('100ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
      transition('dragging => normal', animate('100ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class CookDashboardComponent implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  orders: Order[] = [];
  orderStatuses: string[] = ['pending', 'preparing', 'ready', 'completed'];
  ordersByStatus: { [key: string]: Order[] } = {};
  activeView = 'orders';
  private ordersSubscription?: Subscription;
  private menuSubscription?: Subscription;

  constructor(
    private menuService: MenuService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.loadMenuItems();
    this.loadOrders();
    this.orderService.startOrderRefresh(3000);
    this.menuService.startMenuRefresh(3000);
    this.setupWebSocketListeners();
  }

  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    if (this.menuSubscription) {
      this.menuSubscription.unsubscribe();
    }
    this.orderService.stopOrderRefresh();
    this.menuService.stopMenuRefresh();
  }

  loadMenuItems() {
    this.menuSubscription = this.menuService.menuItems$.subscribe({
      next: (items) => {
        this.menuItems = items;
      },
      error: (error) => {
        console.error('Error loading menu items:', error);
      }
    });
  }

  loadOrders() {
    this.orderService.fetchOrders();
    this.ordersSubscription = this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.updateOrdersByStatus();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  updateOrdersByStatus() {
    this.ordersByStatus = {};
    this.orderStatuses.forEach(status => {
      this.ordersByStatus[status] = this.orders.filter(order => order.status === status);
    });
  }

  toggleStockStatus(item: MenuItem) {
    const newStockStatus = !item.isInStock;
    this.menuService.updateStockStatus(item._id, newStockStatus).subscribe({
      next: (updatedItem) => {
        console.log('Stock status updated:', updatedItem);
        // The menuItems array will be automatically updated via the BehaviorSubject in MenuService
        this.webSocketService.emit('stockUpdate', updatedItem);
      },
      error: (error) => {
        console.error('Error updating stock status:', error);
        // Revert the local change if the API call fails
        item.isInStock = !newStockStatus;
      }
    });
  }

  updateOrderStatus(orderId: string, newStatus: string) {
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: (updatedOrder) => {
        console.log('Order status updated:', updatedOrder);
        this.orderService.fetchOrders();
      },
      error: (error) => {
        console.error('Error updating order status:', error);
      }
    });
  }

  deleteOrder(orderId: string) {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          console.log('Order deleted successfully');
          this.loadOrders();
        },
        error: (error) => {
          console.error('Error deleting order:', error);
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
    return containerId.split('-')[1]; // Assuming container IDs are in the format 'orders-status'
  }

  getUniqueCategories(): string[] {
    return Array.from(new Set(this.menuItems.map(item => item.category)));
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private setupWebSocketListeners() {
    this.webSocketService.listen('menuUpdate').subscribe((updatedItem: MenuItem) => {
      const index = this.menuItems.findIndex(item => item._id === updatedItem._id);
      if (index !== -1) {
        this.menuItems[index] = updatedItem;
      }
    });

    this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: Order) => {
      this.loadOrders(); // Reload all orders when an update is received
    });
  }
}