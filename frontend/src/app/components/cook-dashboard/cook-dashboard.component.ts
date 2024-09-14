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

@Component({
  selector: 'app-cook-dashboard',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatListModule, MatIconModule, DragDropModule, MatSidenavModule, MatExpansionModule],
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
  orderStatuses: string[] = ['pending', 'preparing', 'ready'];
  ordersByStatus: { [key: string]: Order[] } = {};
  activeView = 'orders';
  private ordersSubscription?: Subscription;

  constructor(
    private menuService: MenuService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadMenuItems();
    this.loadOrders();
    this.orderService.startOrderRefresh(30000);
  }

  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    this.orderService.stopOrderRefresh();
  }

  loadMenuItems() {
    this.menuService.getMenuItems().subscribe({
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
  
}