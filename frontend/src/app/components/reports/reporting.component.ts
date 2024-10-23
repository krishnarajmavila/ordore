import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ChangeDetectionStrategy, AfterViewInit, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { BaseChartDirective, NgChartsModule } from 'ng2-charts';
import { Chart, ChartConfiguration, ChartData } from 'chart.js';
import { ReportingService } from '../../services/reporting.service';
import { WebSocketService } from '../../services/web-socket.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

interface DailyReport {
  dailyRevenue: number;
  monthlyRevenue: number;
  monthlyBillCount: number;
  averageBillValue: number;
  topSellingItems: TopSellingItem[];
}

interface WeeklyReport {
  dailyOrderCounts: { [key: string]: number };
}

interface TopSellingItem {
  _id: string;
  totalQuantity: number;
  totalRevenue: number;
}

@Component({
  selector: 'app-reporting',
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
    NgChartsModule
  ],
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  @Input() restaurantId: string = '';
  dateControl = new FormControl(new Date());
  selectedDate: Date = new Date();
  isLoading = true;
  error: string | null = null;
  dailyReport: DailyReport | null = null;
  weeklyReport: WeeklyReport | null = null;

  revenueChartData: ChartData<'bar', number[], string> = {
    labels: ['Daily Revenue', 'Monthly Revenue'],
    datasets: [{
      data: [0, 0],
      label: 'Revenue',
      backgroundColor: ['rgba(255, 99, 132, 0.8)', 'rgba(233, 201, 0, 0.8)']
    }]
  };

  orderChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Daily Orders',
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.4,
      fill: true,
      pointStyle: 'circle',
      pointRadius: 4,
      pointHoverRadius: 6
    }]
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
        }
      }
    },
    plugins: {
      legend: {
        display: false
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
    }
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private reportingService: ReportingService,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('ReportingComponent initialized with restaurantId:', this.restaurantId);
    
    this.subscriptions.push(
      this.dateControl.valueChanges.subscribe(date => {
        if (date && this.restaurantId) {
          this.selectedDate = date;
          this.loadReports();
        }
      })
    );

    if (this.restaurantId) {
      this.loadReports();
      this.setupWebSocketSubscriptions();
    } else {
      this.error = 'No restaurant selected';
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.updateCharts();
      this.cdr.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('ReportingComponent changes:', changes);
    if (changes['restaurantId']) {
      console.log('Restaurant ID changed to:', changes['restaurantId'].currentValue);
      if (changes['restaurantId'].currentValue) {
        this.error = null;
        this.isLoading = true;
        this.loadReports();
      } else {
        this.error = 'No restaurant selected';
        this.isLoading = false;
      }
    }
  }

  private loadReports() {
    if (!this.restaurantId) {
      console.error('Attempted to load reports without restaurant ID');
      return;
    }

    this.isLoading = true;
    this.error = null;
    
    this.loadDailyReport();
    this.loadWeeklyReport();
  }

  private loadDailyReport() {
    const sub = this.reportingService.getDailyReport(this.selectedDate, this.restaurantId).subscribe({
      next: (report) => {
        this.dailyReport = report;
        this.updateRevenueChart();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading daily report:', error);
        this.error = 'Failed to load daily report';
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  private loadWeeklyReport() {
    const sub = this.reportingService.getWeeklyReport(this.restaurantId).subscribe({
      next: (report) => {
        this.weeklyReport = report;
        this.updateOrderChart();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading weekly report:', error);
        this.error = this.error || 'Failed to load weekly report';
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.push(sub);
  }

  private updateCharts() {
    this.updateRevenueChart();
    this.updateOrderChart();
  }

  private updateRevenueChart() {
    if (this.dailyReport) {
      this.revenueChartData.datasets[0].data = [
        this.dailyReport.dailyRevenue,
        this.dailyReport.monthlyRevenue
      ];
      if (this.chart) {
        this.chart.chart?.update();
      }
    }
  }

  private updateOrderChart() {
    if (this.weeklyReport?.dailyOrderCounts) {
      const sortedDates = Object.keys(this.weeklyReport.dailyOrderCounts).sort();
      const counts = sortedDates.map(date => this.weeklyReport!.dailyOrderCounts[date]);
      
      this.orderChartData.labels = sortedDates.map(date => 
        new Date(date).toLocaleDateString('en-IN', {
          month: 'short',
          day: 'numeric'
        })
      );
      
      if (this.orderChartData.datasets?.[0]) {
        this.orderChartData.datasets[0].data = counts;
      }

      if (this.chart) {
        this.chart.chart?.update();
      }
    }
  }

  private setupWebSocketSubscriptions() {
    const orderSub = this.webSocketService.listen('orderUpdate').subscribe(() => {
      this.loadReports();
    });
    this.subscriptions.push(orderSub);
  }

  onDateChange(event: any) {
    this.selectedDate = event.value;
    this.loadReports();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}