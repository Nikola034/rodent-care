import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';

import { RodentService } from '../../../services/rodent/rodent-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  CreateRodentRequest,
  UpdateRodentRequest,
  RodentResponse,
  SPECIES_OPTIONS,
  GENDER_OPTIONS,
  RODENT_STATUS_OPTIONS
} from '../../../dto/rodent';

@Component({
  selector: 'app-rodent-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    Textarea,
    DropdownModule,
    CalendarModule,
    CheckboxModule,
    FileUploadModule,
    ToastModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService],
  templateUrl: 'rodent-form.html'
})
export class RodentForm implements OnInit, OnDestroy {
  rodentForm!: FormGroup;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  rodentId: string | null = null;
  existingRodent: RodentResponse | null = null;

  speciesOptions = SPECIES_OPTIONS;
  genderOptions = GENDER_OPTIONS;
  statusOptions = RODENT_STATUS_OPTIONS;

  maxDate = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private rodentService: RodentService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.rodentForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      species: [null, [Validators.required]],
      gender: [null, [Validators.required]],
      status: ['active', [Validators.required]],
      date_of_birth: [null],
      date_of_birth_estimated: [false],
      chip_id: ['', [Validators.maxLength(50)]],
      intake_date: [new Date()],
      notes: ['', [Validators.maxLength(2000)]]
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.rodentId = id;
      this.loadRodent();
    }
  }

  private loadRodent(): void {
    if (!this.rodentId) return;

    this.isLoading = true;
    this.rodentService.getRodent(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.existingRodent = response.rodent;
          this.populateForm(response.rodent);
          this.isLoading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load rodent details',
            life: 5000
          });
          this.isLoading = false;
          this.router.navigate(['/app/rodents']);
        }
      });
  }

  private populateForm(rodent: RodentResponse): void {
    this.rodentForm.patchValue({
      name: rodent.name,
      species: rodent.species,
      gender: rodent.gender,
      status: rodent.status,
      date_of_birth: rodent.date_of_birth ? new Date(rodent.date_of_birth) : null,
      date_of_birth_estimated: rodent.date_of_birth_estimated,
      chip_id: rodent.chip_id || '',
      intake_date: new Date(rodent.intake_date),
      notes: rodent.notes || ''
    });
  }

  onSubmit(): void {
    if (this.rodentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSaving = true;

    if (this.isEditMode) {
      this.updateRodent();
    } else {
      this.createRodent();
    }
  }

  private createRodent(): void {
    const formValue = this.rodentForm.value;
    const request: CreateRodentRequest = {
      name: formValue.name.trim(),
      species: formValue.species,
      gender: formValue.gender,
      status: formValue.status,
      date_of_birth: formValue.date_of_birth?.toISOString() || null,
      date_of_birth_estimated: formValue.date_of_birth_estimated,
      chip_id: formValue.chip_id?.trim() || null,
      intake_date: formValue.intake_date?.toISOString() || null,
      notes: formValue.notes?.trim() || null
    };

    this.rodentService.createRodent(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${response.rodent.name} has been created`,
            life: 3000
          });
          this.isSaving = false;
          this.router.navigate(['/app/rodents', response.rodent.id]);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create rodent',
            life: 5000
          });
          this.isSaving = false;
        }
      });
  }

  private updateRodent(): void {
    if (!this.rodentId) return;

    const formValue = this.rodentForm.value;
    const request: UpdateRodentRequest = {
      name: formValue.name.trim(),
      species: formValue.species,
      gender: formValue.gender,
      date_of_birth: formValue.date_of_birth?.toISOString() || null,
      date_of_birth_estimated: formValue.date_of_birth_estimated,
      chip_id: formValue.chip_id?.trim() || null,
      notes: formValue.notes?.trim() || null
    };

    this.rodentService.updateRodent(this.rodentId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${response.rodent.name} has been updated`,
            life: 3000
          });
          this.isSaving = false;
          this.router.navigate(['/app/rodents', this.rodentId]);
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update rodent',
            life: 5000
          });
          this.isSaving = false;
        }
      });
  }

  cancel(): void {
    if (this.isEditMode && this.rodentId) {
      this.router.navigate(['/app/rodents', this.rodentId]);
    } else {
      this.router.navigate(['/app/rodents']);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.rodentForm.controls).forEach(key => {
      const control = this.rodentForm.get(key);
      control?.markAsTouched();
    });
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const control = this.rodentForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getFieldError(fieldName: string): string {
    const control = this.rodentForm.get(fieldName);
    if (control?.errors) {
      if (control.errors['required']) return `${this.getFieldLabel(fieldName)} is required`;
      if (control.errors['minlength']) return `${this.getFieldLabel(fieldName)} is too short`;
      if (control.errors['maxlength']) return `${this.getFieldLabel(fieldName)} is too long`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      species: 'Species',
      gender: 'Gender',
      status: 'Status',
      date_of_birth: 'Date of Birth',
      chip_id: 'Chip ID',
      intake_date: 'Intake Date',
      notes: 'Notes'
    };
    return labels[fieldName] || fieldName;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Rodent' : 'Add New Rodent';
  }
}
