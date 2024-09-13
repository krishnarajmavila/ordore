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
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
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
      console.log('Form status:', status);
      console.log('Form valid:', this.loginForm.valid);
      console.log('Form values:', this.loginForm.value);
      console.log('Form errors:', this.loginForm.errors);
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { name, countryCode, mobileNumber, tableOtp } = this.loginForm.value;
      const fullMobileNumber = `${countryCode}${mobileNumber}`;
      
      this.authService.sendOtp(name, fullMobileNumber, tableOtp).subscribe({
        next: (response) => {
          console.log('OTP sent successfully', response);
          this.authService.setOtpData(fullMobileNumber, name, tableOtp);
          this.router.navigate(['/verify-otp']);
        },
        error: (error) => {
          console.error('Error sending OTP', error);
          this.snackBar.open('Error sending OTP. Please try again.', 'Close', {          duration: 5000,
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition  });
        }
      });
    } else {
      console.log('Form is invalid');
      console.log('Form errors:', this.loginForm.errors);
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        if (control?.invalid) {
          console.log(`${key} is invalid:`, control.errors);
        }
      });
    }
  }

  // Helper method to check if a form control is invalid and touched
  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return control ? (control.invalid && (control.touched || control.dirty)) : false;
  }
}