import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RestaurantSelectorComponent } from '../restaurant-selector/restaurant-selector.component';
interface Restaurant {
  _id: string;
  name: string;
  parentOrganization: string;
  type: 'branch' | 'franchisee';
  city: string;
}
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatButtonModule,
    RestaurantSelectorComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  user: User = {
    username: '',
    password: '',
    userType: 'customer'
  };
  hidePassword = true;
  error: string = '';
  selectedRestaurant: Restaurant | null = null; // Correctly defined property

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.shouldPreventLoginPageAccess();
    console.log('LoginComponent initialized');
    this.onUserTypeChange();
  }

  onSubmit(): void {
    console.log('Submit button clicked');
    console.log('User type:', this.user.userType);
    console.log('Selected restaurant:', this.selectedRestaurant);
    this.authService.login(this.user).subscribe({
      next: (response) => {
        console.log('Login successful');
        this.authService.setToken(response.token);
        this.authService.setUserType(response.userType);
  
        // Store selected restaurant ID in local storage
        if (this.selectedRestaurant) {
          localStorage.setItem('selectedRestaurantId', this.selectedRestaurant._id);
        }
  
        this.navigateBasedOnUserType(response.userType);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.error = 'Invalid credentials. Please try again.';
      }
    });
  }
  

  onUserTypeChange(): void {
    console.log('User type changed to:', this.user.userType);
  }

  onRestaurantChange(restaurant: Restaurant): void {
    this.selectedRestaurant = restaurant; // This should match the emitted value from the selector
    console.log('Selected restaurant:', restaurant);
  }

  private navigateBasedOnUserType(userType: string): void {
    console.log('Navigating based on user type:', userType);
    switch (userType) {
      case 'customer':
        this.router.navigate(['/customer-dashboard']);
        break;
      case 'cook':
        this.router.navigate(['/cook-dashboard']);
        break;
      case 'billing':
        this.router.navigate(['/billing-dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'diningspecialist':
        this.router.navigate(['/dining-specialist']);
        break;
      default:
        console.error('Unknown user type:', userType);
        this.error = 'Unknown user type';
    }
  }
}
