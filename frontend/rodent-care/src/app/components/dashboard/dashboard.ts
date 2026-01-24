import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { RodentService } from '../../services/rodent/rodent-service';
import { AuthService } from '../../services/auth/auth-service';
import { RodentResponse, RodentStatus, getStatusSeverity, RODENT_STATUS_OPTIONS } from '../../dto/rodent';

interface DashboardStats {
  totalRodents: number;
  activeRodents: number;
  inMedicalCare: number;
  inQuarantine: number;
  adopted: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    ChartModule,
    TableModule,
    TagModule,
    SkeletonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: 'dashboard.html'
})
export class Dashboard implements OnInit, OnDestroy {
  stats: DashboardStats = {
    totalRodents: 0,
    activeRodents: 0,
    inMedicalCare: 0,
    inQuarantine: 0,
    adopted: 0
  };

  recentRodents: RodentResponse[] = [];
  isLoading = true;

  statusChartData: any;
  statusChartOptions: any;

  private destroy$ = new Subject<void>();

  constructor(
    private rodentService: RodentService,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.initChartOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    this.rodentService.listRodents({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.calculateStats(response.rodents);
          this.recentRodents = response.rodents.slice(0, 5);
          this.updateChart();
          this.isLoading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load dashboard data',
            life: 5000
          });
          this.isLoading = false;
        }
      });
  }

  private calculateStats(rodents: RodentResponse[]): void {
    this.stats = {
      totalRodents: rodents.length,
      activeRodents: rodents.filter(r => r.status === 'active').length,
      inMedicalCare: rodents.filter(r => r.status === 'medical_care').length,
      inQuarantine: rodents.filter(r => r.status === 'quarantine').length,
      adopted: rodents.filter(r => r.status === 'adopted').length
    };
  }

  private initChartOptions(): void {
    this.statusChartOptions = {
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true
          }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };
  }

  private updateChart(): void {
    this.statusChartData = {
      labels: ['Active', 'Medical Care', 'Quarantine', 'Adopted', 'Deceased'],
      datasets: [
        {
          data: [
            this.stats.activeRodents,
            this.stats.inMedicalCare,
            this.stats.inQuarantine,
            this.stats.adopted,
            this.stats.totalRodents - this.stats.activeRodents - this.stats.inMedicalCare - this.stats.inQuarantine - this.stats.adopted
          ],
          backgroundColor: ['#22C55E', '#EF4444', '#F59E0B', '#3B82F6', '#6B7280'],
          hoverBackgroundColor: ['#16A34A', '#DC2626', '#D97706', '#2563EB', '#4B5563']
        }
      ]
    };
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

  navigateToRodents(): void {
    this.router.navigate(['/app/rodents']);
  }

  navigateToRodent(id: string): void {
    this.router.navigate(['/app/rodents', id]);
  }

  navigateToAddRodent(): void {
    this.router.navigate(['/app/rodents/new']);
  }

  canManageRodents(): boolean {
    return this.authService.canManageRodents();
  }

  get username(): string {
    return this.authService.getUsernameFromToken() || 'User';
  }
}
