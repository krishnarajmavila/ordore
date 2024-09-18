import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
}

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  template: `
    <div class="table-cards">
      <mat-card *ngFor="let table of tables" class="table-card" (click)="selectTable(table)">
        <mat-card-header>
          <mat-card-title>Table {{table.number}}</mat-card-title>
          <mat-card-subtitle>OTP: {{table.otp}}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Capacity: {{table.capacity}}</p>
          <p>Status: {{table.isOccupied ? 'Occupied' : 'Available'}}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .table-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }
    .table-card {
      width: 200px;
      cursor: pointer;
    }
    .table-card:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
  `]
})
export class TableSelectionComponent {
  @Input() tables: Table[] = [];
  @Output() tableSelected = new EventEmitter<Table>();

  selectTable(table: Table) {
    this.tableSelected.emit(table);
  }
}