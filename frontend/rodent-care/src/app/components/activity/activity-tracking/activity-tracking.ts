import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { SliderModule } from 'primeng/slider';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ActivityTrackingService } from '../../../services/activity/activity-tracking-service';
import { RodentService } from '../../../services/rodent/rodent-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  DailyRecordResponse,
  ActivityResponse,
  FeedingRecordResponse,
  DailySummaryResponse,
  CreateDailyRecordRequest,
  UpdateDailyRecordRequest,
  CreateActivityRequest,
  CreateFeedingRecordRequest,
  UpdateFeedingRecordRequest,
  ActivityType,
  FoodType,
  ACTIVITY_TYPE_OPTIONS,
  FOOD_TYPE_OPTIONS,
  getActivityTypeLabel,
  getActivityTypeIcon,
  getFoodTypeLabel,
  getFoodTypeIcon
} from '../../../dto/activity';
import { RodentResponse } from '../../../dto/rodent';

@Component({
  selector: 'app-activity-tracking',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TabViewModule,
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    Textarea,
    DropdownModule,
    CalendarModule,
    SliderModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: 'activity-tracking.html'
})
export class ActivityTracking implements OnInit, OnDestroy {
  rodent: RodentResponse | null = null;
  rodentId: string | null = null;
  isLoading = true;

  // Summary data
  selectedDate = new Date();
  summary: DailySummaryResponse | null = null;
  isLoadingSummary = false;

  // Daily Record
  dailyRecord: DailyRecordResponse | null = null;
  showDailyRecordDialog = false;
  dailyRecordForm!: FormGroup;
  isSavingDailyRecord = false;
  isEditingDailyRecord = false;

  // Activities
  activities: ActivityResponse[] = [];
  showActivityDialog = false;
  activityForm!: FormGroup;
  isSavingActivity = false;
  activityTypeOptions = ACTIVITY_TYPE_OPTIONS;

  // Feeding Records
  feedingRecords: FeedingRecordResponse[] = [];
  showFeedingDialog = false;
  feedingForm!: FormGroup;
  isSavingFeeding = false;
  isEditingFeeding = false;
  editingFeedingId: string | null = null;
  foodTypeOptions = FOOD_TYPE_OPTIONS;

  maxDate = new Date();

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private activityService: ActivityTrackingService,
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
      this.initializeForms();
      this.loadRodent();
      this.loadDailySummary();
    } else {
      this.router.navigate(['/app/rodents']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Daily Record Form
    this.dailyRecordForm = this.formBuilder.group({
      weight_grams: [null, [Validators.min(0), Validators.max(10000)]],
      temperature_celsius: [null, [Validators.min(30), Validators.max(45)]],
      energy_level: [5],
      mood_level: [5],
      behavior_notes: ['', [Validators.maxLength(2000)]]
    });

    // Activity Form
    this.activityForm = this.formBuilder.group({
      activity_type: [null, [Validators.required]],
      duration_minutes: [null, [Validators.required, Validators.min(1), Validators.max(1440)]],
      intensity: [5],
      notes: ['', [Validators.maxLength(500)]],
      recorded_at: [new Date()]
    });

    // Feeding Form
    this.feedingForm = this.formBuilder.group({
      food_type: [null, [Validators.required]],
      quantity_grams: [null, [Validators.required, Validators.min(0.1), Validators.max(10000)]],
      meal_time: [new Date()],
      notes: ['', [Validators.maxLength(500)]],
      consumed_fully: [true]
    });
  }

  private loadRodent(): void {
    if (!this.rodentId) return;

    this.rodentService.getRodent(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rodent = response.rodent;
          this.isLoading = false;
        },
        error: () => {
          this.router.navigate(['/app/rodents']);
        }
      });
  }

  loadDailySummary(): void {
    if (!this.rodentId) return;

    this.isLoadingSummary = true;
    const dateStr = this.formatDateForApi(this.selectedDate);

    this.activityService.getDailySummary(this.rodentId, dateStr)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.summary = response;
          this.dailyRecord = response.daily_record;
          this.activities = response.activities;
          this.feedingRecords = response.feeding_records;
          this.isLoadingSummary = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load daily summary',
            life: 5000
          });
          this.isLoadingSummary = false;
        }
      });
  }

  onDateChange(): void {
    this.loadDailySummary();
  }

  goToPreviousDay(): void {
    const prev = new Date(this.selectedDate);
    prev.setDate(prev.getDate() - 1);
    this.selectedDate = prev;
    this.loadDailySummary();
  }

  goToNextDay(): void {
    const next = new Date(this.selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) {
      this.selectedDate = next;
      this.loadDailySummary();
    }
  }

  goToToday(): void {
    const today = new Date();
    this.maxDate = today;
    this.selectedDate = today;
    this.loadDailySummary();
  }

  navigateBack(): void {
    if (this.rodentId) {
      this.router.navigate(['/app/rodents', this.rodentId]);
    } else {
      this.router.navigate(['/app/rodents']);
    }
  }

  // ==================== Daily Record ====================

  openDailyRecordDialog(): void {
    this.isEditingDailyRecord = !!this.dailyRecord;

    if (this.dailyRecord) {
      this.dailyRecordForm.patchValue({
        weight_grams: this.dailyRecord.weight_grams,
        temperature_celsius: this.dailyRecord.temperature_celsius,
        energy_level: this.dailyRecord.energy_level || 5,
        mood_level: this.dailyRecord.mood_level || 5,
        behavior_notes: this.dailyRecord.behavior_notes || ''
      });
    } else {
      this.dailyRecordForm.reset({
        energy_level: 5,
        mood_level: 5
      });
    }

    this.showDailyRecordDialog = true;
  }

  saveDailyRecord(): void {
    if (!this.rodentId) return;

    this.isSavingDailyRecord = true;
    const formValue = this.dailyRecordForm.value;

    if (this.isEditingDailyRecord && this.dailyRecord) {
      const request: UpdateDailyRecordRequest = {
        weight_grams: formValue.weight_grams || null,
        temperature_celsius: formValue.temperature_celsius || null,
        energy_level: formValue.energy_level || null,
        mood_level: formValue.mood_level || null,
        behavior_notes: formValue.behavior_notes?.trim() || null
      };

      this.activityService.updateDailyRecord(this.rodentId, this.dailyRecord.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Updated',
              detail: 'Daily record has been updated',
              life: 3000
            });
            this.showDailyRecordDialog = false;
            this.isSavingDailyRecord = false;
            this.loadDailySummary();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update daily record',
              life: 5000
            });
            this.isSavingDailyRecord = false;
          }
        });
    } else {
      const request: CreateDailyRecordRequest = {
        date: this.formatDateForApi(this.selectedDate),
        weight_grams: formValue.weight_grams || null,
        temperature_celsius: formValue.temperature_celsius || null,
        energy_level: formValue.energy_level || null,
        mood_level: formValue.mood_level || null,
        behavior_notes: formValue.behavior_notes?.trim() || null
      };

      this.activityService.createDailyRecord(this.rodentId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Created',
              detail: 'Daily record has been created',
              life: 3000
            });
            this.showDailyRecordDialog = false;
            this.isSavingDailyRecord = false;
            this.loadDailySummary();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create daily record',
              life: 5000
            });
            this.isSavingDailyRecord = false;
          }
        });
    }
  }

  // ==================== Activities ====================

  openActivityDialog(): void {
    this.activityForm.reset({
      intensity: 5,
      recorded_at: new Date()
    });
    this.showActivityDialog = true;
  }

  saveActivity(): void {
    if (this.activityForm.invalid || !this.rodentId) {
      this.markFormGroupTouched(this.activityForm);
      return;
    }

    this.isSavingActivity = true;
    const formValue = this.activityForm.value;

    const request: CreateActivityRequest = {
      activity_type: formValue.activity_type,
      duration_minutes: formValue.duration_minutes,
      intensity: formValue.intensity || null,
      notes: formValue.notes?.trim() || null,
      recorded_at: formValue.recorded_at?.toISOString() || null
    };

    this.activityService.createActivity(this.rodentId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Created',
            detail: 'Activity has been recorded',
            life: 3000
          });
          this.showActivityDialog = false;
          this.isSavingActivity = false;
          this.loadDailySummary();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to record activity',
            life: 5000
          });
          this.isSavingActivity = false;
        }
      });
  }

  confirmDeleteActivity(activity: ActivityResponse): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this activity?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteActivity(activity);
      }
    });
  }

  private deleteActivity(activity: ActivityResponse): void {
    if (!this.rodentId) return;

    this.activityService.deleteActivity(this.rodentId, activity.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Activity has been deleted',
            life: 3000
          });
          this.loadDailySummary();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete activity',
            life: 5000
          });
        }
      });
  }

  // ==================== Feeding Records ====================

  openFeedingDialog(): void {
    this.isEditingFeeding = false;
    this.editingFeedingId = null;
    this.feedingForm.reset({
      meal_time: new Date()
    });
    this.showFeedingDialog = true;
  }

  openEditFeedingDialog(record: FeedingRecordResponse): void {
    this.isEditingFeeding = true;
    this.editingFeedingId = record.id;

    this.feedingForm.patchValue({
      food_type: record.food_type,
      quantity_grams: record.quantity_grams,
      meal_time: new Date(record.meal_time),
      notes: record.notes || ''
    });

    this.showFeedingDialog = true;
  }

  saveFeeding(): void {
    if (this.feedingForm.invalid || !this.rodentId) {
      this.markFormGroupTouched(this.feedingForm);
      return;
    }

    this.isSavingFeeding = true;
    const formValue = this.feedingForm.value;

    if (this.isEditingFeeding && this.editingFeedingId) {
      const request: UpdateFeedingRecordRequest = {
        food_type: formValue.food_type,
        quantity_grams: formValue.quantity_grams,
        meal_time: formValue.meal_time?.toISOString(),
        notes: formValue.notes?.trim() || null
      };

      this.activityService.updateFeedingRecord(this.rodentId, this.editingFeedingId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Updated',
              detail: 'Feeding record has been updated',
              life: 3000
            });
            this.showFeedingDialog = false;
            this.isSavingFeeding = false;
            this.loadDailySummary();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to update feeding record',
              life: 5000
            });
            this.isSavingFeeding = false;
          }
        });
    } else {
      const request: CreateFeedingRecordRequest = {
        food_type: formValue.food_type,
        quantity_grams: formValue.quantity_grams,
        meal_time: formValue.meal_time?.toISOString() || null,
        notes: formValue.notes?.trim() || null,
        consumed_fully: formValue.consumed_fully ?? null
      };

      this.activityService.createFeedingRecord(this.rodentId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Created',
              detail: 'Feeding record has been created',
              life: 3000
            });
            this.showFeedingDialog = false;
            this.isSavingFeeding = false;
            this.loadDailySummary();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create feeding record',
              life: 5000
            });
            this.isSavingFeeding = false;
          }
        });
    }
  }

  confirmDeleteFeeding(record: FeedingRecordResponse): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this feeding record?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteFeeding(record);
      }
    });
  }

  private deleteFeeding(record: FeedingRecordResponse): void {
    if (!this.rodentId) return;

    this.activityService.deleteFeedingRecord(this.rodentId, record.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Feeding record has been deleted',
            life: 3000
          });
          this.loadDailySummary();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete feeding record',
            life: 5000
          });
        }
      });
  }

  // ==================== Helpers ====================

  private formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getActivityTypeLabel(type: ActivityType): string {
    return getActivityTypeLabel(type);
  }

  getActivityTypeIcon(type: ActivityType): string {
    return getActivityTypeIcon(type);
  }

  getFoodTypeLabel(type: FoodType): string {
    return getFoodTypeLabel(type);
  }

  getFoodTypeIcon(type: FoodType): string {
    return getFoodTypeIcon(type);
  }

  canTrackActivities(): boolean {
    return this.authService.canTrackActivities();
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const control = form.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getEnergyLevelColor(level: number | null): string {
    if (level === null) return 'text-color-secondary';
    if (level <= 3) return 'text-red-500';
    if (level <= 6) return 'text-yellow-500';
    return 'text-green-500';
  }

  getMoodLevelColor(level: number | null): string {
    if (level === null) return 'text-color-secondary';
    if (level <= 3) return 'text-red-500';
    if (level <= 6) return 'text-yellow-500';
    return 'text-green-500';
  }
}
