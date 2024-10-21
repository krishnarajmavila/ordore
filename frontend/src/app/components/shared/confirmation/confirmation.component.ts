import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmationData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2  class="text-center" mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="text-center">
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
<div class="d-flex align-items-center justify-content-center mx-auto">
<button mat-stroked-button [mat-dialog-close]="false">{{ data.cancelText }}</button>
<button mat-stroked-button color="primary" [mat-dialog-close]="true">{{ data.confirmText }}</button>
</div>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 300px;
    }
    mat-dialog-actions {
      justify-content: flex-end;
    }
  `]
})
export class ConfirmationComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationData
  ) {}
}