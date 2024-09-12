// import { Injectable } from '@angular/core';
// import { Observable, of } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class CustomerService {
//   private readonly STORAGE_KEY = 'customerInfo';

//   constructor() { }

//   saveCustomerInfo(name: string, phoneNumber: string, tableNumber: string): Observable<boolean> {
//     const customerInfo = { name, phoneNumber, tableNumber };
//     localStorage.setItem(this.STORAGE_KEY, JSON.stringify(customerInfo));
//     return of(true);
//   }

//   getCustomerInfo(): { name: string, phoneNumber: string, tableNumber: string } | null {
//     const storedInfo = localStorage.getItem(this.STORAGE_KEY);
//     return storedInfo ? JSON.parse(storedInfo) : null;
//   }

//   getName(): string {
//     const customerInfo = this.getCustomerInfo();
//     return customerInfo ? customerInfo.name : '';
//   }

//   getPhoneNumber(): string {
//     const customerInfo = this.getCustomerInfo();
//     return customerInfo ? customerInfo.phoneNumber : '';
//   }

//   getTableNumber(): string {
//     const customerInfo = this.getCustomerInfo();
//     return customerInfo ? customerInfo.tableNumber : '';
//   }

//   clearCustomerInfo(): void {
//     localStorage.removeItem(this.STORAGE_KEY);
//   }

//   isCustomerLoggedIn(): boolean {
//     return !!this.getCustomerInfo();
//   }
// }


import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly staticCustomerInfo = {
    name: 'John Doe',
    phoneNumber: '1234567890',
    tableNumber: 'A1'
  };

  constructor() { }

  getName(): string {
    return this.staticCustomerInfo.name;
  }

  getPhoneNumber(): string {
    return this.staticCustomerInfo.phoneNumber;
  }

  getTableNumber(): string {
    return this.staticCustomerInfo.tableNumber;
  }

  getCustomerInfo(): { name: string, phoneNumber: string, tableNumber: string } {
    return { ...this.staticCustomerInfo };
  }

  isCustomerLoggedIn(): boolean {
    return true; // Always return true since we're using static data
  }
}