import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Standalone Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../services/auth/auth-service';
import { USER_ROLE_OPTIONS, UserRole } from '../../../dto/auth/UserRole';

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
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    DropdownModule,
    ToastModule,
    ProgressSpinnerModule,
  ],
  providers: [MessageService],
  templateUrl: 'register.html',
})
export class Register implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  isLoading = false;
  currentYear = new Date().getFullYear();

  // Role options (excluding admin - only admins can create admins)
  roleOptions = USER_ROLE_OPTIONS.filter(r => r.value !== 'Admin');

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.messageService.clear();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.registerForm = this.formBuilder.group(
      {
        username: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(50),
          ],
        ],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(6),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
        role: ['Volunteer' as UserRole, [Validators.required]],
      },
      {
        validators: passwordMatchValidator,
      }
    );
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched();
      this.showValidationErrors();
      return;
    }

    this.performRegistration();
  }

  private performRegistration(): void {
    this.isLoading = true;
    this.messageService.clear();

    const formValue = this.registerForm.value;
    const registrationData = {
      username: formValue.username.trim(),
      email: formValue.email.trim(),
      password: formValue.password,
      role: formValue.role as UserRole,
    };

    this.authService
      .register(registrationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Registration Successful!',
            detail: 'Your account has been created. Please wait for admin approval.',
            life: 5000,
          });
          this.isLoading = false;
          // Navigate to login after successful registration
          setTimeout(() => this.router.navigate(['/']), 2000);
        },
        error: (error) => {
          this.isLoading = false;
          this.handleRegistrationError(error);
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  private handleRegistrationError(error: any): void {
    let errorMessage = 'Registration failed';
    let errorDetail = 'Please try again later.';

    if (error.error?.message) {
      errorDetail = error.error.message;
    } else {
      switch (error.status) {
        case 409:
          errorMessage = 'Username/Email Already Exists';
          errorDetail = 'Please choose different credentials.';
          break;
        case 400:
          errorMessage = 'Invalid Information';
          errorDetail = 'Please check your input and try again.';
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
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  private showValidationErrors(): void {
    const formErrors = this.registerForm.errors || {};

    if (formErrors['passwordMismatch']) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Passwords do not match',
        life: 5000,
      });
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/']);
  }

  // Getters for template
  get usernameControl() {
    return this.registerForm.get('username');
  }
  get emailControl() {
    return this.registerForm.get('email');
  }
  get passwordControl() {
    return this.registerForm.get('password');
  }
  get confirmPasswordControl() {
    return this.registerForm.get('confirmPassword');
  }
  get roleControl() {
    return this.registerForm.get('role');
  }

  // Validation state getters
  get isUsernameInvalid(): boolean {
    const control = this.usernameControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isEmailInvalid(): boolean {
    const control = this.emailControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isPasswordInvalid(): boolean {
    const control = this.passwordControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isConfirmPasswordInvalid(): boolean {
    const control = this.confirmPasswordControl;
    return (
      !!(control && control.invalid && (control.dirty || control.touched)) ||
      this.registerForm.errors?.['passwordMismatch']
    );
  }

  // Error message getters
  get usernameErrorMessage(): string {
    const control = this.usernameControl;
    if (control?.errors?.['required']) return 'Username is required';
    if (control?.errors?.['minlength'])
      return 'Username must be at least 3 characters';
    if (control?.errors?.['maxlength'])
      return 'Username must be at most 50 characters';
    return '';
  }

  get emailErrorMessage(): string {
    const control = this.emailControl;
    if (control?.errors?.['required']) return 'Email is required';
    if (control?.errors?.['email']) return 'Please enter a valid email address';
    return '';
  }

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
    if (this.registerForm.errors?.['passwordMismatch'])
      return 'Passwords do not match';
    return '';
  }
}
