import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DsOrderCheckComponent } from './ds-order-check.component';

describe('DsOrderCheckComponent', () => {
  let component: DsOrderCheckComponent;
  let fixture: ComponentFixture<DsOrderCheckComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DsOrderCheckComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DsOrderCheckComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
