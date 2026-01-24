import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Standalone Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { LoginRequest } from '../../../dto/auth/LoginRequest';
import { AuthService } from '../../../services/auth/auth-service';



@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: 'login.html'
})
export class Login implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  returnUrl = 'dashboard';
  currentYear = new Date().getFullYear();

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
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
    this.loginForm = this.formBuilder.group({
      username: ['', [
        Validators.required,
        Validators.minLength(3)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(2)
      ]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.performLogin();
  }

  navigateToRegister(): void {
    this.router.navigate(['/register']);
  }

  private performLogin(): void {
    this.isLoading = true;
    this.messageService.clear();

    const credentials: LoginRequest = {
      username: this.loginForm.value.username.trim(),
      password: this.loginForm.value.password
    };

    this.authService.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
        },
        error: (error) => {
          this.handleLoginError(error);
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  

  private handleLoginError(error: any): void {
    let errorMessage = 'Login failed. Please try again.';
    let errorDetail = '';

    switch (error.status) {
      case 401:
        errorMessage = 'Invalid Credentials';
        errorDetail = 'The username or password you entered is incorrect.';
        break;
      case 400:
        errorMessage = 'Invalid Request';
        errorDetail = 'Please check your input and try again.';
        break;
      case 500:
        errorMessage = 'Server Error';
        errorDetail = 'Our servers are experiencing issues. Please try again later.';
        break;
      default:
        errorDetail = 'Please check your connection and try again.';
    }

    this.messageService.add({
      severity: 'error',
      summary: errorMessage,
      detail: errorDetail,
      life: 5000
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters for template
  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  get isUsernameInvalid(): boolean {
    const control = this.usernameControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isPasswordInvalid(): boolean {
    const control = this.passwordControl;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get usernameErrorMessage(): string {
    const control = this.usernameControl;
    if (control?.errors?.['required']) {
      return 'Username is required';
    }
    if (control?.errors?.['minlength']) {
      return 'Username must be at least 3 characters';
    }
    return '';
  }

  get passwordErrorMessage(): string {
    const control = this.passwordControl;
    if (control?.errors?.['required']) {
      return 'Password is required';
    }
    if (control?.errors?.['minlength']) {
      return 'Password must be at least 8 characters';
    }
    return '';
  }
}