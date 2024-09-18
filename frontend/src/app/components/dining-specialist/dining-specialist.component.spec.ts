import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiningSpecialistComponent } from './dining-specialist.component';

describe('DiningSpecialistComponent', () => {
  let component: DiningSpecialistComponent;
  let fixture: ComponentFixture<DiningSpecialistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiningSpecialistComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DiningSpecialistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
