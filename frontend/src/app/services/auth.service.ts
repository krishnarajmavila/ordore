import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { RestaurantService } from './restaurant.service';

interface AuthResponse {
  token: string;
  userType: string;
  username: string;
  restaurantId?: string;
  expiresIn?: number;
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
  tableNumber?: String;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private tokenExpirationKey = 'token_expiration';
  private userTypeKey = 'user_type';
  private usernameSubject = new BehaviorSubject<string | null>(null);
  private otpRequestedKey = 'otp_requested';
  private otpVerifiedKey = 'otp_verified';
  private restaurantIdKey = 'restaurant_id';
  private userNameKey = 'user_name';
  private isBrowser: boolean;
  private mobileNumber: string | null = null;
  private name: string | null = null;
  private tableOtp: string | null = null;
  private tokenExpirationTimer: any;
  private authStateSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private restaurantService: RestaurantService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.checkTokenExpiration();
      this.authStateSubject.next(this.isLoggedIn());
    }
  }

  login(credentials: { username: string; password: string; userType: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          this.handleAuthResponse(response);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  private handleAuthResponse(response: AuthResponse): void {
    this.setToken(response.token);
    this.setUserType(response.userType);
    this.setUsername(response.username);
    if (response.restaurantId) {
      this.restaurantService.setCurrentRestaurant(response.restaurantId);
    }
    if (response.expiresIn) {
      this.setTokenExpiration(response.expiresIn);
    } else {
      this.setTokenExpiration(3600); // Default 1 hour expiration
    }
    this.authStateSubject.next(true);
  }

  setUsername(username: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.userNameKey, username);
    }
    this.usernameSubject.next(username);
  }

  getUsername(): Observable<string | null> {
    return this.usernameSubject.asObservable();
  }

  // New method for synchronous username access
  getUsernameSync(): string {
    if (this.isBrowser) {
      return localStorage.getItem(this.userNameKey) || '';
    }
    return this.usernameSubject.getValue() || '';
  }
  setToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  setUserType(userType: string): void {
    if (this.isBrowser) {
      localStorage.setItem(this.userTypeKey, userType);
    }
  }

  getUserType(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem(this.userTypeKey);
    }
    return null;
  }

  getRestaurantId(): Observable<string | null> {
    return this.restaurantService.getCurrentRestaurant();
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    const expiration = localStorage.getItem(this.tokenExpirationKey);
    if (!expiration) {
      return false;
    }
    return new Date(expiration) > new Date();
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userTypeKey);
      localStorage.removeItem(this.otpRequestedKey);
      localStorage.removeItem('otpUserData');
      localStorage.removeItem(this.otpVerifiedKey);
      localStorage.removeItem(this.restaurantIdKey);
      localStorage.removeItem(this.tokenExpirationKey);
      localStorage.removeItem(this.userNameKey);
    }
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.authStateSubject.next(false);
    this.router.navigate(['/login']);
  }

  getUsersByTableOtp(tableOtp: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/otp-users/users-by-table-otp/${tableOtp}`);
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
          throw new Error(validationResponse.message || 'Invalid Table OTP');
        }
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
          this.handleAuthResponse(response);
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

  private setTokenExpiration(expiresIn: number): void {
    if (this.isBrowser) {
      try {
        const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
        localStorage.setItem(this.tokenExpirationKey, expirationDate.toISOString());
        this.setAutoLogout(expiresIn * 1000);
      } catch (error) {
        console.error('Error setting token expiration:', error);
        const defaultExpiration = new Date(new Date().getTime() + 3600 * 1000);
        localStorage.setItem(this.tokenExpirationKey, defaultExpiration.toISOString());
        this.setAutoLogout(3600 * 1000);
      }
    }
  }

  private setAutoLogout(expirationDuration: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  private checkTokenExpiration(): void {
    const expirationDate = localStorage.getItem(this.tokenExpirationKey);
    if (expirationDate) {
      try {
        const now = new Date();
        const expiresAt = new Date(expirationDate);
        const timeLeft = expiresAt.getTime() - now.getTime();
        if (timeLeft > 0) {
          this.setAutoLogout(timeLeft);
        } else {
          this.logout();
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        this.logout();
      }
    }
  }

  getAuthState(): Observable<boolean> {
    return this.authStateSubject.asObservable();
  }

  refreshToken(): Observable<AuthResponse> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh-token`, { token }).pipe(
      tap(response => {
        if (response && response.token) {
          this.handleAuthResponse(response);
        }
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }
  shouldPreventLoginPageAccess(): boolean {
    const isLoggedIn = this.isLoggedIn();
    const userType = this.getUserType();

    if (isLoggedIn) {
      // Redirect based on user type
      switch (userType) {
        case 'admin':
          this.router.navigate(['/admin-dashboard']);
          break;
        case 'customer':
          this.router.navigate(['/customer-dashboard']);
          break;
        case 'cook':
          this.router.navigate(['/cook-dashboard']);
          break;
        case 'billing':
          this.router.navigate(['/billing-dashboard']);
          break;
        case 'diningspecialist':
          this.router.navigate(['/dining-specialist']);
          break;
        default:
          // If user type is unknown, redirect to a default page
          this.router.navigate(['/']);
      }
      return true;
    }
    return false;
  }
}