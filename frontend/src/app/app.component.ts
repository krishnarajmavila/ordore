import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { interval } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {
  constructor(private authService: AuthService) {}

  // ngOnInit() {
  //   interval(300000).subscribe(() => {
  //     if (this.authService.isLoggedIn()) {
  //       this.authService.refreshToken().subscribe();
  //     }
  //   });
  // }
}