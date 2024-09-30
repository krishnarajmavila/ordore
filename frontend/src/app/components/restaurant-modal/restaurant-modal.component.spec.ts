import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantModalComponent } from './restaurant-modal.component';

describe('RestaurantModalComponent', () => {
  let component: RestaurantModalComponent;
  let fixture: ComponentFixture<RestaurantModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RestaurantModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
