import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { MedicalRecordService } from '../../../services/medical/medical-record-service';
import { RodentService } from '../../../services/rodent/rodent-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  MedicalRecordResponse,
  MedicalRecordType,
  MEDICAL_RECORD_TYPE_OPTIONS,
  getRecordTypeSeverity,
  CreateMedicalRecordRequest,
  MedicationRequest
} from '../../../dto/medical';
import { RodentResponse } from '../../../dto/rodent';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    Textarea,
    DropdownModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    AccordionModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: 'medical-records.html'
})
export class MedicalRecords implements OnInit, OnDestroy {
  rodent: RodentResponse | null = null;
  medicalRecords: MedicalRecordResponse[] = [];
  isLoading = true;
  rodentId: string | null = null;

  // Dialog
  showRecordDialog = false;
  isEditMode = false;
  editingRecordId: string | null = null;
  recordForm!: FormGroup;
  isSaving = false;

  recordTypeOptions = MEDICAL_RECORD_TYPE_OPTIONS;
  maxDate = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private medicalRecordService: MedicalRecordService,
    private rodentService: RodentService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.rodentId = this.route.snapshot.paramMap.get('id');
    if (this.rodentId) {
      this.initializeForm();
      this.loadRodent();
      this.loadMedicalRecords();
    } else {
      this.router.navigate(['/app/rodents']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.recordForm = this.formBuilder.group({
      record_type: [null, [Validators.required]],
      date: [new Date()],
      description: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(5000)]],
      diagnosis: ['', [Validators.maxLength(2000)]],
      test_results: ['', [Validators.maxLength(5000)]],
      next_appointment: [null],
      medications: this.formBuilder.array([])
    });
  }

  private loadRodent(): void {
    if (!this.rodentId) return;

    this.rodentService.getRodent(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rodent = response.rodent;
        },
        error: () => {
          this.router.navigate(['/app/rodents']);
        }
      });
  }

  private loadMedicalRecords(): void {
    if (!this.rodentId) return;

    this.isLoading = true;
    this.medicalRecordService.listMedicalRecords(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.medicalRecords = response.medical_records;
          this.isLoading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load medical records',
            life: 5000
          });
          this.isLoading = false;
        }
      });
  }

  // Navigation
  navigateBack(): void {
    if (this.rodentId) {
      this.router.navigate(['/app/rodents', this.rodentId]);
    } else {
      this.router.navigate(['/app/rodents']);
    }
  }

  // Medications array
  get medications(): FormArray {
    return this.recordForm.get('medications') as FormArray;
  }

  addMedication(): void {
    const medicationGroup = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      dosage: ['', [Validators.required, Validators.maxLength(100)]],
      frequency: ['', [Validators.required, Validators.maxLength(100)]],
      duration: ['', [Validators.maxLength(100)]],
      notes: ['', [Validators.maxLength(500)]]
    });
    this.medications.push(medicationGroup);
  }

  removeMedication(index: number): void {
    this.medications.removeAt(index);
  }

  // Dialog handling
  openNewRecordDialog(): void {
    this.isEditMode = false;
    this.editingRecordId = null;
    this.recordForm.reset({
      date: new Date(),
      medications: []
    });
    this.medications.clear();
    this.showRecordDialog = true;
  }

  openEditRecordDialog(record: MedicalRecordResponse): void {
    this.isEditMode = true;
    this.editingRecordId = record.id;

    this.recordForm.patchValue({
      record_type: record.record_type,
      date: new Date(record.date),
      description: record.description,
      diagnosis: record.diagnosis || '',
      test_results: record.test_results || '',
      next_appointment: record.next_appointment ? new Date(record.next_appointment) : null
    });

    this.medications.clear();
    record.medications.forEach(med => {
      this.medications.push(this.formBuilder.group({
        name: [med.name, [Validators.required, Validators.maxLength(200)]],
        dosage: [med.dosage, [Validators.required, Validators.maxLength(100)]],
        frequency: [med.frequency, [Validators.required, Validators.maxLength(100)]],
        duration: [med.duration || '', [Validators.maxLength(100)]],
        notes: [med.notes || '', [Validators.maxLength(500)]]
      }));
    });

    this.showRecordDialog = true;
  }

  saveRecord(): void {
    if (this.recordForm.invalid || !this.rodentId) {
      this.markFormGroupTouched(this.recordForm);
      return;
    }

    this.isSaving = true;
    const formValue = this.recordForm.value;

    const medications: MedicationRequest[] = formValue.medications.map((med: any) => ({
      name: med.name.trim(),
      dosage: med.dosage.trim(),
      frequency: med.frequency.trim(),
      duration: med.duration?.trim() || null,
      notes: med.notes?.trim() || null
    }));

    const request: CreateMedicalRecordRequest = {
      record_type: formValue.record_type,
      date: formValue.date?.toISOString() || null,
      description: formValue.description.trim(),
      diagnosis: formValue.diagnosis?.trim() || null,
      test_results: formValue.test_results?.trim() || null,
      next_appointment: formValue.next_appointment?.toISOString() || null,
      medications
    };

    if (this.isEditMode && this.editingRecordId) {
      this.medicalRecordService.updateMedicalRecord(this.rodentId, this.editingRecordId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Updated',
              detail: 'Medical record has been updated',
              life: 3000
            });
            this.showRecordDialog = false;
            this.isSaving = false;
            this.loadMedicalRecords();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update medical record',
              life: 5000
            });
            this.isSaving = false;
          }
        });
    } else {
      this.medicalRecordService.createMedicalRecord(this.rodentId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Created',
              detail: 'Medical record has been created',
              life: 3000
            });
            this.showRecordDialog = false;
            this.isSaving = false;
            this.loadMedicalRecords();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create medical record',
              life: 5000
            });
            this.isSaving = false;
          }
        });
    }
  }

  confirmDeleteRecord(record: MedicalRecordResponse): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this medical record?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteRecord(record);
      }
    });
  }

  private deleteRecord(record: MedicalRecordResponse): void {
    if (!this.rodentId) return;

    this.medicalRecordService.deleteMedicalRecord(this.rodentId, record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Medical record has been deleted',
            life: 3000
          });
          this.loadMedicalRecords();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete medical record',
            life: 5000
          });
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Helpers
  getRecordTypeSeverity(type: MedicalRecordType): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    const severityMap: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'success': 'success',
      'info': 'info',
      'warn': 'warn',
      'danger': 'danger',
      'secondary': 'secondary'
    };
    return severityMap[getRecordTypeSeverity(type)] || 'info';
  }

  getRecordTypeLabel(type: MedicalRecordType): string {
    const option = MEDICAL_RECORD_TYPE_OPTIONS.find(o => o.value === type);
    return option?.label || type;
  }

  canManageMedicalRecords(): boolean {
    return this.authService.canManageMedicalRecords();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.recordForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
