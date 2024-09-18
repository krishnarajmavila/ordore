import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface CustomerInfo {
  name: string;
  phoneNumber: string;
  tableOtp: string;
  tableNumber?: number;
  otpTimestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private customerInfo: CustomerInfo | null = null;
  private readonly OTP_VALIDITY_PERIOD = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {
    this.loadCustomerInfo();
  }

  private loadCustomerInfo(): void {
    const storedInfo = localStorage.getItem('customerInfo');
    if (storedInfo) {
      this.customerInfo = JSON.parse(storedInfo);
    }
  }

  private saveCustomerInfo(): void {
    if (this.customerInfo) {
      localStorage.setItem('customerInfo', JSON.stringify(this.customerInfo));
    } else {
      localStorage.removeItem('customerInfo');
    }
  }

  setCustomerInfo(info: CustomerInfo): void {
    this.customerInfo = {
      ...info,
      otpTimestamp: Date.now()
    };
    this.saveCustomerInfo();
  }

  getName(): string {
    return this.customerInfo?.name || '';
  }

  getPhoneNumber(): string {
    return this.customerInfo?.phoneNumber || '';
  }

  getTableOtp(): string {
    return this.customerInfo?.tableOtp || '';
  }

  getTableNumber(): number | undefined {
    return this.customerInfo?.tableNumber;
  }

  setTableNumber(tableNumber: number): void {
    if (this.customerInfo) {
      this.customerInfo.tableNumber = tableNumber;
      this.saveCustomerInfo();
    }
  }

  getCustomerInfo(): CustomerInfo | null {
    return this.customerInfo;
  }

  isCustomerLoggedIn(): boolean {
    return this.authService.isOtpVerified() && !!this.customerInfo && this.isOtpValidLocally();
  }

  clearCustomerInfo(): void {
    this.customerInfo = null;
    localStorage.removeItem('customerInfo');
  }

  isOtpValidLocally(): boolean {
    if (!this.customerInfo || !this.customerInfo.otpTimestamp) return false;
    const isValid = (Date.now() - this.customerInfo.otpTimestamp) < this.OTP_VALIDITY_PERIOD;
    console.log('Local OTP validity:', isValid);
    return isValid;
  }

  validateOtpWithServer(): Observable<boolean> {
    if (!this.customerInfo || !this.customerInfo.tableOtp) {
      console.log('No customer info or table OTP');
      return of(false);
    }

    return this.authService.validateTableOtp(this.customerInfo.tableOtp).pipe(
      map(response => {
        console.log('Server OTP validation response:', response);
        if (response.valid && response.tableNumber) {
          this.setTableNumber(response.tableNumber);
        }
        return response.valid;
      }),
      catchError(error => {
        console.error('Error validating OTP with server:', error);
        return of(false);
      })
    );
  }

  sendCustomerOtp(name: string, mobileNumber: string): Observable<{ message: string }> {
    if (!this.customerInfo || !this.customerInfo.tableOtp) {
      console.log('No customer info or table OTP');
      return of({ message: 'No table OTP available' });
    }

    return this.authService.sendOtp(name, mobileNumber, this.customerInfo.tableOtp);
  }

  refreshTableOtp(tableNumber: number): Observable<{ message: string; otp: string }> {
    return this.authService.refreshTableOtp(tableNumber).pipe(
      tap(response => {
        if (this.customerInfo) {
          this.customerInfo.tableOtp = response.otp;
          this.customerInfo.otpTimestamp = Date.now();
          this.saveCustomerInfo();
        }
      }),
      catchError(error => {
        console.error('Error refreshing table OTP:', error);
        return of({ message: 'Error refreshing table OTP', otp: '' });
      })
    );
  }


  refreshOtp(newOtp: string): void {
    if (this.customerInfo) {
      this.customerInfo.tableOtp = newOtp;
      this.customerInfo.otpTimestamp = Date.now();
      this.saveCustomerInfo();
    }
  }
}