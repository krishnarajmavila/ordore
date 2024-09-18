import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuItem } from './menu.service';

@Injectable({
  providedIn: 'root'
})
export class MenuUpdateService {
  private menuUpdateSubject = new Subject<MenuItem>();

  menuUpdate$ = this.menuUpdateSubject.asObservable();

  emitMenuUpdate(updatedItem: MenuItem) {
    this.menuUpdateSubject.next(updatedItem);
  }
}