import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RestaurantService } from '../../services/restaurant.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-restaurant-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule
  ],
  template: `
<h2 mat-dialog-title>Add New Branch</h2>
<mat-dialog-content>
  <form [formGroup]="restaurantForm">
    <mat-form-field appearance="outline" class="mt-2">
      <mat-label>Name</mat-label>
      <input matInput formControlName="name" required>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Parent Organization</mat-label>
      <input matInput formControlName="parentOrganization" required>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Type</mat-label>
      <mat-select formControlName="type" required>
        <mat-option value="branch">Branch</mat-option>
        <mat-option value="franchisee">Franchisee</mat-option>
      </mat-select>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>City</mat-label>
      <input matInput formControlName="city" required>
    </mat-form-field>
  </form>
</mat-dialog-content>
<mat-dialog-actions align="end">
<div class="d-flex align-items-center mx-3 mb-4 w-100">
<button mat-button mat-dialog-close>Cancel</button>
<button mat-raised-button color="primary" [disabled]="!restaurantForm.valid" (click)="onSubmit()">Add Restaurant</button>
</div>
</mat-dialog-actions>
  `,
})
export class RestaurantModalComponent {
  restaurantForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private restaurantService: RestaurantService,
    private dialogRef: MatDialogRef<RestaurantModalComponent>
  ) {
    this.restaurantForm = this.fb.group({
      name: ['', Validators.required],
      parentOrganization: ['', Validators.required],
      type: ['', Validators.required],
      city: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.restaurantForm.valid) {
      this.restaurantService.createRestaurant(this.restaurantForm.value).subscribe({
        next: (restaurant) => {
          this.dialogRef.close(restaurant);
        },
        error: (error) => {
          console.error('Error creating restaurant:', error);
          // Handle error (e.g., show error message)
        }
      });
    }
  }
}