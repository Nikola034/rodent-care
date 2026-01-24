import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { ToastModule } from 'primeng/toast';
import { MenuItem, MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth-service';
import { UserRole } from '../../dto/auth/UserRole';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MenubarModule,
    ButtonModule,
    AvatarModule,
    MenuModule,
    SidebarModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: 'layout.html'
})
export class Layout implements OnInit, OnDestroy {
  menuItems: MenuItem[] = [];
  userMenuItems: MenuItem[] = [];
  sidebarVisible = false;

  username: string = '';
  userRole: UserRole | undefined;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.buildMenu();
    this.buildUserMenu();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserInfo(): void {
    this.username = this.authService.getUsernameFromToken() || 'User';
    this.userRole = this.authService.getRoleFromToken();
  }

  private buildMenu(): void {
    this.menuItems = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: '/app'
      },
      {
        label: 'Rodents',
        icon: 'pi pi-heart',
        routerLink: '/app/rodents'
      }
    ];

    // Add admin menu if user is admin
    if (this.authService.isAdmin()) {
      this.menuItems.push({
        label: 'User Management',
        icon: 'pi pi-users',
        routerLink: '/app/users'
      });
    }
  }

  private buildUserMenu(): void {
    this.userMenuItems = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.navigateToProfile()
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
    ];
  }

  toggleSidebar(): void {
    this.sidebarVisible = !this.sidebarVisible;
  }

  navigateToProfile(): void {
    this.router.navigate(['/app/profile']);
  }

  logout(): void {
    this.authService.logout();
    this.messageService.add({
      severity: 'success',
      summary: 'Logged Out',
      detail: 'You have been successfully logged out.',
      life: 3000
    });
  }

  getRoleLabel(): string {
    if (!this.userRole) return '';
    return this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1);
  }

  getAvatarLabel(): string {
    if (!this.username) return 'U';
    return this.username.charAt(0).toUpperCase();
  }
}
