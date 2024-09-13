import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

interface CustomerInfo {
  name: string;
  phoneNumber: string;
  tableOtp: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private customerInfo: CustomerInfo | null = null;

  constructor(private authService: AuthService) {
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
    this.customerInfo = info;
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

  getCustomerInfo(): CustomerInfo | null {
    return this.customerInfo;
  }

  isCustomerLoggedIn(): boolean {
    return this.authService.isOtpVerified() && !!this.customerInfo;
  }

  clearCustomerInfo(): void {
    this.customerInfo = null;
    localStorage.removeItem('customerInfo');
  }
}