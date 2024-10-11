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
import { ReportingService } from '../../services/reporting.service';
import { OrderService, Order } from '../../services/order.service';
import { WebSocketService } from '../../services/web-socket.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { DiningAreaOverviewComponent } from '../dining-area-overview/dining-area-overview.component';
import { BillViewComponent } from '../bill-view/bill-view.component';
import { OrderManagementComponent } from '../order-management/order-management.component';

interface ReportData {
  dailyRevenue: number;
  monthlyRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  orderHistory: {
    date: string;
    orderCount: number;
  }[];
}

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

interface ExtendedOrder extends Order {
  guestName: string;
  date: Date;
  steward: string;
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
    OrderManagementComponent
  ],
  templateUrl: './billing-dashboard.component.html',
  styleUrls: ['./billing-dashboard.component.scss']
})
export class BillingDashboardComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  tables: Table[] = Array(10).fill(0).map((_, i) => ({
    _id: Math.random().toString(36).substr(2, 9),
    number: (i + 1).toString(),
    capacity: Math.floor(Math.random() * 4) + 2,
    isOccupied: Math.random() > 0.5,
    otp: Math.random().toString(36).substring(7).toUpperCase(),
    otpGeneratedAt: new Date(),
    hasOrders: Math.random() > 0.7,
    restaurant: this.getSelectedRestaurantId() || '' // Add this line
  }));

  selectedTable: Table | null = null;
  currentOrder: ExtendedOrder | null = null;
  billNumber = '34468';
  kotNumber = '123399,123412';
  cashier = 'SHIV RAUT';
  activeView: 'billing' | 'managebill' | 'orders' = 'billing';
  selectedDate: Date = new Date();
  reportData: ReportData = this.getDefaultReportData();

  showOrderCheck = false;
  selectedTableOtp: string | null = null;
  selectedTableNumber: string | null = null;

  revenueChartData: ChartData<'bar'> = {
    labels: ['Daily Revenue', 'Monthly Revenue'],
    datasets: [
      { 
        data: [0, 0], 
        label: 'Revenue',
        backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(54, 162, 235, 0.8)']
      }
    ]
  };

  orderChartData: ChartData<'line'> = this.getDefaultOrderChartData();

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

  private ordersSubscription: Subscription | undefined;

  parcelTable: Table = {
    _id: 'parcel',
    number: 'Parcel',
    capacity: 0,
    isOccupied: false,
    otp: 'PARCEL',
    otpGeneratedAt: new Date(),
    restaurant: this.getSelectedRestaurantId() || '' // Add this line
  };
  constructor(
    private reportingService: ReportingService,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadReportData();
    this.subscribeToOrders();
    this.subscribeToWebSockets();
  }

  ngOnDestroy() {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
  }
  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }
  loadReportData() {
    console.log('Loading report data for date:', this.selectedDate);
    this.reportingService.getReportData(this.selectedDate).subscribe({
      next: (data) => {
        console.log('Received report data:', data);
        this.reportData = data || this.getDefaultReportData();
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading report data:', error);
        this.reportData = this.getDefaultReportData();
        this.updateCharts();
      }
    });
  }

  onTableSelected(table: Table) {
    this.selectedTable = table;
    this.selectedTableOtp = table.otp;
    this.selectedTableNumber = table.number;
    this.showOrderCheck = true;
    this.activeView = 'managebill';

    this.orderService.getOrdersByTableOtp(table.otp).subscribe({
      next: (orders) => {
        if (orders.length > 0) {
          const latestOrder = orders[orders.length - 1];
          this.currentOrder = {
            ...latestOrder,
            guestName: latestOrder.customerName,
            date: new Date(latestOrder.createdAt),
            steward: 'Jane Smith'
          };
        } else {
          this.currentOrder = null;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching orders for table:', error);
        this.currentOrder = null;
        this.cdr.detectChanges();
      }
    });
  }

  onParcelOrderSelected() {
    this.selectedTable = this.parcelTable;
    this.selectedTableOtp = this.parcelTable.otp;
    this.selectedTableNumber = this.parcelTable.number;
    this.showOrderCheck = true;
    this.activeView = 'orders';
  }

  onViewOrders(tableOtp: string) {
    // Implement the logic to view orders for the given tableOtp
    console.log('Viewing orders for table OTP:', tableOtp);
    // You might want to navigate to a different component or update the current view
  }

  backToOverview() {
    this.selectedTable = null;
    this.currentOrder = null;
    this.showOrderCheck = false;
    this.selectedTableNumber = null;
    this.activeView = 'managebill';
  }

  onBackToOrderManagement() {
    this.backToOverview();
  }

  updateCharts() {
    if (!this.reportData) {
      console.error('Report data is undefined');
      return;
    }

    this.revenueChartData = {
      ...this.revenueChartData,
      datasets: [{
        ...this.revenueChartData.datasets[0],
        data: [
          this.reportData.dailyRevenue || 0,
          this.reportData.monthlyRevenue || 0
        ]
      }]
    };

    if (this.reportData.orderHistory && Array.isArray(this.reportData.orderHistory)) {
      this.orderChartData = {
        ...this.orderChartData,
        labels: this.reportData.orderHistory.map(item => item.date),
        datasets: [{
          ...this.orderChartData.datasets[0],
          data: this.reportData.orderHistory.map(item => item.orderCount)
        }]
      };
    } else {
      console.warn('Order history is missing or not an array');
      this.orderChartData = this.getDefaultOrderChartData();
    }

    this.cdr.detectChanges();

    if (this.chart && this.chart.chart) {
      this.chart.chart.update();
    }
  }

  subscribeToOrders() {
    this.ordersSubscription = this.orderService.getOrders().subscribe({
      next: (orders: Order[]) => {
        console.log('Received orders:', orders);
      },
      error: (error) => {
        console.error('Error subscribing to orders:', error);
      }
    });
  }

  subscribeToWebSockets() {
    this.webSocketService.listen('orderUpdate').subscribe((updatedOrder: any) => {
      console.log('Received order update:', updatedOrder);
      this.loadReportData();
    });
  }

  onDateChange(event: any) {
    console.log('Date changed to:', event.value);
    this.selectedDate = event.value;
    this.loadReportData();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private getDefaultReportData(): ReportData {
    return {
      dailyRevenue: 0,
      monthlyRevenue: 0,
      orderCount: 0,
      averageOrderValue: 0,
      orderHistory: []
    };
  }

  private getDefaultOrderChartData(): ChartData<'line'> {
    return {
      labels: [],
      datasets: [{
        data: [],
        label: 'Order Count',
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  }
}