import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillConfirmationDialogComponent } from './bill-confirmation-dialog.component';

describe('BillConfirmationDialogComponent', () => {
  let component: BillConfirmationDialogComponent;
  let fixture: ComponentFixture<BillConfirmationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillConfirmationDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BillConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
