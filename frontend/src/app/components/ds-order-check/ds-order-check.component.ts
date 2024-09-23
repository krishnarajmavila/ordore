import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { OrderService, Order } from '../../services/order.service';
import { CustomerService } from '../../services/customer-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule } from '@angular/forms';
import { TableSelectionComponent } from '../table-selection/table-selection.component';
import { OrderManagementComponent } from '../order-management/order-management.component';

@Component({
  selector: 'app-ds-order-check',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTabsModule,
    TableSelectionComponent,
    OrderManagementComponent
  ],
  templateUrl: './ds-order-check.component.html',
  styleUrls: ['./ds-order-check.component.scss']
})
export class DsOrderCheckComponent implements OnInit {
  @Output() backToOrderManagement = new EventEmitter<void>();
  @Input() tableOtp: string | null = null;
  
  orders: Order[] = [];
  selectedTable: any = null;
  tables: any[] = [];
  showOrderManagement = false;
  isLoading = false;

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService,
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (this.tableOtp) {
      this.loadOrdersAndSelectTable(this.tableOtp);
    }
  }

  loadOrdersAndSelectTable(tableOtp: string) {
    this.isLoading = true;
    this.orderService.getOrdersByTableOtp(tableOtp).subscribe(
      (orders) => {
        this.orders = orders;
        this.selectedTable = this.tables.find(table => table.otp === tableOtp);
        if (!this.selectedTable) {
          // If table is not found in the existing list, create a temporary one
          this.selectedTable = { otp: tableOtp };
        }
        this.showOrderManagement = true;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching orders:', error);
        this.isLoading = false;
      }
    );
  }

  onTableSelected(table: any) {
    this.selectedTable = table;
    this.showOrderManagement = true;
    this.loadOrdersAndSelectTable(table.otp);
  }

  onBackToTableSelection() {
    this.selectedTable = null;
    this.showOrderManagement = false;
    this.backToOrderManagement.emit();
  }

  lookDashboard() {
    this.backToOrderManagement.emit();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['login']);
  }

  subTotal() {
    let total = 0;
    this.orders.forEach(order => {
      order.items.forEach(item => {
        total += item.price * item.quantity;
      });
    });
    return total;
  }

  serviceCharge() {
    return this.subTotal() * 0.05;
  }

  gst() {
    return this.subTotal() * 0.05;
  }

  total() {
    return this.subTotal() + this.serviceCharge() + this.gst();
  }

  goBack() {
    this.backToOrderManagement.emit();
  }
}