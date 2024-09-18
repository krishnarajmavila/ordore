import { TestBed } from '@angular/core/testing';

import { MenuUpdateService } from './menu-update.service';

describe('MenuUpdateService', () => {
  let service: MenuUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MenuUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
