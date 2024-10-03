import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Restaurant } from '../models/restaurant.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private apiUrl = `${environment.apiUrl}/restaurants`;
  private currentRestaurantIdSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    console.log('RestaurantService constructed');
  }

  createRestaurant(restaurantData: Partial<Restaurant>): Observable<Restaurant> {
    console.log('Creating restaurant:', restaurantData);
    return this.http.post<Restaurant>(this.apiUrl, restaurantData).pipe(
      tap(newRestaurant => console.log('Restaurant created:', newRestaurant)),
      catchError(this.handleError<Restaurant>('createRestaurant'))
    );
  }
  getAllRestaurants(): Observable<Restaurant[]> {
    console.log('Fetching all restaurants');
    return this.http.get<Restaurant[]>(`${this.apiUrl}/all`).pipe(
      tap(restaurants => console.log('Fetched all restaurants:', restaurants)),
      catchError(this.handleError<Restaurant[]>('getAllRestaurants', []))
    );
  }
  getRestaurants(): Observable<Restaurant[]> {
    console.log('Fetching restaurants');
    return this.http.get<Restaurant[]>(this.apiUrl).pipe(
      tap(restaurants => console.log('Fetched restaurants:', restaurants)),
      catchError(this.handleError<Restaurant[]>('getRestaurants', []))
    );
  }

  getRestaurant(id: string): Observable<Restaurant> {
    console.log('Fetching restaurant with id:', id);
    return this.http.get<Restaurant>(`${this.apiUrl}/${id}`).pipe(
      tap(restaurant => console.log('Fetched restaurant:', restaurant)),
      catchError(this.handleError<Restaurant>('getRestaurant'))
    );
  }

  verifyRestaurant(id: string): Observable<any> {
    console.log('Verifying restaurant with id:', id);
    return this.http.get<any>(`${this.apiUrl}/verify/${id}`).pipe(
      tap(response => console.log('Verify restaurant response:', response)),
      catchError(this.handleError<any>('verifyRestaurant'))
    );
  }

  setCurrentRestaurant(restaurantId: string) {
    console.log('Setting current restaurant:', restaurantId);
    this.currentRestaurantIdSubject.next(restaurantId);
    localStorage.setItem('currentRestaurantId', restaurantId);
  }

  getCurrentRestaurant(): Observable<string | null> {
    if (!this.currentRestaurantIdSubject.value) {
      const storedId = localStorage.getItem('currentRestaurantId');
      console.log('Retrieved stored restaurant ID:', storedId);
      if (storedId) {
        this.currentRestaurantIdSubject.next(storedId);
      }
    }
    return this.currentRestaurantIdSubject.asObservable();
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      console.error('Error details:', error);
      return of(result as T);
    };
  }
  updateRestaurant(id: string, restaurantData: Partial<Restaurant>): Observable<Restaurant> {
    return this.http.put<Restaurant>(`${this.apiUrl}/${id}`, restaurantData);
  }

  deleteRestaurant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
