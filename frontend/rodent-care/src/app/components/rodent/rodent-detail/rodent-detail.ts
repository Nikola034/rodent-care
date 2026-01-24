import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabview';
import { GalleriaModule } from 'primeng/galleria';
import { FileUploadModule } from 'primeng/fileupload';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { Textarea } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { RodentService } from '../../../services/rodent/rodent-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  RodentResponse,
  RodentImage,
  StatusHistoryResponse,
  RodentStatus,
  RODENT_STATUS_OPTIONS,
  SPECIES_OPTIONS,
  GENDER_OPTIONS,
  getStatusSeverity
} from '../../../dto/rodent';

@Component({
  selector: 'app-rodent-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TabViewModule,
    GalleriaModule,
    FileUploadModule,
    DialogModule,
    DropdownModule,
    Textarea,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TimelineModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: 'rodent-detail.html'
})
export class RodentDetail implements OnInit, OnDestroy {
  rodent: RodentResponse | null = null;
  statusHistory: StatusHistoryResponse[] = [];
  isLoading = true;
  isLoadingHistory = false;
  rodentId: string | null = null;

  // Status change dialog
  showStatusDialog = false;
  newStatus: RodentStatus | null = null;
  statusReason = '';
  isChangingStatus = false;
  statusOptions = RODENT_STATUS_OPTIONS;

  // Image upload
  isUploadingImage = false;

  private destroy$ = new Subject<void>();

  constructor(
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
      this.loadRodent();
      this.loadStatusHistory();
    } else {
      this.router.navigate(['/app/rodents']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRodent(): void {
    if (!this.rodentId) return;

    this.isLoading = true;
    this.rodentService.getRodent(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rodent = response.rodent;
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

  private loadStatusHistory(): void {
    if (!this.rodentId) return;

    this.isLoadingHistory = true;
    this.rodentService.getStatusHistory(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.statusHistory = response.history;
          this.isLoadingHistory = false;
        },
        error: () => {
          this.isLoadingHistory = false;
        }
      });
  }

  // Navigation
  navigateToEdit(): void {
    if (this.rodentId) {
      this.router.navigate(['/app/rodents', this.rodentId, 'edit']);
    }
  }

  navigateToMedicalRecords(): void {
    if (this.rodentId) {
      this.router.navigate(['/app/rodents', this.rodentId, 'medical-records']);
    }
  }

  navigateBack(): void {
    this.router.navigate(['/app/rodents']);
  }

  // Status change
  openStatusDialog(): void {
    this.newStatus = this.rodent?.status || null;
    this.statusReason = '';
    this.showStatusDialog = true;
  }

  changeStatus(): void {
    if (!this.rodentId || !this.newStatus) return;

    this.isChangingStatus = true;
    this.rodentService.updateRodentStatus(this.rodentId, {
      status: this.newStatus,
      reason: this.statusReason || null
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rodent = response.rodent;
          this.messageService.add({
            severity: 'success',
            summary: 'Status Updated',
            detail: `Status changed to ${this.getStatusLabel(response.rodent.status)}`,
            life: 3000
          });
          this.showStatusDialog = false;
          this.isChangingStatus = false;
          this.loadStatusHistory();
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

  // Image handling
  onImageUpload(event: any): void {
    if (!this.rodentId) return;

    const file = event.files[0];
    if (!file) return;

    this.isUploadingImage = true;
    this.rodentService.uploadImage(this.rodentId, file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Image Uploaded',
            detail: 'Image has been uploaded successfully',
            life: 3000
          });
          this.isUploadingImage = false;
          this.loadRodent();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload image',
            life: 5000
          });
          this.isUploadingImage = false;
        }
      });
  }

  setPrimaryImage(image: RodentImage): void {
    if (!this.rodentId) return;

    this.rodentService.setPrimaryImage(this.rodentId, image.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Primary Image Set',
            detail: 'Primary image has been updated',
            life: 3000
          });
          this.loadRodent();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to set primary image',
            life: 5000
          });
        }
      });
  }

  confirmDeleteImage(image: RodentImage): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this image?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteImage(image);
      }
    });
  }

  private deleteImage(image: RodentImage): void {
    if (!this.rodentId) return;

    this.rodentService.deleteImage(this.rodentId, image.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Image Deleted',
            detail: 'Image has been deleted',
            life: 3000
          });
          this.loadRodent();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete image',
            life: 5000
          });
        }
      });
  }

  confirmDeleteRodent(): void {
    if (!this.rodent) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${this.rodent.name}"? This action cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteRodent();
      }
    });
  }

  private deleteRodent(): void {
    if (!this.rodentId) return;

    this.rodentService.deleteRodent(this.rodentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Rodent has been deleted',
            life: 3000
          });
          this.router.navigate(['/app/rodents']);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete rodent',
            life: 5000
          });
        }
      });
  }

  // Helpers
  getImageUrl(image: RodentImage): string {
    return `data:${image.content_type};base64,${image.data}`;
  }

  getPrimaryImage(): string | null {
    if (!this.rodent) return null;
    const primary = this.rodent.images.find(img => img.is_primary);
    if (primary) return this.getImageUrl(primary);
    return this.rodent.images.length > 0 ? this.getImageUrl(this.rodent.images[0]) : null;
  }

  getStatusSeverity(status: RodentStatus): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    const severityMap: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
      'success': 'success',
      'info': 'info',
      'warn': 'warn',
      'danger': 'danger',
      'secondary': 'secondary'
    };
    return severityMap[getStatusSeverity(status)] || 'info';
  }

  getStatusLabel(status: RodentStatus): string {
    const option = RODENT_STATUS_OPTIONS.find(o => o.value === status);
    return option?.label || status;
  }

  getSpeciesLabel(species: string): string {
    const option = SPECIES_OPTIONS.find(o => o.value === species);
    return option?.label || species;
  }

  getGenderLabel(gender: string): string {
    const option = GENDER_OPTIONS.find(o => o.value === gender);
    return option?.label || gender;
  }

  canManageRodents(): boolean {
    return this.authService.canManageRodents();
  }

  canManageMedicalRecords(): boolean {
    return this.authService.canManageMedicalRecords();
  }

  formatAge(months: number | null): string {
    if (months === null) return 'Unknown';
    if (months < 1) return 'Less than 1 month';
    if (months === 1) return '1 month';
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return years === 1 ? '1 year' : `${years} years`;
    }
    return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  }
}
