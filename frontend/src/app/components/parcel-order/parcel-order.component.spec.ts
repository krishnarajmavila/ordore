import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParcelOrderComponent } from './parcel-order.component';

describe('ParcelOrderComponent', () => {
  let component: ParcelOrderComponent;
  let fixture: ComponentFixture<ParcelOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParcelOrderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ParcelOrderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
