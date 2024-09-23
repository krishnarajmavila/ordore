import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarModule, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../services/customer-service.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
  tableOtp: string = '';
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private customerService: CustomerService,
    private http: HttpClient
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
      this.tableOtp = otpData.tableOtp;
    } else {
      this.router.navigate(['/login']);
    }
  }

  onVerifyOtp() {
    if (this.otpForm.valid) {
      const otp = this.otpForm.value.otp;
      console.log('Verifying OTP:', otp);
      this.authService.verifyOtp(this.mobileNumber, otp, this.tableOtp).subscribe({
        next: (response) => {
          if (response.valid) {
            console.log('OTP verified successfully', response);
            this.authService.clearOtpRequested();
            this.authService.setOtpVerified(true);

            // Set customer info in CustomerService
            this.customerService.setCustomerInfo({
              name: this.name,
              phoneNumber: this.mobileNumber,
              tableOtp: this.tableOtp
            });

            // Save OTP user data
            this.saveOtpUser();

            console.log('Navigating to customer dashboard');
            this.router.navigate(['/customer-dashboard']);
          } else {
            console.log('Invalid OTP received');
            this.snackBar.open('Invalid OTP. Please try again.', 'Close', {
              duration: 5000,
              horizontalPosition: this.horizontalPosition,
              verticalPosition: this.verticalPosition
            });
          }
        },
        error: (error) => {
          console.error('Error verifying OTP', error);
          this.snackBar.open('Error verifying OTP. Please try again.', 'Close', {
            duration: 5000,
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition
          });
        }
      });
    }
  }

  saveOtpUser() {
    const userData = {
      name: this.name,
      phoneNumber: this.mobileNumber,
      tableOtp: this.tableOtp
    };

    this.http.post(`${environment.apiUrl}/otp-users/save-otp-user`, userData).subscribe({
      next: (response) => {
        console.log('OTP user data saved successfully', response);
        localStorage.setItem('otpUserData', JSON.stringify(userData));
      },
      error: (error) => {
        console.error('Error saving OTP user data', error);
      }
    });
  }
}