import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { Order, ReportingService } from '../../services/reporting.service';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subscription } from 'rxjs';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatNativeDateModule, NativeDateAdapter } from '@angular/material/core';

// Define custom date formats if needed
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'LL',
  },
  display: {
    dateInput: 'YYYY-MM-DD',
    monthYearLabel: 'YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'YYYY',
  },
};

@Component({
  selector: 'app-reporting',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    NgChartsModule,
    MatNativeDateModule
  ],
  providers: [
    { provide: DateAdapter, useClass: NativeDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
  ],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent implements OnInit, OnDestroy {
  private ordersSubscription?: Subscription;
  private dataSubscription?: Subscription;
  
  orders: Order[] = [];
  orderStatuses: string[] = ['pending', 'preparing', 'ready', 'completed'];
  ordersByStatus: { [key: string]: number } = {
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0
  };
  
  totalRevenue: number = 3110.50;
  selectedDate: Date = new Date();
  reportStartTime: Date = new Date(2022, 0, 3, 1, 30);
  reportEndTime: Date = new Date(2022, 0, 4, 3, 30);
  closedByName: string = 'Jane Müller';
  closedByAvatar: string = 'path/to/jane-avatar.jpg';

  revenueBreakdown = [
    { amount: 800.50, taxRate: 19, percentage: 25.73, color: '#8B4513' },
    { amount: 1490.00, taxRate: 7, percentage: 47.90, color: '#FFA07A' },
    { amount: 620.00, taxRate: 0, percentage: 19.94, color: '#FFD700' },
    { amount: 400.00, taxRate: 0, percentage: 6.43, color: '#FF8C00' }
  ];

  cashRevenue: number = 18234;
  cashJournalData = [
    { percentage: 20, label: 'cash revenue' },
    { percentage: 30, label: 'card payments' },
    { percentage: 50, label: 'other payment methods' }
  ];

  totalLoss: number = 167;
  improvementAreaData = [
    { value: 23, label: 'removed orders' },
    { value: 15, label: 'refunded orders' },
    { value: 8, label: 'cancelled items' }
  ];

  marketingAmount: number = 637;
  totalWorkingHours: number = 43.77;

  orderStatusChartData: ChartData<'bar'> = {
    labels: this.orderStatuses,
    datasets: [{ data: [], label: 'Order Count' }]
  };

  cashJournalChartData: ChartData<'doughnut'> = {
    labels: this.cashJournalData.map(item => item.label),
    datasets: [{ data: this.cashJournalData.map(item => item.percentage) }]
  };

  improvementAreaChartData: ChartData<'doughnut'> = {
    labels: this.improvementAreaData.map(item => item.label),
    datasets: [{ data: this.improvementAreaData.map(item => item.value) }]
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  doughnutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    cutout: '70%',
    plugins: {
      legend: {
        display: false
      }
    }
  };

  doughnutChartColors: string[] = ['#8B4513', '#FFA07A', '#FFD700'];

  constructor(
    private reportingService: ReportingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadReportData(this.selectedDate);
    this.loadOrders();
  }

  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  onDateChange(event: any) {
    const newDate = event.value;
    console.log('Date changed:', newDate);
    this.loadReportData(newDate);
  }
  loadOrders() {
    this.reportingService.fetchOrders();
    this.ordersSubscription = this.reportingService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.updateOrdersByStatus();
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }
  loadReportData(date: Date) {
    this.dataSubscription = this.reportingService.getReportData(date).subscribe({
      next: (data) => {
        this.updateDashboard(data);
      },
      error: (error) => {
        console.error('Error fetching report data:', error);
        // Handle error (e.g., show error message to user)
      }
    });
  }

  updateDashboard(data: any) {
    console.log('Updating dashboard with data:', data);
    // Update all dashboard properties with new data
    this.totalRevenue = data.totalRevenue;
    this.revenueBreakdown = data.revenueBreakdown;
    this.cashRevenue = data.cashRevenue;
    this.cashJournalData = data.cashJournalData;
    this.totalLoss = data.totalLoss;
    this.improvementAreaData = data.improvementAreaData;
    this.marketingAmount = data.marketingAmount;
    this.totalWorkingHours = data.totalWorkingHours;
    this.orders = data.orders;

    // Update other time-related properties
    this.reportStartTime = new Date(data.reportStartTime);
    this.reportEndTime = new Date(data.reportEndTime);
    this.closedByName = data.closedByName;
    this.closedByAvatar = data.closedByAvatar;

    this.updateOrdersByStatus();
    this.updateCharts();
    this.cdr.detectChanges();
  }

  updateOrdersByStatus() {
    // Reset all status counts
    this.orderStatuses.forEach(status => {
      this.ordersByStatus[status] = 0;
    });

    // Count orders for each status
    this.orders.forEach(order => {
      if (this.ordersByStatus.hasOwnProperty(order.status)) {
        this.ordersByStatus[order.status]++;
      } else {
        console.warn(`Unexpected order status: ${order.status}`);
      }
    });
  }

  getOrderCount(status: string): number {
    return this.ordersByStatus[status] || 0;
  }

  updateCharts() {
    console.log('Updating charts');
    // Update order status chart
    this.orderStatusChartData.datasets[0].data = this.orderStatuses.map(status => this.getOrderCount(status));
    
    // Update cash journal chart
    this.cashJournalChartData.labels = this.cashJournalData.map(item => item.label);
    this.cashJournalChartData.datasets[0].data = this.cashJournalData.map(item => item.percentage);
    
    // Update improvement area chart
    this.improvementAreaChartData.labels = this.improvementAreaData.map(item => item.label);
    this.improvementAreaChartData.datasets[0].data = this.improvementAreaData.map(item => item.value);
  }

  exportReport() {
    console.log('Exporting report for date:', this.selectedDate);
    // Implement export functionality
  }

  closeReport() {
    console.log('Closing report for date:', this.selectedDate);
    // Implement close report functionality
  }
}