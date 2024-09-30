import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarModule, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { RestaurantService } from '../../services/restaurant.service';
import { Restaurant } from '../../models/restaurant.model';

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatSelectModule,
    MatCardModule
  ],
  templateUrl: './customer-login.component.html',
  styleUrls: ['./customer-login.component.scss']
})
export class CustomerLoginComponent implements OnInit {
  loginForm: FormGroup;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  restaurants: Restaurant[] = [];
  selectedRestaurant: Restaurant | null = null;
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private restaurantService: RestaurantService
  ) {
    this.loginForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      countryCode: ['+91', Validators.required],
      mobileNumber: ['', [
        Validators.required, 
        Validators.pattern(/^[0-9]{10}$/)
      ]],
      tableOtp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    // Add this to debug form state changes
    this.loginForm.statusChanges.subscribe(status => {
    });
  }
  loadRestaurants() {
    this.restaurantService.getAllRestaurants().subscribe({
      next: (restaurants) => {
        this.restaurants = restaurants;
        if (restaurants.length > 0) {
          this.selectedRestaurant = restaurants[0];
        }
      },
      error: (error) => console.error('Error loading restaurants:', error)
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { name, countryCode, mobileNumber, tableOtp } = this.loginForm.value;
      const fullMobileNumber = `${countryCode}${mobileNumber}`;
      
      this.authService.sendOtp(name, fullMobileNumber, tableOtp).subscribe({
        next: (response) => {
          if (this.selectedRestaurant) {
            localStorage.setItem('selectedRestaurantId', this.selectedRestaurant._id);
          }
          this.authService.setOtpData(fullMobileNumber, name, tableOtp);
          this.router.navigate(['/verify-otp']);
        },
        error: (error) => {
          console.error('Error:', error);
          if (error.message.includes('Table OTP')) {
            this.snackBar.open('Invalid Table OTP. Please check with the waiter.', 'Close', { duration: 5000 });
          } else {
            this.snackBar.open('Error sending OTP. Please try again.', 'Close', { duration: 5000 });
          }
        }
      });
    }
  }

  showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return control ? (control.invalid && (control.touched || control.dirty)) : false;
  }
}