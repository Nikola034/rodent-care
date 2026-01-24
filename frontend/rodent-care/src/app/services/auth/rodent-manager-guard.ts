import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth-service';
import { Injectable } from '@angular/core';

/**
 * Guard for routes that require rodent management permissions.
 * Allows: Admin, Caretaker, Veterinarian
 */
@Injectable({
  providedIn: 'root'
})
export class RodentManagerGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.canManageRodents()) {
      return true;
    } else {
      this.router.navigate(['/app']);
      return false;
    }
  }
}
