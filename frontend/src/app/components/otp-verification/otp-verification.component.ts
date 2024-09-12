import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss']
})
export class OtpVerificationComponent implements OnInit {
  otpForm: FormGroup;
  mobileNumber: string = '';
  name: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.otpForm = this.formBuilder.group({
      otp: ['', Validators.required]
    });
  }

  ngOnInit() {
    const otpData = this.authService.getOtpData();
    if (otpData) {
      this.mobileNumber = otpData.mobileNumber;
      this.name = otpData.name;
    } else {
      this.router.navigate(['/login']);
    }
  }

  onVerifyOtp() {
    if (this.otpForm.valid) {
      const otp = this.otpForm.value.otp;
      this.authService.verifyOtp(this.mobileNumber, otp).subscribe({
        next: (response) => {
          if (response.valid) {
            console.log('OTP verified successfully', response);
            this.authService.clearOtpRequested(); // Clear the OTP request flag
            this.router.navigate(['/customer-dashboard']);
          } else {
            this.snackBar.open('Invalid OTP. Please try again.', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('Error verifying OTP', error);
          this.snackBar.open('Error verifying OTP. Please try again.', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
