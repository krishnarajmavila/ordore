import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import { switchMap, tap } from 'rxjs/operators';
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

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {
    this.setupWebSocketListener();
  }

  getMenuItems(): Observable<MenuItem[]> {
    return this.menuItems$;
  }

  fetchMenuItems(): void {
    this.http.get<MenuItem[]>(this.apiUrl).subscribe({
      next: (items) => this.menuItemsSubject.next(items),
      error: (error) => console.error('Error fetching menu items:', error)
    });
  }

  searchMenuItems(query: string): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.apiUrl}/search`, { params: { query } }).pipe(
      tap(items => this.menuItemsSubject.next(items))
    );
  }

  updateStockStatus(itemId: string, isInStock: boolean): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.apiUrl}/${itemId}/stock`, { isInStock }).pipe(
      tap(updatedItem => {
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
      switchMap(() => this.http.get<MenuItem[]>(this.apiUrl))
    ).subscribe({
      next: (items) => this.menuItemsSubject.next(items),
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