import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { CustomerDashboardComponent } from './components/customer-dashboard/customer-dashboard.component';
import { CookDashboardComponent } from './components/cook-dashboard/cook-dashboard.component';
import { BillingDashboardComponent } from './components/billing-dashboard/billing-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
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
    component: BillingDashboardComponent, 
    canActivate: [authGuard]
  },
  { 
    path: 'admin-dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [authGuard]
  },
];