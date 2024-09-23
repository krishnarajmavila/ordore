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
  number: string;
  capacity: number;
  isOccupied: boolean;
  otp: string;
}

interface ExtendedOrder extends Order {
  tableNumber: string;
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
    BillViewComponent
  ],
  templateUrl: './billing-dashboard.component.html',
  styleUrls: ['./billing-dashboard.component.scss']
})
export class BillingDashboardComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  tables: Table[] = Array(10).fill(0).map((_, i) => ({
    number: (i + 1).toString(),
    capacity: Math.floor(Math.random() * 4) + 2,
    isOccupied: Math.random() > 0.5,
    otp: Math.random().toString(36).substring(7).toUpperCase()
  }));

  selectedTable: Table | null = null;
  currentOrder: ExtendedOrder | null = null;
  billNumber = '34468';
  kotNumber = '123399,123412';
  cashier = 'SHIV RAUT';
  activeView: 'billing' | 'managebill' = 'billing';
  selectedDate: Date = new Date();
  reportData: ReportData = {
    dailyRevenue: 0,
    monthlyRevenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    orderHistory: []
  };

  showOrderCheck = false; // Add this property
  selectedTableOtp: string | null = null; // Add this property

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

  orderChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Order Count',
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }
    ]
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

  private ordersSubscription: Subscription | undefined;

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

  loadReportData() {
    console.log('Loading report data for date:', this.selectedDate);
    this.reportingService.getReportbillData(this.selectedDate).subscribe({
      next: (data) => {
        console.log('Received report data:', data);
        this.reportData = data;
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading report data:', error);
      }
    });
  }

  onTableSelected(table: Table) {
    this.selectedTable = table;
    this.selectedTableOtp = table.otp; // Set selected table OTP
    this.currentOrder = {
      _id: Math.random().toString(36).substr(2, 9),
      items: [
        { name: 'Pizza', price: 12.99, quantity: 1 },
        { name: 'Soda', price: 2.50, quantity: 2 },
      ],
      totalPrice: 17.99,
      customerName: 'John Doe',
      phoneNumber: '123-456-7890',
      tableOtp: table.otp,
      status: 'Pending',
      createdAt: new Date(),
      tableNumber: table.number,
      guestName: 'John Doe',
      date: new Date(),
      steward: 'Jane Smith'
    };
    this.showOrderCheck = true; // Show bill view
  }

  backToOverview() {
    this.selectedTable = null;
    this.currentOrder = null;
    this.showOrderCheck = false; // Hide bill view
  }

  onBackToOrderManagement() {
    this.backToOverview(); // Use existing method to navigate back
  }

  updateCharts() {
    this.revenueChartData = {
      ...this.revenueChartData,
      datasets: [{
        ...this.revenueChartData.datasets[0],
        data: [this.reportData.dailyRevenue, this.reportData.monthlyRevenue]
      }]
    };

    this.orderChartData = {
      ...this.orderChartData,
      labels: this.reportData.orderHistory.map(item => item.date),
      datasets: [{
        ...this.orderChartData.datasets[0],
        data: this.reportData.orderHistory.map(item => item.orderCount)
      }]
    };

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
}
