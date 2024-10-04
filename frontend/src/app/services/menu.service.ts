import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import { switchMap, tap, map } from 'rxjs/operators';
import { WebSocketService } from './web-socket.service';

interface FoodType {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface MenuItem {
  _id: string;
  name: string;
  category: FoodType;
  price: number;
  description?: string;
  isVegetarian?: boolean;
  imageUrl?: string;
  isInStock: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}/food`;
  private menuItemsSubject = new BehaviorSubject<MenuItem[]>([]);
  menuItems$ = this.menuItemsSubject.asObservable();
  private refreshInterval: any;
  private currentRestaurantId: string | null = null;

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.setupWebSocketListener();
    this.setCurrentRestaurant(this.getSelectedRestaurantId());
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  setCurrentRestaurant(restaurantId: string | null): void {
    if (restaurantId) {
      this.currentRestaurantId = restaurantId;
      this.fetchMenuItems();
    } else {
      console.error('Invalid restaurant ID');
    }
  }

  getMenuItems(): Observable<MenuItem[]> {
    return this.menuItems$;
  }

  fetchMenuItems(): void {
    const restaurantId = this.getSelectedRestaurantId(); // Get the restaurant ID
    if (!restaurantId) {
      console.error('Restaurant ID is missing. Unable to load menu items.');
      this.showErrorSnackBar('Restaurant ID is missing. Please select a restaurant.'); // Show error message
      return;
    }
  
    console.log(restaurantId, "Fetching menu items for restaurant."); // Debug log
    this.http.get<MenuItem[]>(`${this.apiUrl}?restaurantId=${restaurantId}`).subscribe({
      next: (items: MenuItem[]) => {
        console.log('Fetched menu items:', items);
        this.menuItemsSubject.next(items); // Update the menu items observable
      },
      error: (error) => {
        console.error('Error fetching menu items:', error);
        this.showErrorSnackBar('Error loading menu items. Please try again.'); // Show error message
      }
    });
  }
  
  showErrorSnackBar(arg0: string) {
    throw new Error('Method not implemented.');
  }
  

  searchMenuItems(query: string): Observable<MenuItem[]> {
    this.currentRestaurantId = this.getSelectedRestaurantId();
    if (!this.currentRestaurantId) {
      console.error('No restaurant selected');
      return new Observable<MenuItem[]>(subscriber => subscriber.error('No restaurant selected'));
    }
    return this.http.get<MenuItem[]>(`${this.apiUrl}/search`, { 
      params: { query, restaurant: this.currentRestaurantId } 
    }).pipe(
      tap((items: MenuItem[]) => this.menuItemsSubject.next(items))
    );
  }

  updateStockStatus(itemId: string, isInStock: boolean): Observable<MenuItem> {
    this.currentRestaurantId = this.getSelectedRestaurantId();
    if (!this.currentRestaurantId) {
      console.error('No restaurant selected');
      return new Observable<MenuItem>(subscriber => subscriber.error('No restaurant selected'));
    }
    return this.http.patch<MenuItem>(`${this.apiUrl}/${itemId}/stock`, { 
      isInStock, 
      restaurant: this.currentRestaurantId 
    }).pipe(
      tap((updatedItem: MenuItem) => {
        const currentItems = this.menuItemsSubject.value;
        const updatedItems = currentItems.map(item => 
          item._id === updatedItem._id ? updatedItem : item
        );
        this.menuItemsSubject.next(updatedItems);
        this.webSocketService.emit('stockUpdate', updatedItem);
      })
    );
  }

  startMenuRefresh(intervalMs: number = 30000): void {
    this.stopMenuRefresh();
    this.refreshInterval = interval(intervalMs).pipe(
      switchMap(() => {
        this.currentRestaurantId = this.getSelectedRestaurantId();
        if (!this.currentRestaurantId) {
          console.error('No restaurant selected');
          return new Observable<MenuItem[]>(subscriber => subscriber.error('No restaurant selected'));
        }
        return this.http.get<MenuItem[]>(`${this.apiUrl}?restaurant=${this.currentRestaurantId}`);
      })
    ).subscribe({
      next: (items: MenuItem[]) => this.menuItemsSubject.next(items),
      error: (error) => console.error('Error refreshing menu items:', error)
    });
  }

  stopMenuRefresh(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  private setupWebSocketListener(): void {
    this.webSocketService.listen('menuUpdate').subscribe((updatedItem: MenuItem) => {
      const currentItems = this.menuItemsSubject.value;
      const updatedItems = currentItems.map(item => 
        item._id === updatedItem._id ? updatedItem : item
      );
      this.menuItemsSubject.next(updatedItems);
    });
  }
}
