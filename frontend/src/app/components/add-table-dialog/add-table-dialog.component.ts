import { Component, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableService } from '../../services/table.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add-table-dialog',
  standalone: true,
  imports: [FormsModule, CommonModule, MatButtonModule, MatDialogModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './add-table-dialog.component.html',
  styleUrls: ['./add-table-dialog.component.scss']
})
export class AddTableDialogComponent {
  @Output() tableAdded = new EventEmitter<Table>();
  
  addTableForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private tableService: TableService,
    private dialogRef: MatDialogRef<AddTableDialogComponent>
  ) {
    this.addTableForm = this.fb.group({
      name: ['', Validators.required],
      location: [{ value: 'Parcel - Take Away', disabled: true }]
    });
  }

  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  createTable() {
    if (this.addTableForm.valid) {
      const formValue = this.addTableForm.value;
      
      const currentRestaurantId = this.getSelectedRestaurantId();
      if (!currentRestaurantId) {
        console.error('No restaurant selected');
        return;
      }
      
      const newTable: Omit<Table, '_id' | 'otp' | 'otpGeneratedAt'> = {
        number: `${formValue.name}`,
        capacity: 1,
        isOccupied: false,
        location: 'Parcel - Take Away',
        restaurant: currentRestaurantId
      };
      
      this.tableService.addTable(newTable, currentRestaurantId).subscribe({
        next: (table) => {
          this.tableAdded.emit(table);
          this.dialogRef.close(table);
        },
        error: (error) => {
          console.error('Error creating table:', error);
        }
      });
    }
  }
}