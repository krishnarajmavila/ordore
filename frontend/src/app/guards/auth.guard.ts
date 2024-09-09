import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = (route: any, state: any) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const userType = authService.getUserType();
  if (userType && state.url.includes(userType)) {
    return true;
  }
  router.navigate(['/login']);
  return false;
};