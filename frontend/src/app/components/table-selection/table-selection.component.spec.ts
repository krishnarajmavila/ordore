import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableSelectionComponent } from './table-selection.component';

describe('TableSelectionComponent', () => {
  let component: TableSelectionComponent;
  let fixture: ComponentFixture<TableSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TableSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});