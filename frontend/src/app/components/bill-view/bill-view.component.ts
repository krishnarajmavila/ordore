import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { OrderService, Order } from '../../services/order.service';
import { CustomerService } from '../../services/customer-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BillConfirmationDialogComponent } from '../bill-confirmation-dialog/bill-confirmation-dialog.component';

interface Table {
  _id?: string;
  number: string;
  capacity: number;
  location?: string;
  isOccupied: boolean;
  otp: string;
  otpGeneratedAt: Date;
  hasOrders?: boolean;
}

@Component({
  selector: 'app-bill-view',
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
    MatCheckboxModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './bill-view.component.html',
  styleUrls: ['./bill-view.component.scss']
})
export class BillViewComponent implements OnInit {
  @Output() backToOrderManagement = new EventEmitter<void>();
  @Input() tableOtp: string | null = null;
  @Input() tableNumber: string | null = null;
  
  kotNumber: string;
  orders: Order[] = [];
  selectedOrder: Order | null = null;
  selectedTable: Table | null = null;
  tables: any[] = [];
  showOrderManagement = false;
  isLoading = false;
  billNumber: string = '';
  currentDate: Date = new Date();
  Math = Math;
  billForm: FormGroup;
  isAuthorized: boolean = false;
  confirmBill: boolean = false;
  isBillSaved: boolean = false;
  paymentMethod: string = 'cash';
  notes: string = '';

  constructor(
    private orderService: OrderService,
    public customerService: CustomerService,
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.billForm = this.fb.group({
      restaurantName: ['Ordore - Restaurant', Validators.required],
      companyName: ['(A UNIT OF CLAST ORDORE LLP)', Validators.required],
      addressLine1: ['No. 605, Prestige Shnathinikethan, ITPL', Validators.required],
      addressLine2: ['Hudi Main Road, ITPL', Validators.required],
      addressLine3: ['Next to ICICI Shanthinikethan, ITPL, Bangalore', Validators.required],
      pincode: ['560037', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      gstin: ['55AASFC9301J1WW', [Validators.required]],
      cashierName: ['', Validators.required],
      paymentMethod: ['cash', Validators.required],
      notes: ['']
    });
    this.kotNumber = this.generateKotNumber();
  }

  ngOnInit() {
    if (this.tableOtp) {
      this.checkExistingBill(this.tableOtp);
      this.loadOrdersAndSelectTable(this.tableOtp);
    }
    this.generateBillNumber();

    this.billForm.valueChanges.subscribe(() => {
      console.log('Form valid:', this.billForm.valid);
      console.log('Form values:', this.billForm.value);
    });
  }

  checkExistingBill(tableOtp: string) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`${environment.apiUrl}/bills/check/${tableOtp}`, { headers }).subscribe(
      response => {
        if (response.exists) {
          this.isBillSaved = true;
          this.disableBillForm();
          this.snackBar.open('A bill for this table already exists.', 'Close', { duration: 5000 });
        }
      },
      error => {
        console.error('Error checking existing bill:', error);
        this.snackBar.open('Error checking bill status', 'Close', { duration: 5000 });
      }
    );
  }

  generateBillNumber() {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.billNumber = `BILL-${dateStr}-${randomNum}`;
  }

  loadOrdersAndSelectTable(tableOtp: string) {
    this.isLoading = true;
    this.orderService.getOrdersByTableOtp(tableOtp).subscribe(
      (orders) => {
        this.orders = orders;
        this.selectedTable = this.tables.find(table => table.otp === tableOtp);
        if (!this.selectedTable) {
          console.warn('Table not found for OTP:', tableOtp);
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

  onSelectOrder(order: Order) {
    this.selectedOrder = order;
  }

  getCustomerName() {
    return this.selectedOrder ? this.selectedOrder.customerName : 'N/A';
  }

  getCustomerPhoneNumber() {
    return this.selectedOrder ? this.selectedOrder.phoneNumber : 'N/A';
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

  generateKotNumber() {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `KOT-${dateStr}-${randomNum}`;
  }

  getTotalItems() {
    let totalItems = 0;
    this.orders.forEach(order => {
      order.items.forEach(item => {
        totalItems += item.quantity;
      });
    });
    return totalItems;
  }

  isFormValid(): boolean {
    return this.billForm.valid && !this.isBillSaved;
  }

  updateBill() {
    if (this.isFormValid()) {
      const updatedBillData = this.billForm.value;
      console.log('Bill updated with:', updatedBillData);
      this.updateComponentWithFormData(updatedBillData);
      this.snackBar.open('Bill updated successfully', 'Close', { duration: 3000 });
    } else {
      console.error('Form is invalid or bill is already saved');
      this.snackBar.open('Cannot update: Form is invalid or bill is already saved', 'Close', { duration: 3000 });
    }
  }

  private updateComponentWithFormData(data: any) {
    Object.assign(this, data);
  }
  printBill() {
    const printContents = document.querySelector('.bill-container')?.innerHTML;
  
    // Create a new window for printing
    const popup = window.open('', '_blank', 'width=400,height=600');
    if (popup) {
      popup.document.open();
      popup.document.write(`
        <html>
          <head>
            <title>Bill</title>
            <style>
              /* Add styles for the printed bill */
              body {
                font-family: 'Courier Prime', monospace;
                margin: 0;
                padding: 20px;
                background-color: #fff; /* Set background to white for printing */
                max-width: 400px; /* Ensure body does not exceed this width */
                width: 100%; /* Allow for responsive resizing */
                box-sizing: border-box; /* Include padding in width */
              }
              .bill-container {
                width: 400px !important; /* Set width of the container */
              }
              .bill {
                border: none;
                margin: 0;
                padding: 0;
                box-shadow: none; /* Remove shadow for print */
              }
              .logo {
                text-align: center;
                font-size: 24px;
                margin-bottom: 10px;
              }
              .header {
            text-align: center;
              }
              .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                font-size: 14px;
              }
              .item-details {
                flex-grow: 1;
              }
              .amount {
                text-align: right;
              }
              .total {
                font-weight: bold;
                margin-top: 10px;
              }
              .taxes {
                font-size: 12px;
              }
              .signature {
                margin-top: 20px;
                text-align: center;
              }
              .footer {
                text-align: center;
                font-size: 12px;
                margin-top: 10px;
              }
              .pay-button {
                display: none; /* Hide pay button when printing */
              }
              @media print {
                @page {
                  margin: 0; /* Remove page margin */
                }
                body {
                  margin: 0; /* Remove body margin */
                }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="bill-container">
              ${printContents}
            </div>
          </body>
        </html>
      `);
      popup.document.close();
    }
  }
  onPaymentCompleted() {
    const dialogRef = this.dialog.open(BillConfirmationDialogComponent, {
      width: '250px',
      data: { message: 'Are you sure you want to complete the payment?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveBillToDatabase();
      }
    });
  }

  saveBillToDatabase() {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      this.snackBar.open('Error: Restaurant ID not found', 'Close', { duration: 5000 });
      return;
    }
  
    const billData = {
      billNumber: this.billNumber,
      tableNumber: this.tableNumber,
      tableOtp: this.tableOtp,
      customerName: this.getCustomerName(),
      phoneNumber: this.getCustomerPhoneNumber(),
      items: this.orders.flatMap(order => order.items),
      subTotal: this.subTotal(),
      serviceCharge: this.serviceCharge(),
      gst: this.gst(),
      total: Math.floor(this.total()),
      paymentMethod: this.billForm.get('paymentMethod')?.value,
      cashierName: this.billForm.get('cashierName')?.value,
      restaurantInfo: {
        name: this.billForm.get('restaurantName')?.value,
        companyName: this.billForm.get('companyName')?.value,
        addressLine1: this.billForm.get('addressLine1')?.value,
        addressLine2: this.billForm.get('addressLine2')?.value,
        addressLine3: this.billForm.get('addressLine3')?.value,
        pincode: this.billForm.get('pincode')?.value,
        gstin: this.billForm.get('gstin')?.value,
      },
      kotNumber: this.kotNumber,
      status: 'pending',
      notes: this.billForm.get('notes')?.value,
      date: this.currentDate,
      restaurant: restaurantId  // Add this line
    };
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  
    this.http.post(`${environment.apiUrl}/bills`, billData, { headers }).subscribe(
      response => {
        console.log('Bill saved successfully', response);
        this.confirmBill = true;
        this.isBillSaved = true;
        this.disableBillForm();
        this.snackBar.open('Bill saved successfully', 'Close', { duration: 5000 });
      },
      error => {
        console.error('Error saving bill', error);
        this.snackBar.open('Error saving bill: ' + (error.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
      }
    );
  }
  
  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }

  disableBillForm() {
    this.billForm.disable();
  }
}