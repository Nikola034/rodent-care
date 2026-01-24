import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { UserService } from '../../../services/user/user-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  UserResponse,
  UserRole,
  UserStatus,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  getRoleSeverity,
  getStatusSeverity
} from '../../../dto/auth';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: 'user-management.html'
})
export class UserManagement implements OnInit, OnDestroy {
  users: UserResponse[] = [];
  isLoading = true;

  // Role change dialog
  showRoleDialog = false;
  selectedUser: UserResponse | null = null;
  newRole: UserRole | null = null;
  isChangingRole = false;

  // Status change dialog
  showStatusDialog = false;
  newStatus: UserStatus | null = null;
  isChangingStatus = false;

  roleOptions = USER_ROLE_OPTIONS;
  statusOptions = USER_STATUS_OPTIONS;

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.userService.listUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.users = response.users;
          this.isLoading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load users',
            life: 5000
          });
          this.isLoading = false;
        }
      });
  }

  // Role management
  openRoleDialog(user: UserResponse): void {
    this.selectedUser = user;
    this.newRole = user.role;
    this.showRoleDialog = true;
  }

  changeRole(): void {
    if (!this.selectedUser || !this.newRole) return;

    this.isChangingRole = true;
    this.userService.updateUserRole(this.selectedUser.id, { role: this.newRole })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Role Updated',
            detail: `${updatedUser.username}'s role has been updated`,
            life: 3000
          });
          this.showRoleDialog = false;
          this.isChangingRole = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update role',
            life: 5000
          });
          this.isChangingRole = false;
        }
      });
  }

  // Status management
  openStatusDialog(user: UserResponse): void {
    this.selectedUser = user;
    this.newStatus = user.status;
    this.showStatusDialog = true;
  }

  changeStatus(): void {
    if (!this.selectedUser || !this.newStatus) return;

    this.isChangingStatus = true;
    this.userService.updateUserStatus(this.selectedUser.id, { status: this.newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: `${updatedUser.username}'s status has been updated`,
            life: 3000
          });
          this.showStatusDialog = false;
          this.isChangingStatus = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update status',
            life: 5000
          });
          this.isChangingStatus = false;
        }
      });
  }

  // Delete user
  confirmDeleteUser(user: UserResponse): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteUser(user);
      }
    });
  }

  private deleteUser(user: UserResponse): void {
    this.userService.deleteUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== user.id);
          this.messageService.add({
            severity: 'success',
            summary: 'User Deleted',
            detail: `${user.username} has been deleted`,
            life: 3000
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete user',
            life: 5000
          });
        }
      });
  }

  // Helpers
  getRoleSeverity(role: UserRole): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    const severityMap: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'success': 'success',
      'info': 'info',
      'warn': 'warn',
      'danger': 'danger',
      'secondary': 'secondary'
    };
    return severityMap[getRoleSeverity(role)] || 'info';
  }

  getStatusSeverity(status: UserStatus): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    const severityMap: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'success': 'success',
      'info': 'info',
      'warn': 'warn',
      'danger': 'danger',
      'secondary': 'secondary'
    };
    return severityMap[getStatusSeverity(status)] || 'info';
  }

  getRoleLabel(role: UserRole): string {
    const option = USER_ROLE_OPTIONS.find(o => o.value === role);
    return option?.label || role;
  }

  getStatusLabel(status: UserStatus): string {
    const option = USER_STATUS_OPTIONS.find(o => o.value === status);
    return option?.label || status;
  }

  isCurrentUser(user: UserResponse): boolean {
    return user.id === this.authService.getStoredUser()?.id;
  }
}
