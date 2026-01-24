import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { ConfirmationService, MessageService } from 'primeng/api';

import { RodentService } from '../../../services/rodent/rodent-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  RodentResponse,
  RodentQueryParams,
  RodentStatus,
  Species,
  SPECIES_OPTIONS,
  RODENT_STATUS_OPTIONS,
  getStatusSeverity
} from '../../../dto/rodent';

@Component({
  selector: 'app-rodent-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    SkeletonModule,
    PaginatorModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: 'rodent-list.html'
})
export class RodentList implements OnInit, OnDestroy {
  rodents: RodentResponse[] = [];
  isLoading = true;

  // Pagination
  totalRecords = 0;
  rows = 10;
  first = 0;

  // Filters
  searchName = '';
  searchChipId = '';
  selectedSpecies: Species | null = null;
  selectedStatus: RodentStatus | null = null;
  sortField = 'created_at';
  sortOrder = 'desc';

  // Filter options
  speciesOptions = [{ label: 'All Species', value: null }, ...SPECIES_OPTIONS];
  statusOptions = [{ label: 'All Statuses', value: null }, ...RODENT_STATUS_OPTIONS];
  sortOptions = [
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Name (A-Z)', value: 'name:asc' },
    { label: 'Name (Z-A)', value: 'name:desc' },
    { label: 'Age (Youngest)', value: 'age:asc' },
    { label: 'Age (Oldest)', value: 'age:desc' }
  ];
  selectedSort = 'created_at:desc';

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private rodentService: RodentService,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadRodents();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.first = 0;
      this.loadRodents();
    });
  }

  loadRodents(): void {
    this.isLoading = true;

    const [sortBy, sortOrder] = this.selectedSort.split(':');

    const params: RodentQueryParams = {
      page: Math.floor(this.first / this.rows) + 1,
      limit: this.rows,
      sort_by: sortBy as any,
      sort_order: sortOrder as any
    };

    if (this.searchName) {
      params.name = this.searchName;
    }
    if (this.selectedSpecies) {
      params.species = this.selectedSpecies;
    }
    if (this.selectedStatus) {
      params.status = this.selectedStatus;
    }
    if (this.searchChipId) {
      params.chip_id = this.searchChipId;
    }

    this.rodentService.listRodents(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.rodents = response.rodents;
          this.totalRecords = response.total;
          this.isLoading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load rodents',
            life: 5000
          });
          this.isLoading = false;
        }
      });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchName);
  }

  onSearchChipIdChange(): void {
    this.searchSubject.next(this.searchChipId);
  }

  onFilterChange(): void {
    this.first = 0;
    this.loadRodents();
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
    this.loadRodents();
  }

  navigateToRodent(id: string): void {
    this.router.navigate(['/app/rodents', id]);
  }

  navigateToAddRodent(): void {
    this.router.navigate(['/app/rodents/new']);
  }

  navigateToEditRodent(id: string, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/app/rodents', id, 'edit']);
  }

  confirmDelete(rodent: RodentResponse, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to delete "${rodent.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteRodent(rodent);
      }
    });
  }

  private deleteRodent(rodent: RodentResponse): void {
    this.rodentService.deleteRodent(rodent.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: `${rodent.name} has been deleted`,
            life: 3000
          });
          this.loadRodents();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete rodent',
            life: 5000
          });
        }
      });
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

  getSpeciesLabel(species: Species): string {
    const option = SPECIES_OPTIONS.find(o => o.value === species);
    return option?.label || species;
  }

  getPrimaryImage(rodent: RodentResponse): string | null {
    const primary = rodent.images.find(img => img.is_primary);
    if (primary) {
      return `data:${primary.content_type};base64,${primary.data}`;
    }
    return rodent.images.length > 0
      ? `data:${rodent.images[0].content_type};base64,${rodent.images[0].data}`
      : null;
  }

  canManageRodents(): boolean {
    return this.authService.canManageRodents();
  }

  clearFilters(): void {
    this.searchName = '';
    this.selectedSpecies = null;
    this.selectedStatus = null;
    this.selectedSort = 'created_at:desc';
    this.first = 0;
    this.loadRodents();
  }
}
