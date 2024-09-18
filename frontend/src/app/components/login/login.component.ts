import { Component } from '@angular/core';
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
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  user: User = {
    username: '',
    password: '',
    userType: 'customer'
  };
  hidePassword = true;
  error: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit(): void {
    this.authService.login(this.user).subscribe({
      next: (response) => {
        this.authService.setToken(response.token);
        this.authService.setUserType(response.userType);
        this.navigateBasedOnUserType(response.userType);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.error = 'Invalid credentials. Please try again.';
      }
    });
  }

  private navigateBasedOnUserType(userType: string): void {
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