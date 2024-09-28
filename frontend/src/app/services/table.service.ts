import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Table {
  _id: string;
  number: string;
  capacity: number;
  location?: string;  // Add the location property
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private apiUrl = `${environment.apiUrl}/tables`;

  constructor(private http: HttpClient) {}

  getTables(): Observable<Table[]> {
    return this.http.get<Table[]>(this.apiUrl);
  }

  getTableByOtp(otp: string): Observable<Table> {
    return this.http.get<Table>(`${this.apiUrl}/${otp}`);
  }

  updateTable(tableId: string, updateData: Partial<Table>): Observable<Table> {
    return this.http.put<Table>(`${this.apiUrl}/${tableId}`, updateData);
  }

  // New method to add a table
  addTable(tableData: Omit<Table, '_id' | 'otp' | 'otpGeneratedAt'>): Observable<Table> {
    return this.http.post<Table>(this.apiUrl, tableData);
  }

  // New method to delete a table
  deleteTable(tableId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${tableId}`);
  }

  // New method to refresh OTP
  refreshOTP(tableId: string): Observable<Table> {
    return this.http.post<Table>(`${this.apiUrl}/${tableId}/refresh-otp`, {});
  }
}