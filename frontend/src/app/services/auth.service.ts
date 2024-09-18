import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

interface AuthResponse {
  token: string;
  userType: string;
}

interface OtpSendResponse {
  message: string;
}

interface OtpVerifyResponse extends AuthResponse {
  valid: boolean;
}
interface TableOtpValidationResponse {
  valid: boolean;
  message?: string;
  tableNumber?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private userTypeKey = 'user_type';
  private otpRequestedKey = 'otp_requested';
  private otpVerifiedKey = 'otp_verified';
  private isBrowser: boolean;
  private mobileNumber: string | null = null;
  private name: string | null = null;
  private tableOtp: string | null = null;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  login(credentials: { username: string; password: string; userType: string }): Observable<AuthResponse> {
    console.log('Login attempt with credentials:', JSON.stringify(credentials));
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        console.log('Received login response:', JSON.stringify(response));
        if (response && response.token) {
          this.setToken(response.token);
          this.setUserType(response.userType);
          console.log('After setting - Token:', this.getToken(), 'UserType:', this.getUserType());
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  setToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, token);
      console.log('Token set in localStorage:', token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      const token = localStorage.getItem(this.tokenKey);
      console.log('Token retrieved from localStorage:', token);
      return token;
    }
    return null;
  }

  setUserType(userType: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.userTypeKey, userType);
      console.log('UserType set in localStorage:', userType);
    }
  }

  getUserType(): string | null {
    if (this.isBrowser) {
      const userType = localStorage.getItem(this.userTypeKey);
      console.log('UserType retrieved from localStorage:', userType);
      return userType;
    }
    return null;
  }

  isLoggedIn(): boolean {
    const loggedIn = !!this.getToken();
    console.log('isLoggedIn check result:', loggedIn);
    return loggedIn;
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userTypeKey);
      localStorage.removeItem(this.otpRequestedKey);
      localStorage.removeItem(this.otpVerifiedKey);
    }
  }

  setOtpRequested(requested: boolean): void {
    if (this.isBrowser) {
      localStorage.setItem(this.otpRequestedKey, requested ? 'true' : 'false');
    }
  }

  isOtpRequested(): boolean {
    return this.isBrowser ? localStorage.getItem(this.otpRequestedKey) === 'true' : false;
  }

  setOtpData(mobileNumber: string, name: string, tableOtp: string): void {
    this.mobileNumber = mobileNumber;
    this.name = name;
    this.tableOtp = tableOtp;
  }

  getOtpData(): { mobileNumber: string, name: string, tableOtp: string } | null {
    return (this.mobileNumber && this.name && this.tableOtp) 
      ? { mobileNumber: this.mobileNumber, name: this.name, tableOtp: this.tableOtp } 
      : null;
  }

  clearOtpRequested(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.otpRequestedKey);
    }
  }

  setOtpVerified(status: boolean): void {
    if (this.isBrowser) {
      localStorage.setItem(this.otpVerifiedKey, status ? 'true' : 'false');
    }
  }

  isOtpVerified(): boolean {
    return this.isBrowser ? localStorage.getItem(this.otpVerifiedKey) === 'true' : false;
  }

  clearOtpVerified(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.otpVerifiedKey);
    }
  }


  sendOtp(name: string, mobileNumber: string, tableOtp: string): Observable<OtpSendResponse> {
    return this.validateTableOtp(tableOtp).pipe(
      switchMap(validationResponse => {
        if (!validationResponse.valid) {
          // If Table OTP is invalid, throw an error to prevent sending the customer OTP
          throw new Error(validationResponse.message || 'Invalid Table OTP');
        }
        
        // If Table OTP is valid, proceed with sending the customer OTP using the correct endpoint
        return this.http.post<OtpSendResponse>(`${environment.apiUrl}/auth/send-otp`, { name, mobileNumber, tableOtp });
      }),
      tap(() => {
        if (this.isBrowser) {
          this.setOtpRequested(true);
        }
      }),
      catchError(error => {
        console.error('Error in sendOtp:', error);
        return throwError(() => error);
      })
    );
  }

  validateTableOtp(tableOtp: string): Observable<TableOtpValidationResponse> {
    return this.http.post<TableOtpValidationResponse>(`${environment.apiUrl}/table-otp/validate`, { tableOtp }).pipe(
      catchError(error => {
        console.error('Error validating Table OTP:', error);
        return throwError(() => new Error('Error validating Table OTP'));
      })
    );
  }

  refreshTableOtp(tableNumber: number): Observable<{ message: string, otp: string }> {
    return this.http.post<{ message: string, otp: string }>(`${environment.apiUrl}/table-otp/refresh`, { tableNumber }).pipe(
      catchError(error => {
        console.error('Error refreshing Table OTP:', error);
        return throwError(() => error);
      })
    );
  }
  verifyOtp(mobileNumber: string, otp: string, tableOtp: string): Observable<OtpVerifyResponse> {
    return this.http.post<OtpVerifyResponse>(`${environment.apiUrl}/auth/verify-otp`, { mobileNumber, otp, tableOtp }).pipe(
      tap(response => {
        if (response.valid && response.token) {
          this.setToken(response.token);
          this.setUserType(response.userType);
          if (this.isBrowser) {
            this.setOtpVerified(true);
            this.clearOtpRequested();
          }
        } else {
          if (this.isBrowser) {
            this.setOtpVerified(false);
          }
        }
      }),
      catchError(error => {
        console.error('Error verifying OTP:', error);
        if (this.isBrowser) {
          this.setOtpVerified(false);
        }
        return throwError(() => error);
      })
    );
  }
}