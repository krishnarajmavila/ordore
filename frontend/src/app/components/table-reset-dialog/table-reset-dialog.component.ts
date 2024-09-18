import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-table-reset-dialog',
   templateUrl: './table-reset-dialog.component.html',
   styleUrls: ['./table-reset-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule]
})
export class TableResetDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { tableNumber: number }) {}
}