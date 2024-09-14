import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MenuItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  isVegetarian?: boolean;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  constructor(private http: HttpClient) {}

  getMenuItems(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${environment.apiUrl}/food`);
  }

  searchMenuItems(query: string): Observable<MenuItem[]> {
    // If the query is empty, return all menu items
    if (!query.trim()) {
      return this.getMenuItems();
    }
    // Otherwise, call the search endpoint
    return this.http.get<MenuItem[]>(`${environment.apiUrl}/food/search`, {
      params: { query }
    });
  }
}