import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private apiUrl = `${environment.apiUrl}/tables`;

  constructor(private http: HttpClient) {}

  getTables(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getTableByOtp(otp: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${otp}`);
  }
}