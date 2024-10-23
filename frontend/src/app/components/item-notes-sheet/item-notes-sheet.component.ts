// item-notes-sheet.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-item-notes-sheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: `
    <h2>Add Notes for {{ data.itemName }}</h2>
    <mat-form-field appearance="outline" class="w-100">
      <mat-label>Special instructions</mat-label>
      <textarea
        matInput
        [(ngModel)]="notes"
        placeholder="Any special requests?"
      ></textarea>
    </mat-form-field>
    <button mat-raised-button color="primary" (click)="saveNotes()">
      Save Notes
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 16px;
      }
      button {
        height: 50px;
      }
    `,
  ],
})
export class ItemNotesSheetComponent {
  notes: string;

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA)
    public data: { itemName: string; existingNotes: string },
    private bottomSheetRef: MatBottomSheetRef<ItemNotesSheetComponent>
  ) {
    this.notes = data.existingNotes || '';
  }

  saveNotes() {
    this.bottomSheetRef.dismiss(this.notes);
  }
}
