import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Adjust this import path as needed

export const authGuard = (route: any, state: any): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const isAuthenticated = authService.isLoggedIn();
  
  const userType = authService.getUserType();
  
  const token = authService.getToken();

  // Define paths where authentication check should be skipped
  const publicRoutes = ['/login', '/register', '/home', '/menu'];
  
  // Allow access to public routes without authentication
  if (publicRoutes.includes(state.url)) {
    return true;
  }


  // Check for customer routes
  if (state.url.includes('/customer')) {
    if (isAuthenticated && userType === 'customer') {
      return true;
    } else {
      return router.createUrlTree(['/login']);
    }
  }

  // Check for admin routes
  if (state.url.includes('/admin')) {
    if (isAuthenticated && userType === 'admin') {
      return true;
    } else {
      console.warn('authGuard - Access denied to admin route');
      console.warn('authGuard - Authentication status:', isAuthenticated);
      console.warn('authGuard - User type:', userType);
      console.warn('authGuard - Redirecting to /login');
      return router.createUrlTree(['/login']);
    }
  }
  if (state.url.includes('/cook')) {
    if (isAuthenticated && userType === 'cook') {
      return true;
    } else {
      return router.createUrlTree(['/login']);
    }
  }
  
  // For any other protected route, check if user is authenticated
  if (isAuthenticated) {
    return true;
  } else {
    console.warn('authGuard - User is not authenticated');
    console.warn('authGuard - Redirecting to /login');
    return router.createUrlTree(['/login']);
  }
};