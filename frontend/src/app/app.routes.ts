import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { CustomerDashboardComponent } from './components/customer-dashboard/customer-dashboard.component';
import { CookDashboardComponent } from './components/cook-dashboard/cook-dashboard.component';
import { BillingDashboardComponent } from './components/billing-dashboard/billing-dashboard.component';
import { CustomerLoginComponent } from './components/customer-login/customer-login.component';
import { OtpVerificationComponent } from './components/otp-verification/otp-verification.component';
import { otpGuard } from './guards/otp.guard';
import { authGuard } from './guards/auth.guard';
import { CartComponent } from './components/cart/cart.component';
import { OrderDetailsComponent } from './components/order-details/order-details.component';
import { DiningSpecialistComponent } from './components/dining-specialist/dining-specialist.component';
import { OrderManagementComponent } from './components/order-management/order-management.component';
import { DsOrderCheckComponent } from './components/ds-order-check/ds-order-check.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'customer-login', component: CustomerLoginComponent },
  {
    path: 'verify-otp',
    component: OtpVerificationComponent,
    canActivate: [otpGuard],
  },
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [authGuard]
  },
  { 
    path: 'customer-dashboard', 
    component: CustomerDashboardComponent, 
    canActivate: [otpGuard]
  },
  { 
    path: 'cook-dashboard', 
    component: CookDashboardComponent, 
    canActivate: [authGuard]
  },
  { 
    path: 'order-details', 
    component: OrderDetailsComponent, 
    canActivate: [otpGuard]
  },
  { 
    path: 'dsorder-check', 
    component: DsOrderCheckComponent, 
    canActivate: [authGuard]
  },
  { 
    path: 'billing-dashboard', 
    component: BillingDashboardComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'dining-specialist', 
    component: DiningSpecialistComponent, 
    canActivate: [authGuard]
  },
  {
    path: 'order-management/:tableId',
    component: OrderManagementComponent,
    canActivate: [authGuard]
  },
  { path: 'cart', component: CartComponent, canActivate: [otpGuard] },
  { path: '', redirectTo: '/customer-login', pathMatch: 'full' },
  { path: '**', redirectTo: '/customer-login' },
];