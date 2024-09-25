import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const otpGuard = (route: any, state: any) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const otpRequested = authService.isOtpRequested();
  const otpVerified = authService.isOtpVerified();

  if (otpVerified || otpRequested) {
    return true;
  }

  // router.navigate(['/customer-login']);
  return false;
};