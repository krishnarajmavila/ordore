import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-customer-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './customer-login.component.html',
  styleUrls: ['./customer-login.component.scss']
})
export class CustomerLoginComponent {
  loginForm: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.formBuilder.group({
      name: ['', Validators.required],
      mobileNumber: ['', [
        Validators.required, 
        Validators.pattern(/^\+[1-9]\d{1,14}$/)
      ]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { name, mobileNumber } = this.loginForm.value;
      this.authService.sendOtp(name, mobileNumber).subscribe({
        next: (response) => {
          console.log('OTP sent successfully', response);
          this.authService.setOtpData(mobileNumber, name);  // Store data in service
          this.router.navigate(['/verify-otp']);
        },
        error: (error) => {
          console.error('Error sending OTP', error);
          this.snackBar.open('Error sending OTP. Please try again.', 'Close', { duration: 3000 });
        }
      });
      
    }
  }
  
}