import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ChangeDetectionStrategy, AfterViewInit } from '@angular/core';
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
import { 
  ReportingService, 
  DailyReport, 
  WeeklyReport, 
  TopSellingItem,
  Bill 
} from '../../services/reporting.service';
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
  styleUrls: ['./billing-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BillingDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  @ViewChild(ParcelOrderComponent) parcelOrderComponent?: ParcelOrderComponent;
  // Basic component properties
  tables: Table[] = [];
  selectedTable: Table | null = null;
  activeView: 'billing' | 'managebill' | 'orders' = 'billing';
  selectedDate: Date = new Date();
  restaurantId: string = '';
  isLoading = true;
  error: string | null = null;

  // Report data
  dailyReport: DailyReport | null = null;
  weeklyReport: WeeklyReport | null = null;
  topSellingItems: TopSellingItem[] = [];
  recentBills: Bill[] = [];

  // Table properties
  showOrderCheck = false;
  selectedTableOtp: string | null = null;
  selectedTableNumber: string | null = null;
  displayedColumns: string[] = ['name', 'quantity', 'revenue', 'averagePrice'];

  // Chart configurations
  revenueChartData: ChartData<'bar', number[], string> = {
    labels: ['Daily Revenue', 'Monthly Revenue'],
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
    datasets: [
      {
        data: [],
        label: 'Daily Orders',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true,
        pointStyle: 'circle',
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Amount (₹)'
        },
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString();
          }
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
              label += '₹' + context.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
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
        display: true
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };

  private subscriptions: Array<Subscription & { subType?: string }> = [];

  constructor(
    private reportingService: ReportingService,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('Component initializing...');
    this.restaurantId = this.getSelectedRestaurantId();
    this.initializeData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updateCharts();
      this.cdr.detectChanges();
    });
  }

  private initializeData(): void {
    this.isLoading = true;
    this.loadReports();
    this.setupRealtimeBillUpdates();
    this.subscribeToWebSockets();
    this.cdr.detectChanges();
  }

  private getSelectedRestaurantId(): string {
    return localStorage.getItem('selectedRestaurantId') || '';
  }

  loadReports(): void {
    this.loadDailyReport();
    this.loadWeeklyReport();
    this.loadTopSellingItems();
  }

  private loadDailyReport(): void {
    const existingSub = this.subscriptions.find(sub => sub.subType === 'dailyReport');
    if (existingSub) {
      const index = this.subscriptions.indexOf(existingSub);
      existingSub.unsubscribe();
      this.subscriptions.splice(index, 1);
    }

    const dailySub = this.reportingService.getDailyReport(this.selectedDate, this.restaurantId).subscribe({
      next: (report) => {
        console.log('Daily Report Updated:', report);
        this.dailyReport = report;
        this.updateRevenueChart();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching daily report:', error);
        this.error = 'Failed to load daily report';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });

    Object.defineProperty(dailySub, 'subType', { value: 'dailyReport', writable: false });
    this.subscriptions.push(dailySub);
  }

  private loadWeeklyReport(): void {
    const weeklySub = this.reportingService.getWeeklyReport(this.restaurantId).subscribe({
      next: (report) => {
        console.log('Weekly Report:', report);
        this.weeklyReport = report;
        this.updateOrderChart();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching weekly report:', error);
        this.cdr.markForCheck();
      }
    });

    Object.defineProperty(weeklySub, 'subType', { value: 'weeklyReport', writable: false });
    this.subscriptions.push(weeklySub);
  }

  private loadTopSellingItems(): void {
    const itemsSub = this.reportingService.getMostOrderedItems(this.restaurantId).subscribe({
      next: (items) => {
        console.log('Top Selling Items:', items);
        this.topSellingItems = items;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching top selling items:', error);
        this.topSellingItems = [];
        this.cdr.markForCheck();
      }
    });

    Object.defineProperty(itemsSub, 'subType', { value: 'mostOrderedItems', writable: false });
    this.subscriptions.push(itemsSub);
  }

  setupRealtimeBillUpdates(): void {
    this.reportingService.startRealTimeBillsRefresh();
    const billsSub = this.reportingService.getRealTimeBills().subscribe({
      next: (bills) => {
        console.log('Real-time Bills:', bills);
        const selectedDateStr = this.formatDateForApi(this.selectedDate);
        this.recentBills = bills.filter(bill => {
          const billDate = this.formatDateForApi(new Date(bill.createdAt));
          return billDate === selectedDateStr;
        });
        this.loadDailyReport();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error getting real-time bills:', error);
        this.cdr.markForCheck();
      }
    });

    Object.defineProperty(billsSub, 'subType', { value: 'bills', writable: false });
    this.subscriptions.push(billsSub);
  }

  private updateCharts(): void {
    this.updateRevenueChart();
    this.updateOrderChart();
    this.cdr.markForCheck();
  }

  private updateRevenueChart(): void {
    if (this.dailyReport) {
      this.revenueChartData.datasets[0].data = [
        this.dailyReport.dailyRevenue || 0,
        this.dailyReport.monthlyRevenue || 0
      ];

      if (this.chart) {
        this.chart.chart?.update('active');
      }
      this.cdr.markForCheck();
    }
  }

  private updateOrderChart(): void {
    if (this.weeklyReport?.dailyOrderCounts) {
      // Sort dates to ensure chronological order
      const sortedDates = Object.keys(this.weeklyReport.dailyOrderCounts).sort();
      const counts = sortedDates.map(date => this.weeklyReport!.dailyOrderCounts[date]);

      // Format dates for display
      const formattedDates = sortedDates.map(date => 
        new Date(date).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        })
      );

      // Update chart data
      this.orderChartData.labels = formattedDates;
      if (this.orderChartData.datasets && this.orderChartData.datasets[0]) {
        this.orderChartData.datasets[0].data = counts;
      }

      console.log('Updated chart data:', {
        labels: this.orderChartData.labels,
        data: this.orderChartData.datasets[0].data
      });

      // Ensure chart updates
      if (this.chart) {
        this.chart.update();
      }
      this.cdr.markForCheck();
    }
  }

  subscribeToWebSockets(): void {
    const orderUpdateSub = this.webSocketService.listen('orderUpdate').subscribe({
      next: () => {
        console.log('Order Update Received');
        this.loadDailyReport();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('WebSocket order update error:', error);
        this.cdr.markForCheck();
      }
    });

    const newBillSub = this.webSocketService.listen('newBill').subscribe({
      next: () => {
        console.log('New Bill Received');
        this.loadDailyReport();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('WebSocket new bill error:', error);
        this.cdr.markForCheck();
      }
    });

    this.subscriptions.push(orderUpdateSub, newBillSub);
  }

  onTableSelected(table: Table): void {
    console.log('Selected Table:', table);
    this.selectedTable = table;
    this.selectedTableOtp = table.otp;
    this.selectedTableNumber = table.number;
    this.showOrderCheck = true;
    this.activeView = 'managebill';
    this.cdr.markForCheck();
  }

  onParcelOrderSelected(): void {
    console.log('Parcel Order Selected');
    this.activeView = 'orders';
    setTimeout(() => {
      if (this.parcelOrderComponent) {
        this.parcelOrderComponent.initializeComponent();
      }
    });
    this.cdr.markForCheck();
  }

  onDateChange(event: any): void {
    console.log('Date Changed:', event.value);
    this.selectedDate = event.value;
    this.isLoading = true;
    this.loadDailyReport();
    this.loadTopSellingItems();
    this.cdr.markForCheck();
  }

  onBackToOrderManagement(): void {
    console.log('Navigating back to Order Management');
    this.selectedTable = null;
    this.showOrderCheck = false;
    this.selectedTableNumber = null;
    this.activeView = 'managebill';
    this.cdr.markForCheck();
  }

  private formatDateForApi(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-IN').format(value);
  }

  calculatePercentage(value: number, total: number): string {
    if (!total) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    console.log('Component destroying...');
    this.subscriptions.forEach(sub => {
      if (sub) {
        sub.unsubscribe();
      }
    });
    this.reportingService.stopRealTimeBillsRefresh();
    this.cdr.detach();
  }

  refreshData(): void {
    console.log('Refreshing dashboard data...');
    this.isLoading = true;
    this.error = null;
    this.loadReports();
    this.cdr.markForCheck();
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isToday(date: Date | string): boolean {
    const today = new Date();
    const compareDate = new Date(date);
    return (
      compareDate.getDate() === today.getDate() &&
      compareDate.getMonth() === today.getMonth() &&
      compareDate.getFullYear() === today.getFullYear()
    );
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-success';
      case 'pending':
        return 'text-warning';
      case 'cancelled':
        return 'text-danger';
      default:
        return '';
    }
  }

  getTotalAmount(): number {
    return this.recentBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
  }

  getAverageAmount(): number {
    if (this.recentBills.length === 0) return 0;
    return this.getTotalAmount() / this.recentBills.length;
  }

  resetView(): void {
    this.activeView = 'billing';
    this.selectedTable = null;
    this.selectedTableOtp = null;
    this.selectedTableNumber = null;
    this.showOrderCheck = false;
    this.loadReports();
    this.cdr.markForCheck();
  }

  trackByFn(index: number, item: any): any {
    return item._id || index;
  }
}