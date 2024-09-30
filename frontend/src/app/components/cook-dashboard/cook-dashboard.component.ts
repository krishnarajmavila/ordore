import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MenuItem, MenuService } from '../../services/menu.service';
import { Order, OrderService } from '../../services/order.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { WebSocketService } from '../../services/web-socket.service';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';

interface FoodType {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface AggregatedItem {
  name: string;
  totalQuantity: number;
  tables: { tableNumber: string; quantity: number }[];
  category: string;
  status: string;
  orderId: string;
}

@Component({
  selector: 'app-cook-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule, 
    MatCardModule, 
    MatListModule, 
    MatIconModule, 
    DragDropModule, 
    MatSidenavModule, 
    MatExpansionModule, 
    MatSlideToggleModule,
    MatButtonToggleModule,
    MatTableModule,
    MatSelectModule
  ],
  templateUrl: './cook-dashboard.component.html',
  styleUrls: ['./cook-dashboard.component.scss']
})
export class CookDashboardComponent implements OnInit, OnDestroy {
  menuItems$ = new BehaviorSubject<MenuItem[]>([]);
  orders$ = new BehaviorSubject<Order[]>([]);
  orderStatuses: string[] = ['pending', 'preparing', 'ready', 'completed'];
  ordersByStatus: { [key: string]: Order[] } = {};
  ordersByFoodType: { [key: string]: any[] } = {};
  activeView = 'orders';
  viewMode: 'kanban' | 'itemType' = 'kanban';
  private subscriptions: Subscription[] = [];
  private ordersMap = new Map<string, Order>();
  restaurantId: string | null = null;
  categories: FoodType[] = [];
  items: AggregatedItem[] = [];
  displayedColumns: string[] = ['category', 'name', 'quantity', 'tables', 'status', 'actions'];

  constructor(
    private menuService: MenuService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private webSocketService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadViewMode();
    this.restaurantId = this.getSelectedRestaurantId();
    if (this.restaurantId) {
      this.loadInitialData();
      this.setupWebSocketListeners();
      this.loadCategories();
    } else {
      this.handleError('Restaurant ID is not available');
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }

  private handleError(message: string, error?: any) {
    console.error(message, error);
    if (!this.restaurantId) {
      this.router.navigate(['/login']);
    }
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  loadInitialData() {
    this.menuService.fetchMenuItems();
    this.subscriptions.push(
      this.menuService.getMenuItems().subscribe(items => {
        this.menuItems$.next(items);
        this.cdr.detectChanges();
      })
    );

    this.orderService.fetchOrders();
    this.subscriptions.push(
      this.orderService.getOrders().subscribe(orders => {
        this.updateOrdersList(orders);
        this.cdr.detectChanges();
      })
    );
  }

  loadCategories() {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to load categories.');
      return;
    }
    
    this.http.get<FoodType[]>(`${environment.apiUrl}/food-types?restaurantId=${restaurantId}`).subscribe({
      next: (types) => {
        this.categories = [
          { _id: 'all', name: 'All', createdAt: '', updatedAt: '', __v: 0 },
          ...types
        ];
        this.updateOrdersByFoodType();
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  updateOrdersList(orders: Order[]) {
    this.ordersMap.clear();
    orders.forEach(order => this.ordersMap.set(order._id, order));
    this.orders$.next(Array.from(this.ordersMap.values()));
    this.updateOrdersByStatus();
    this.updateOrdersByFoodType();
  }

  updateOrdersByStatus() {
    const orders = Array.from(this.ordersMap.values());
    this.ordersByStatus = {};
    this.orderStatuses.forEach(status => {
      this.ordersByStatus[status] = orders.filter(order => order.status === status);
    });
  }

  updateOrdersByFoodType() {
    const orders = Array.from(this.ordersMap.values());
    this.ordersByFoodType = {};
    
    this.categories.forEach(category => {
      if (category._id !== 'all') {
        const itemsOfCategory: AggregatedItem[] = [];
        
        orders.forEach(order => {
          order.items.forEach(item => {
            if (item.category === category._id) {
              const existingItem = itemsOfCategory.find(i => i.name === item.name);
              // Ensure orderId is captured properly
              const orderId = order._id; // Make sure this is defined
              
              if (existingItem) {
                existingItem.totalQuantity += item.quantity;
                const existingTable = existingItem.tables.find(t => t.tableNumber === order.tableNumber);
                if (existingTable) {
                  existingTable.quantity += item.quantity;
                } else {
                  existingItem.tables.push({ tableNumber: order.tableNumber, quantity: item.quantity });
                }
              } else {
                itemsOfCategory.push({
                  name: item.name,
                  totalQuantity: item.quantity,
                  tables: [{ tableNumber: order.tableNumber, quantity: item.quantity }],
                  category: category.name,
                  status: order.status,
                  orderId: orderId // Add orderId here
                });
              }
            }
          });
        });
        
        this.ordersByFoodType[category.name] = itemsOfCategory;
      }
    });

    // Convert ordersByFoodType into a flat array for mat-table
    this.items = Object.values(this.ordersByFoodType).flat();
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
    console.log('Updating order status for orderId:', orderId); // Log the orderId
    if (!orderId) {
      console.error('orderId is undefined or null');
      return; // Exit if orderId is not valid
    }
  
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: (updatedOrder) => {
        const order = this.ordersMap.get(updatedOrder._id);
        if (order) {
          order.status = updatedOrder.status;
          this.updateOrdersByStatus();
          this.updateOrdersByFoodType();
        }
      },
      error: (error) => {
        console.error('Error updating order status:', error);
        this.loadInitialData();
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
  loadViewMode() {
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode) {
      this.viewMode = savedViewMode as 'kanban' | 'itemType'; // Ensure correct type
    }
  }

  onViewModeChange(mode: 'kanban' | 'itemType') {
    this.viewMode = mode; // Update viewMode
    localStorage.setItem('viewMode', mode); // Save to local storage
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  private setupWebSocketListeners() {
    this.subscriptions.push(
      this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: Order) => {
        this.ordersMap.set(updatedOrder._id, updatedOrder);
        this.orders$.next(Array.from(this.ordersMap.values()));
        this.updateOrdersByStatus();
        this.updateOrdersByFoodType();
        this.cdr.detectChanges();
      }),

      this.webSocketService.listen('newOrder').subscribe((newOrder: Order) => {
        this.ordersMap.set(newOrder._id, newOrder);
        this.orders$.next(Array.from(this.ordersMap.values()));
        this.updateOrdersByStatus();
        this.updateOrdersByFoodType();
        this.cdr.detectChanges();
      }),

      this.webSocketService.listen('orderDeleted').subscribe((deletedOrderId: string) => {
        this.ordersMap.delete(deletedOrderId);
        this.orders$.next(Array.from(this.ordersMap.values()));
        this.updateOrdersByStatus();
        this.updateOrdersByFoodType();
        this.cdr.detectChanges();
      })
    );
  }
  getUniqueCategories(): string[] {
    return Array.from(new Set(this.menuItems$.value.map(item => item.category.name)));
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) {
      return 'assets/default-food-image.jpg';
    }
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}${imageUrl}`;
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
}