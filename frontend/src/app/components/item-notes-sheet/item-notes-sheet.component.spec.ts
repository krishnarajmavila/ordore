import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemNotesSheetComponent } from './item-notes-sheet.component';

describe('ItemNotesSheetComponent', () => {
  let component: ItemNotesSheetComponent;
  let fixture: ComponentFixture<ItemNotesSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemNotesSheetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ItemNotesSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
