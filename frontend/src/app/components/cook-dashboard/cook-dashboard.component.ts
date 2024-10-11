import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
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
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

interface FoodType {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  tableNumber: string;
  category: string;
  status: string;
  orderId: string;
  itemIndex: number;
  notes?: string;
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
    MatSelectModule,
    MatSortModule
  ],
  templateUrl: './cook-dashboard.component.html',
  styleUrls: ['./cook-dashboard.component.scss']
})
export class CookDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  menuItems$ = new BehaviorSubject<MenuItem[]>([]);
  orders$ = new BehaviorSubject<Order[]>([]);
  orderStatuses: string[] = ['pending', 'preparing', 'ready', 'completed'];
  orderItemsByStatus: { [key: string]: OrderItem[] } = {};
  allOrderItems: OrderItem[] = [];
  activeView = 'orders';
  viewMode: 'kanban' | 'itemType' = 'kanban';
  private subscriptions: Subscription[] = [];
  private ordersMap = new Map<string, Order>();
  restaurantId: string | null = null;
  categories: FoodType[] = [];
  items: MatTableDataSource<OrderItem>;
  displayedColumns: string[] = ['category', 'name', 'quantity', 'tableNumber', 'notes', 'status'];

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private menuService: MenuService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router,
    private webSocketService: WebSocketService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {
    this.items = new MatTableDataSource<OrderItem>([]);
  }

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

  ngAfterViewInit() {
    this.items.sort = this.sort;
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
        this.updateOrderItemsByStatus();
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
    this.updateOrderItemsByStatus();
  }

  updateOrderItemsByStatus() {
    const orders = Array.from(this.ordersMap.values());
    this.orderItemsByStatus = {};
    this.orderStatuses.forEach(status => {
      this.orderItemsByStatus[status] = [];
    });

    this.allOrderItems = [];

    orders.forEach(order => {
      order.items.forEach((item, index) => {
        const category = this.categories.find(c => c._id === item.category)?.name || 'Uncategorized';
        const orderItem: OrderItem = {
          id: `${order._id}-${index}`,
          name: item.name,
          quantity: item.quantity,
          tableNumber: order.tableNumber,
          category: category,
          status: item.status || order.status, // Use item status if available, otherwise use order status
          orderId: order._id,
          itemIndex: index,
          notes: item.notes
        };
        this.orderItemsByStatus[orderItem.status].push(orderItem);
        this.allOrderItems.push(orderItem);
      });
    });

    this.items.data = this.allOrderItems;
    this.cdr.detectChanges();
  }

  drop(event: CdkDragDrop<OrderItem[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
  
      const draggedItem = event.container.data[event.currentIndex];
      const newStatus = this.getStatusFromContainerId(event.container.id);
      
      this.updateItemStatus(draggedItem.id, newStatus);
    }
  }

  getStatusFromContainerId(containerId: string): string {
    return containerId.split('-')[1];
  }

  updateItemStatus(itemId: string, newStatus: string) {
    const [orderId, itemIndexStr] = itemId.split('-');
    const itemIndex = parseInt(itemIndexStr, 10);
    
    this.orderService.updateItemStatus(orderId, itemIndex, newStatus).subscribe({
      next: (updatedOrder) => {
        // Update the specific item in allOrderItems
        const updatedItem = this.allOrderItems.find(item => item.id === itemId);
        if (updatedItem) {
          updatedItem.status = newStatus;
        }

        // Update the order in ordersMap
        this.ordersMap.set(updatedOrder._id, updatedOrder);

        // Refresh the view
        this.updateOrderItemsByStatus();
      },
      error: (error) => {
        console.error('Error updating item status:', error);
        this.loadInitialData();
      }
    });
  }

  deleteOrder(itemId: string) {
    const [orderId, itemIndexStr] = itemId.split('-');
    const itemIndex = parseInt(itemIndexStr, 10);

    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      this.orderService.deleteOrderItem(orderId, itemIndex).subscribe({
        next: (updatedOrder) => {
          if (updatedOrder) {
            // If the order still exists (has other items), update it
            this.ordersMap.set(updatedOrder._id, updatedOrder);
          } else {
            // If the order was completely deleted, remove it from the map
            this.ordersMap.delete(orderId);
          }
          this.updateOrdersList(Array.from(this.ordersMap.values()));
        },
        error: (error) => {
          console.error('Failed to delete order item:', error);
          alert(`Failed to delete order item. ${error.message}`);
        }
      });
    }
  }


  loadViewMode() {
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode) {
      this.viewMode = savedViewMode as 'kanban' | 'itemType';
    }
  }

  onViewModeChange(mode: 'kanban' | 'itemType') {
    this.viewMode = mode;
    localStorage.setItem('viewMode', mode);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private setupWebSocketListeners() {
    this.subscriptions.push(
      this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: Order) => {
        this.ordersMap.set(updatedOrder._id, updatedOrder);
        this.updateOrdersList(Array.from(this.ordersMap.values()));
      }),

      this.webSocketService.listen('newOrder').subscribe((newOrder: Order) => {
        this.ordersMap.set(newOrder._id, newOrder);
        this.updateOrdersList(Array.from(this.ordersMap.values()));
      }),

      this.webSocketService.listen('orderDeleted').subscribe((deletedOrderId: string) => {
        this.ordersMap.delete(deletedOrderId);
        this.updateOrdersList(Array.from(this.ordersMap.values()));
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
    if (imageUrl.includes('cloudinary.com')) {
      return imageUrl;
    }
    return `${environment.cloudinaryUrl}/image/upload/${imageUrl}`;
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
        item.isInStock = !newStockStatus;
      }
    });
  }
}