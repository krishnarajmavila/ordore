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
    canActivate: [authGuard]
  },
  { 
    path: 'cook-dashboard', 
    component: CookDashboardComponent, 
    canActivate: [authGuard]
  },
  { 
    path: 'billing-dashboard', 
    component: BillingDashboardComponent
  },
  { path: 'cart', component: CartComponent, canActivate: [authGuard] },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];