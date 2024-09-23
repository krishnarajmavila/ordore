import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const otpGuard = (route: any, state: any) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const otpRequested = authService.isOtpRequested();
  const otpVerified = authService.isOtpVerified();

  console.log('otpGuard - Checking OTP guard');
  console.log('otpGuard - OTP requested:', otpRequested);
  console.log('otpGuard - OTP verified:', otpVerified);

  if (otpVerified || otpRequested) {
    console.log('otpGuard - OTP was requested or verified, allowing access to', state.url);
    return true;
  }

  console.warn('otpGuard - OTP not requested or verified, redirecting to /customer-login');
  // router.navigate(['/customer-login']);
  return false;
};