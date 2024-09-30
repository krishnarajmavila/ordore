import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Table {
  _id: string;
  number: string;
  capacity: number;
  location?: string;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  restaurant: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private apiUrl = `${environment.apiUrl}/tables`;

  constructor(private http: HttpClient) {}

  getTables(restaurantId: string): Observable<Table[]> {
    console.log(`Fetching tables for restaurant: ${restaurantId}`);
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.get<Table[]>(this.apiUrl, { params }).pipe(
      tap(tables => console.log('Received tables:', tables)),
      catchError(this.handleError)
    );
  }

  getTableByOtp(otp: string, restaurantId: string): Observable<Table> {
    console.log(`Fetching table with OTP: ${otp} for restaurant: ${restaurantId}`);
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.get<Table>(`${this.apiUrl}/${otp}`, { params }).pipe(
      tap(table => console.log('Received table:', table)),
      catchError(this.handleError)
    );
  }

  updateTable(tableId: string, updateData: Partial<Table>, restaurantId: string): Observable<Table> {
    console.log(`Updating table ${tableId} for restaurant: ${restaurantId}`);
    const payload = { ...updateData, restaurantId };
    return this.http.put<Table>(`${this.apiUrl}/${tableId}`, payload).pipe(
      tap(updatedTable => console.log('Updated table:', updatedTable)),
      catchError(this.handleError)
    );
  }

  addTable(tableData: Omit<Table, '_id' | 'otp' | 'otpGeneratedAt'>, restaurantId: string): Observable<Table> {
    console.log(`Adding new table for restaurant: ${restaurantId}`);
    const payload = { ...tableData, restaurant: restaurantId };
    return this.http.post<Table>(this.apiUrl, payload).pipe(
      tap(newTable => console.log('Added new table:', newTable)),
      catchError(this.handleError)
    );
  }

  deleteTable(tableId: string, restaurantId: string): Observable<void> {
    console.log(`Deleting table ${tableId} for restaurant: ${restaurantId}`);
    const params = new HttpParams().set('restaurantId', restaurantId);
    return this.http.delete<void>(`${this.apiUrl}/${tableId}`, { params }).pipe(
      tap(() => console.log(`Table ${tableId} deleted successfully`)),
      catchError(this.handleError)
    );
  }

  refreshOTP(tableId: string, restaurantId: string): Observable<Table> {
    console.log(`Refreshing OTP for table ${tableId} in restaurant: ${restaurantId}`);
    return this.http.post<Table>(`${this.apiUrl}/${tableId}/refresh-otp`, { restaurantId }).pipe(
      tap(updatedTable => console.log('Table with refreshed OTP:', updatedTable)),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Backend error
      errorMessage = `Backend returned code ${error.status}, body was: ${JSON.stringify(error.error)}`;
    }
    console.error('TableService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}