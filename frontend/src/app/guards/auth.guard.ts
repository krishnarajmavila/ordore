import { inject } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Adjust this import path as needed

export const authGuard = (route: any, state: any): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('authGuard - Checking route:', state.url);
  
  const isAuthenticated = authService.isLoggedIn();
  console.log('authGuard - Is Authenticated:', isAuthenticated);
  
  const userType = authService.getUserType();
  console.log('authGuard - User Type:', userType);
  
  const token = authService.getToken();
  console.log('authGuard - Token exists:', !!token);

  // Define paths where authentication check should be skipped
  const publicRoutes = ['/login', '/register', '/home', '/menu'];
  
  // Allow access to public routes without authentication
  if (publicRoutes.includes(state.url)) {
    console.log('authGuard - Allowing access to public route:', state.url);
    return true;
  }


  // Check for customer routes
  if (state.url.includes('/customer')) {
    console.log('authGuard - Attempting to access customer route');
    if (isAuthenticated && userType === 'customer') {
      console.log('authGuard - Authenticated customer, allowing access');
      return true;
    } else {
      console.warn('authGuard - Access denied to customer route');
      console.warn('authGuard - Authentication status:', isAuthenticated);
      console.warn('authGuard - User type:', userType);
      console.warn('authGuard - Redirecting to /login');
      return router.createUrlTree(['/login']);
    }
  }

  // Check for admin routes
  if (state.url.includes('/admin')) {
    console.log('authGuard - Attempting to access admin route');
    if (isAuthenticated && userType === 'admin') {
      console.log('authGuard - Authenticated admin, allowing access');
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
    console.log('authGuard - Attempting to access cook route');
    if (isAuthenticated && userType === 'cook') {
      console.log('authGuard - Authenticated cook, allowing access');
      return true;
    } else {
      console.warn('authGuard - Access denied to cook route');
      return router.createUrlTree(['/login']);
    }
  }
  
  // For any other protected route, check if user is authenticated
  if (isAuthenticated) {
    console.log('authGuard - User is authenticated, allowing access to:', state.url);
    return true;
  } else {
    console.warn('authGuard - User is not authenticated');
    console.warn('authGuard - Redirecting to /login');
    return router.createUrlTree(['/login']);
  }
};