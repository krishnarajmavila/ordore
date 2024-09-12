import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const otpGuard = (route: any, state: any) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const token = authService.getToken();
    const otpRequested = authService.isOtpRequested();
    const otpVerified = authService.isOtpVerified();

    console.log('otpGuard - Checking OTP guard');  // Debug: Entering OTP guard check
    console.log('otpGuard - OTP requested:', otpRequested);  // Debug: Check if OTP is requested
    console.log('otpGuard - OTP requested:', otpVerified);
  
    if (otpVerified || otpRequested) {
      console.log('otpGuard - OTP was requested, allowing access to', state.url);
      return true;
    }

    console.warn('otpGuard - OTP not requested, redirecting to /customer-login');
    router.navigate(['/customer-login']);
    return false;
  };
  