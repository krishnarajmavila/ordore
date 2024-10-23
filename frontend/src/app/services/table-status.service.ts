// table-status.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TableStatusService {
  private tableStatusUpdate = new Subject<{ tableOtp: string, paymentCompleted: boolean }>();

  tableStatusUpdate$ = this.tableStatusUpdate.asObservable();

  updateTableStatus(tableOtp: string, paymentCompleted: boolean) {
    this.tableStatusUpdate.next({ tableOtp, paymentCompleted });
  }
}