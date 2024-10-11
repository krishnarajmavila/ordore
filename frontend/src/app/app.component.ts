import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { filter, interval } from 'rxjs';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {
  // constructor(private authService: AuthService) {}

  // ngOnInit() {
  //   interval(300000).subscribe(() => {
  //     if (this.authService.isLoggedIn()) {
  //       this.authService.refreshToken().subscribe();
  //     }
  //   });
  // }

  constructor(private swUpdate: SwUpdate, private snackBar: MatSnackBar) {}

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      // Check for updates on initial load
      this.swUpdate.checkForUpdate();

      // Check for updates every 6 hours
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 6 * 60 * 60 * 1000);

      // Show snackbar when a new version is available
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          const snack = this.snackBar.open('A new version is available. Update it?', 'Update', {
            duration: 6000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });

          snack.onAction().subscribe(() => {
            window.location.reload();
          });
        });
    }
  }
}