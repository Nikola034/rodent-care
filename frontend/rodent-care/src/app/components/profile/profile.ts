import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Standalone Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

import { UserService } from '../../services/user/user-service';
import { UserResponse, UserStatus } from '../../dto/auth';

// Custom Validators
function passwordMatchValidator(
  control: AbstractControl
): { [key: string]: any } | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    ProgressSpinnerModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: 'profile.html',
})
export class Profile implements OnInit, OnDestroy {
  profileForm!: FormGroup;
  isLoading = false;
  isLoadingUser = true;
  currentUser: UserResponse | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private userService: UserService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.profileForm = this.formBuilder.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: passwordMatchValidator,
      }
    );
  }

  private loadCurrentUser(): void {
    this.isLoadingUser = true;
    this.userService
      .getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.currentUser = user;
          this.isLoadingUser = false;
        },
        error: (error) => {
          this.isLoadingUser = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load user profile',
            life: 5000,
          });
        },
      });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      this.showValidationErrors();
      return;
    }

    this.performUpdate();
  }

  private performUpdate(): void {
    this.isLoading = true;
    this.messageService.clear();

    const formValue = this.profileForm.value;
    const updateData = {
      password: formValue.password,
    };

    this.userService
      .updateProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.currentUser = response;
          this.messageService.add({
            severity: 'success',
            summary: 'Profile Updated!',
            detail: 'Your password has been changed successfully.',
            life: 5000,
          });
          this.isLoading = false;
          this.profileForm.reset();
        },
        error: (error) => {
          this.isLoading = false;
          this.handleUpdateError(error);
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  private handleUpdateError(error: any): void {
    let errorMessage = 'Update failed';
    let errorDetail = 'Please try again later.';

    if (error.error?.message) {
      errorDetail = error.error.message;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid Information';
          errorDetail = 'Please check your input and try again.';
          break;
        case 401:
          errorMessage = 'Session Expired';
          errorDetail = 'Please log in again.';
          break;
      }
    }

    this.messageService.add({
      severity: 'error',
      summary: errorMessage,
      detail: errorDetail,
      life: 5000,
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach((key) => {
      const control = this.profileForm.get(key);
      control?.markAsTouched();
    });
  }

  private showValidationErrors(): void {
    const formErrors = this.profileForm.errors || {};

    if (formErrors['passwordMismatch']) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Passwords do not match',
        life: 5000,
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/app']);
  }

  getStatusSeverity(status: UserStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending':
        return 'warn';
      case 'Inactive':
        return 'danger';
      default:
        return 'info';
    }
  }

  // Getters for template
  get passwordControl() {
    return this.profileForm.get('password');
  }
  get confirmPasswordControl() {
    return this.profileForm.get('confirmPassword');
  }

  // Validation state getters
  get isPasswordInvalid(): boolean {
    const control = this.passwordControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isConfirmPasswordInvalid(): boolean {
    const control = this.confirmPasswordControl;
    return (
      !!(control && control.invalid && (control.dirty || control.touched)) ||
      this.profileForm.errors?.['passwordMismatch']
    );
  }

  // Error message getters
  get passwordErrorMessage(): string {
    const control = this.passwordControl;
    if (control?.errors?.['required']) return 'Password is required';
    if (control?.errors?.['minlength'])
      return 'Password must be at least 6 characters';
    return '';
  }

  get confirmPasswordErrorMessage(): string {
    const control = this.confirmPasswordControl;
    if (control?.errors?.['required']) return 'Please confirm your password';
    if (this.profileForm.errors?.['passwordMismatch'])
      return 'Passwords do not match';
    return '';
  }
}
