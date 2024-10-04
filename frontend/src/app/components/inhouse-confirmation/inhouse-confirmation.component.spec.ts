import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InhouseConfirmationComponent } from './inhouse-confirmation.component';

describe('InhouseConfirmationComponent', () => {
  let component: InhouseConfirmationComponent;
  let fixture: ComponentFixture<InhouseConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InhouseConfirmationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InhouseConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
