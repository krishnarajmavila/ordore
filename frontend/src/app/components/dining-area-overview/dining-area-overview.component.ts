import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment'; // Update this path as per your project structure

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
}

@Component({
  selector: 'app-dining-area-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="container">
      <h2>Dining Area Overview</h2>
      <div class="table-grid" *ngIf="!isLoading; else loading">
        <mat-card *ngFor="let table of tables" 
                  (click)="selectTable(table)"
                  [class.occupied]="table.isOccupied"
                  [matTooltip]="getTableTooltip(table)">
          <mat-card-content>
            <div class="table-info">
              <mat-icon>restaurant</mat-icon>
              <h3>Table {{table.number}}</h3>
              <p>Capacity: {{table.capacity}}</p>
              <p>OTP: {{table.otp}}</p>
              <mat-icon [class.occupied-icon]="table.isOccupied">
                {{table.isOccupied ? 'people' : 'person_outline'}}
              </mat-icon>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
      <ng-template #loading>
        <p>Loading tables...</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
    }
    .table-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    .table-info {
      text-align: center;
    }
    mat-card {
      cursor: pointer;
      transition: all 0.3s ease;
    }
    mat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 4px 17px rgba(0, 0, 0, 0.35);
    }
    .occupied {
      background-color: #ffebee;
    }
    .occupied-icon {
      color: #f44336;
    }
  `]
})
export class DiningAreaOverviewComponent implements OnInit {
  @Input() tables: Table[] = [];
  @Output() tableSelected = new EventEmitter<Table>();

  isLoading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTablesFromDb();
  }

  selectTable(table: Table) {
    this.tableSelected.emit(table);
  }
  

  getTableTooltip(table: Table): string {
    return `Table ${table.number} - ${table.isOccupied ? 'Occupied' : 'Available'}`;
  }

  private loadTablesFromDb() {
    this.http.get<Table[]>(`${environment.apiUrl}/tables`) // Ensure this endpoint matches your API
      .subscribe({
        next: (tables) => {
          this.tables = tables;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading tables:', error);
          this.isLoading = false;
        }
      });
  }
}
