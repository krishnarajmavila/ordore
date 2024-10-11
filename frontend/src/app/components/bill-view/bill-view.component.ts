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
import { TableStatusService } from '../../services/table-status.service';
import { WebSocketService } from '../../services/web-socket.service';

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
  paymentCompleted: boolean = false;
  billId: string | null = null;
  billExists: boolean = false;

  constructor(
    private orderService: OrderService,
    public customerService: CustomerService,
    private router: Router,
    private authService: AuthService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private tableStatusService: TableStatusService,
    private webSocketService: WebSocketService
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
    const restaurantId = this.getSelectedRestaurantId();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`${environment.apiUrl}/bills/check/${tableOtp}?restaurantId=${restaurantId}`, { headers }).subscribe(
      response => {
        if (response.exists) {
          this.billExists = true;
          this.isBillSaved = true;
          this.paymentCompleted = response.status === 'paid';
          this.billId = response.billId;
          
          if (this.billId) {
            this.fetchBillDetails(this.billId);
          }
          
          this.billForm.get('cashierName')?.disable();
          
          if (this.paymentCompleted) {
            this.disableBillForm();
          }
          
          this.snackBar.open(`A bill for this table already exists. Status: ${response.status}`, 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top'
          });
        } else {
          this.resetBillState();
        }
      },
      error => {
        console.error('Error checking existing bill:', error);
        this.snackBar.open('Error checking bill status', 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    );
  }

  resetBillState() {
    this.billExists = false;
    this.isBillSaved = false;
    this.paymentCompleted = false;
    this.billId = null;
    this.billForm.enable();
    this.billForm.reset({
      restaurantName: 'Ordore - Restaurant',
      companyName: '(A UNIT OF CLAST ORDORE LLP)',
      addressLine1: 'No. 605, Prestige Shnathinikethan, ITPL',
      addressLine2: 'Hudi Main Road, ITPL',
      addressLine3: 'Next to ICICI Shanthinikethan, ITPL, Bangalore',
      pincode: '560037',
      gstin: '55AASFC9301J1WW',
      cashierName: '',
      paymentMethod: 'cash',
      notes: ''
    });
  }

  fetchBillDetails(billId: string) {
    const restaurantId = this.getSelectedRestaurantId();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`${environment.apiUrl}/bills/${billId}?restaurantId=${restaurantId}`, { headers }).subscribe(
      billDetails => {
        this.populateFormWithBillDetails(billDetails);
      },
      error => {
        console.error('Error fetching bill details:', error);
        this.snackBar.open('Error fetching bill details', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
      }
    );
  }

  populateFormWithBillDetails(billDetails: any) {
    this.billForm.patchValue({
      restaurantName: billDetails.restaurantInfo.name,
      companyName: billDetails.restaurantInfo.companyName,
      addressLine1: billDetails.restaurantInfo.addressLine1,
      addressLine2: billDetails.restaurantInfo.addressLine2,
      addressLine3: billDetails.restaurantInfo.addressLine3,
      pincode: billDetails.restaurantInfo.pincode,
      gstin: billDetails.restaurantInfo.gstin,
      cashierName: billDetails.cashierName,
      paymentMethod: billDetails.paymentMethod,
      notes: billDetails.notes
    });

    this.billNumber = billDetails.billNumber;
    this.kotNumber = billDetails.kotNumber;
    this.currentDate = new Date(billDetails.date);
    
    if (billDetails.status === 'paid') {
      this.paymentCompleted = true;
      this.disableBillForm();
    } else {
      this.billForm.disable();
    }

    if (billDetails.items && Array.isArray(billDetails.items)) {
      this.orders = [{
        _id: billDetails._id,
        items: billDetails.items,
        totalPrice: billDetails.total,
        customerName: billDetails.customerName,
        phoneNumber: billDetails.phoneNumber,
        tableOtp: billDetails.tableOtp,
        tableNumber: billDetails.tableNumber,
        status: billDetails.status,
        createdAt: new Date(billDetails.date),
        restaurant: billDetails.restaurant
      }];
    }
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
    return this.billForm.valid && !this.paymentCompleted && !this.billExists && this.hasOrders();
  }

  hasOrders(): boolean {
    return this.orders.length > 0 && this.orders.some(order => order.items.length > 0);
  }

  updateBill() {
    if (this.isFormValid()) {
      this.saveBillToDatabase();
    } else {
      console.error('Form is invalid or payment is completed');
      this.snackBar.open('Cannot update: Form is invalid or payment is completed', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
    }
  }

  printBill() {
    const printContents = document.querySelector('.bill-container')?.innerHTML;
    // ... (rest of the printBill method remains the same)
  }

  onPaymentCompleted() {
    const dialogRef = this.dialog.open(BillConfirmationDialogComponent, {
      width: '250px',
      data: { message: 'Are you sure you want to complete the payment?' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateBillStatus('paid');
      }
    });
  }

  updateBillStatus(status: string) {
    if (!this.billId) {
      this.snackBar.open('Error: Bill ID not found', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
      return;
    }
  
    const restaurantId = this.getSelectedRestaurantId();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  
    this.http.patch(`${environment.apiUrl}/bills/${this.billId}`, { status, restaurantId }, { headers }).subscribe(
      response => {
        console.log('Bill status updated successfully', response);
        this.paymentCompleted = status === 'paid';
        this.disableBillForm();
        if (this.paymentCompleted && this.tableOtp) {
          this.tableStatusService.updateTableStatus(this.tableOtp, this.paymentCompleted);
          this.webSocketService.emit('paymentCompleted', { tableOtp: this.tableOtp, restaurantId });
        }
        this.snackBar.open(`Bill ${status === 'paid' ? 'paid' : 'updated'} successfully`, 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
      },
      error => {
        console.error('Error updating bill status', error);
        this.snackBar.open('Error updating bill status: ' + (error.error?.message || 'Unknown error'), 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
      }
    );
  }
  
  saveBillToDatabase() {
    const restaurantId = this.getSelectedRestaurantId();
    if (!restaurantId) {
      this.snackBar.open('Error: Restaurant ID not found', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
      return;
    }
    if (!this.hasOrders()) {
      this.snackBar.open('Cannot save bill: No orders found', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
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
      restaurant: restaurantId
    };
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
  
    if (this.billId) {
      // Update existing bill
      this.http.patch(`${environment.apiUrl}/bills/${this.billId}`, billData, { headers }).subscribe(
        response => {
          console.log('Bill updated successfully', response);
          this.snackBar.open('Bill updated successfully', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
        },
        error => {
          console.error('Error updating bill', error);
          this.snackBar.open('Error updating bill: ' + (error.error?.message || 'Unknown error'), 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
        }
      );
    } else {
      // Create new bill
      this.http.post(`${environment.apiUrl}/bills`, billData, { headers }).subscribe(
        response => {
          console.log('Bill saved successfully', response);
          this.confirmBill = true;
          this.isBillSaved = true;
          this.billId = (response as any)._id;
          this.disableBillForm();
          this.snackBar.open('Bill saved successfully', 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
        },
        error => {
          console.error('Error saving bill', error);
          this.snackBar.open('Error saving bill: ' + (error.error?.message || 'Unknown error'), 'Close', { duration: 5000, horizontalPosition: 'center', verticalPosition: 'top' });
        }
      );
    }
  }
  
  private getSelectedRestaurantId(): string | null {
    return localStorage.getItem('selectedRestaurantId');
  }
  
  disableBillForm() {
    if (this.paymentCompleted) {
      this.billForm.disable();
    } else {
      // Keep the form enabled but mark it as saved
      this.billForm.enable();
      this.billForm.get('cashierName')?.disable(); // Optionally disable cashier name field
    }
    this.isBillSaved = true;
    this.confirmBill = true;
  }
}