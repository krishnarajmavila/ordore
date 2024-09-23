import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Table {
  _id: string;
  number: string;
  capacity: number;
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

  // New method to update a table
  updateTable(tableId: string, updateData: Partial<Table>): Observable<Table> {
    return this.http.put<Table>(`${this.apiUrl}/${tableId}`, updateData);
  }
}