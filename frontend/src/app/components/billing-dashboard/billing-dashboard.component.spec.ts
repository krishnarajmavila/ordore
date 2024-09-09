import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BillingDashboardComponent } from './billing-dashboard.component';

describe('BillingDashboardComponent', () => {
  let component: BillingDashboardComponent;
  let fixture: ComponentFixture<BillingDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BillingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
