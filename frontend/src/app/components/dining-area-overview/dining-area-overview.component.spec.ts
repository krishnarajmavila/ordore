import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiningAreaOverviewComponent } from './dining-area-overview.component';

describe('DiningAreaOverviewComponent', () => {
  let component: DiningAreaOverviewComponent;
  let fixture: ComponentFixture<DiningAreaOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiningAreaOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DiningAreaOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
