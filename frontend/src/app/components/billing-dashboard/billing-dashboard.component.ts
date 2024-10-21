import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { ReportingService, DailyReport, WeeklyReport, MostOrderedItem, Bill } from '../../services/reporting.service';
import { OrderService, Order } from '../../services/order.service';
import { WebSocketService } from '../../services/web-socket.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { DiningAreaOverviewComponent } from '../dining-area-overview/dining-area-overview.component';
import { BillViewComponent } from '../bill-view/bill-view.component';
import { ParcelOrderComponent } from '../parcel-order/parcel-order.component';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  location?: string;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  hasOrders?: boolean;
  waiterCalled?: boolean;
  paymentCompleted?: boolean;
  restaurant: string;
  isPayInitiated?: boolean;
  paymentType?: string;
  orders?: Order[];
}

@Component({
  selector: 'app-billing-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    NgChartsModule,
    DiningAreaOverviewComponent,
    BillViewComponent,
    ParcelOrderComponent
  ],
  templateUrl: './billing-dashboard.component.html',
  styleUrls: ['./billing-dashboard.component.scss']
})
export class BillingDashboardComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  tables: Table[] = [];
  selectedTable: Table | null = null;
  activeView: 'billing' | 'managebill' | 'orders' = 'billing';
  selectedDate: Date = new Date();
  restaurantId: string = ''; // You need to set this based on the logged-in user's restaurant

  dailyReport: DailyReport | null = null;
  weeklyReport: WeeklyReport | null = null;
  mostOrderedItems: MostOrderedItem[] = [];
  recentBills: Bill[] = [];

  showOrderCheck = false;
  selectedTableOtp: string | null = null;
  selectedTableNumber: string | null = null;

  revenueChartData: ChartData<'bar'> = {
    labels: ['Daily Revenue', 'Weekly Revenue'],
    datasets: [
      { 
        data: [0, 0], 
        label: 'Revenue',
        backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)']
      }
    ]
  };

  orderChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Order Count',
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount ($)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Order Count'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    }
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private reportingService: ReportingService,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.restaurantId = this.getSelectedRestaurantId();
    this.loadReports();
    this.setupRealtimeBillUpdates();
    this.subscribeToWebSockets();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.reportingService.stopRealTimeBillsRefresh();
  }

  private getSelectedRestaurantId(): string {
    // Implement this method to get the restaurant ID from wherever it's stored
    // (e.g., localStorage, a service, etc.)
    return localStorage.getItem('selectedRestaurantId') || '';
  }

  loadReports() {
    this.subscriptions.push(
      this.reportingService.getDailyReport(this.selectedDate, this.restaurantId).subscribe(
        report => {
          this.dailyReport = report;
          this.updateRevenueChart();
        },
        error => console.error('Error fetching daily report:', error)
      ),
      this.reportingService.getWeeklyReport(this.restaurantId).subscribe(
        report => {
          this.weeklyReport = report;
          this.updateOrderChart();
        },
        error => console.error('Error fetching weekly report:', error)
      ),
      this.reportingService.getMostOrderedItems(this.restaurantId).subscribe(
        items => this.mostOrderedItems = items,
        error => console.error('Error fetching most ordered items:', error)
      )
    );
  }

  setupRealtimeBillUpdates() {
    this.reportingService.startRealTimeBillsRefresh();
    this.subscriptions.push(
      this.reportingService.getRealTimeBills().subscribe(
        bills => this.recentBills = bills
      )
    );
  }

  subscribeToWebSockets() {
    this.subscriptions.push(
      this.webSocketService.listen('orderUpdate').subscribe(() => {
        this.loadReports();
      }),
      this.webSocketService.listen('newBill').subscribe(() => {
        this.loadReports();
      })
    );
  }

  onTableSelected(table: Table) {
    this.selectedTable = table;
    this.selectedTableOtp = table.otp;
    this.selectedTableNumber = table.number;
    this.showOrderCheck = true;
    this.activeView = 'managebill';
  }

  onParcelOrderSelected() {
    this.activeView = 'orders';
  }

  onDateChange(event: any) {
    this.selectedDate = event.value;
    this.loadReports();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private updateRevenueChart() {
    if (this.dailyReport && this.weeklyReport) {
      this.revenueChartData.datasets[0].data = [
        this.dailyReport.dailyRevenue,
        this.weeklyReport.totalRevenue
      ];
      this.chart?.update();
    }
  }

  private updateOrderChart() {
    if (this.weeklyReport && this.weeklyReport.dailyOrderCounts) {
      const dates = Object.keys(this.weeklyReport.dailyOrderCounts);
      const counts = Object.values(this.weeklyReport.dailyOrderCounts);
      
      this.orderChartData.labels = dates;
      this.orderChartData.datasets[0].data = counts;
      
      this.chart?.update();
    }
  }

  onBackToOrderManagement() {
    this.selectedTable = null;
    this.showOrderCheck = false;
    this.selectedTableNumber = null;
    this.activeView = 'managebill';
  }
}