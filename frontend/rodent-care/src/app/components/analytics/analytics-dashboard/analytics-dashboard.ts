import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil, debounceTime } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { AnalyticsService } from '../../../services/analytics/analytics-service';
import { AuthService } from '../../../services/auth/auth-service';
import {
  PopulationStatsResponse,
  HealthAnalyticsResponse,
  ActivityAnalyticsResponse,
  FeedingAnalyticsResponse,
  DashboardSummaryResponse,
  TrendDataResponse,
  AnalyticsQueryParams
} from '../../../dto/analytics';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TabViewModule,
    ChartModule,
    TableModule,
    TagModule,
    CalendarModule,
    DropdownModule,
    ToastModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  providers: [MessageService],
  templateUrl: 'analytics-dashboard.html'
})
export class AnalyticsDashboard implements OnInit, OnDestroy {
  isLoading = true;
  isExporting = false;

  // Date range
  dateRange: Date[] = [];
  maxDate = new Date();

  // Dashboard Summary
  dashboardSummary: DashboardSummaryResponse | null = null;

  // Analytics Data
  populationStats: PopulationStatsResponse | null = null;
  healthAnalytics: HealthAnalyticsResponse | null = null;
  activityAnalytics: ActivityAnalyticsResponse | null = null;
  feedingAnalytics: FeedingAnalyticsResponse | null = null;

  // Trend Data
  weightTrends: TrendDataResponse | null = null;
  activityTrends: TrendDataResponse | null = null;
  feedingTrends: TrendDataResponse | null = null;

  // Chart Options
  speciesChartData: any;
  genderChartData: any;
  statusChartData: any;
  activityTypeChartData: any;
  feedingTypeChartData: any;
  weightTrendChartData: any;
  activityTrendChartData: any;
  feedingTrendChartData: any;
  hourlyActivityChartData: any;
  hourlyFeedingChartData: any;

  basicOptions: any;
  pieOptions: any;

  // Dropdown options
  periodOptions = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
    { label: 'Last Year', value: 365 }
  ];
  selectedPeriod = 30;

  // Species filter
  speciesOptions: { label: string; value: string }[] = [];
  selectedSpecies: string | null = null;

  private destroy$ = new Subject<void>();
  private filterChange$ = new Subject<void>();

  constructor(
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.initChartOptions();
    this.initDateRange();
    
    // Debounce filter changes to prevent rate limiting
    this.filterChange$
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.loadAllData());
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initDateRange(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - this.selectedPeriod);
    this.dateRange = [start, end];
  }

  private initChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.pieOptions = {
      plugins: {
        legend: {
          labels: {
            usePointStyle: true,
            color: textColor
          }
        }
      }
    };

    this.basicOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder
          }
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder
          }
        }
      }
    };
  }

  loadAllData(): void {
    this.isLoading = true;
    const params = this.getQueryParams();

    forkJoin({
      dashboard: this.analyticsService.getDashboardSummary(),
      population: this.analyticsService.getPopulationStats(params),
      health: this.analyticsService.getHealthAnalytics(params),
      activity: this.analyticsService.getActivityAnalytics(params),
      feeding: this.analyticsService.getFeedingAnalytics(params),
      weightTrends: this.analyticsService.getWeightTrends(params),
      activityTrends: this.analyticsService.getActivityTrends(params),
      feedingTrends: this.analyticsService.getFeedingTrends(params)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardSummary = data.dashboard;
          this.populationStats = data.population;
          this.healthAnalytics = data.health;
          this.activityAnalytics = data.activity;
          this.feedingAnalytics = data.feeding;
          this.weightTrends = data.weightTrends;
          this.activityTrends = data.activityTrends;
          this.feedingTrends = data.feedingTrends;

          this.updateCharts();
          this.isLoading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load analytics data',
            life: 5000
          });
          this.isLoading = false;
        }
      });
  }

  private getQueryParams(): AnalyticsQueryParams {
    const params: AnalyticsQueryParams = {};
    if (this.dateRange.length === 2) {
      params.from_date = this.dateRange[0].toISOString();
      params.to_date = this.dateRange[1].toISOString();
    }
    if (this.selectedSpecies) {
      params.species = this.selectedSpecies;
    }
    return params;
  }

  onPeriodChange(): void {
    this.initDateRange();
    this.filterChange$.next();
  }

  onSpeciesChange(): void {
    this.filterChange$.next();
  }

  onDateRangeChange(): void {
    if (this.dateRange.length === 2 && this.dateRange[0] && this.dateRange[1]) {
      this.filterChange$.next();
    }
  }

  private updateCharts(): void {
    this.updateSpeciesOptions();
    this.updateSpeciesChart();
    this.updateGenderChart();
    this.updateStatusChart();
    this.updateActivityTypeChart();
    this.updateFeedingTypeChart();
    this.updateTrendCharts();
    this.updateHourlyCharts();
  }

  private updateSpeciesOptions(): void {
    if (!this.populationStats) return;
    
    this.speciesOptions = [
      { label: 'All Species', value: '' },
      ...this.populationStats.by_species.map(s => ({
        label: this.formatSpeciesLabel(s.species),
        value: s.species
      }))
    ];
  }

  private updateSpeciesChart(): void {
    if (!this.populationStats) return;

    const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA', '#EC407A'];
    this.speciesChartData = {
      labels: this.populationStats.by_species.map(s => this.formatSpeciesLabel(s.species)),
      datasets: [{
        data: this.populationStats.by_species.map(s => s.count),
        backgroundColor: colors.slice(0, this.populationStats.by_species.length)
      }]
    };
  }

  private updateGenderChart(): void {
    if (!this.populationStats) return;

    this.genderChartData = {
      labels: ['Male', 'Female', 'Unknown'],
      datasets: [{
        data: [
          this.populationStats.by_gender.male,
          this.populationStats.by_gender.female,
          this.populationStats.by_gender.unknown
        ],
        backgroundColor: ['#42A5F5', '#EC407A', '#9E9E9E']
      }]
    };
  }

  private updateStatusChart(): void {
    if (!this.populationStats) return;

    const colors = ['#66BB6A', '#FFA726', '#42A5F5', '#AB47BC', '#EF5350'];
    this.statusChartData = {
      labels: this.populationStats.by_status.map(s => this.formatStatusLabel(s.status)),
      datasets: [{
        data: this.populationStats.by_status.map(s => s.count),
        backgroundColor: colors.slice(0, this.populationStats.by_status.length)
      }]
    };
  }

  private updateActivityTypeChart(): void {
    if (!this.activityAnalytics) return;

    this.activityTypeChartData = {
      labels: this.activityAnalytics.by_activity_type.map(a => this.formatActivityTypeLabel(a.activity_type)),
      datasets: [{
        label: 'Total Minutes',
        data: this.activityAnalytics.by_activity_type.map(a => a.total_minutes),
        backgroundColor: '#42A5F5'
      }]
    };
  }

  private updateFeedingTypeChart(): void {
    if (!this.feedingAnalytics) return;

    this.feedingTypeChartData = {
      labels: this.feedingAnalytics.by_food_type.map(f => this.formatFoodTypeLabel(f.food_type)),
      datasets: [{
        label: 'Total Grams',
        data: this.feedingAnalytics.by_food_type.map(f => f.total_grams),
        backgroundColor: '#FFA726'
      }]
    };
  }

  private updateTrendCharts(): void {
    if (this.weightTrends) {
      this.weightTrendChartData = {
        labels: this.weightTrends.data_points.map(p => p.date),
        datasets: [{
          label: 'Average Weight (g)',
          data: this.weightTrends.data_points.map(p => p.value),
          fill: false,
          borderColor: '#42A5F5',
          tension: 0.4
        }]
      };
    }

    if (this.activityTrends) {
      this.activityTrendChartData = {
        labels: this.activityTrends.data_points.map(p => p.date),
        datasets: [{
          label: 'Activity Minutes',
          data: this.activityTrends.data_points.map(p => p.value),
          fill: false,
          borderColor: '#66BB6A',
          tension: 0.4
        }]
      };
    }

    if (this.feedingTrends) {
      this.feedingTrendChartData = {
        labels: this.feedingTrends.data_points.map(p => p.date),
        datasets: [{
          label: 'Food Consumption (g)',
          data: this.feedingTrends.data_points.map(p => p.value),
          fill: false,
          borderColor: '#FFA726',
          tension: 0.4
        }]
      };
    }
  }

  private updateHourlyCharts(): void {
    if (this.activityAnalytics) {
      const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const activityByHour = new Array(24).fill(0);
      this.activityAnalytics.activity_by_hour.forEach(h => {
        activityByHour[h.hour] = h.total_minutes;
      });

      this.hourlyActivityChartData = {
        labels: hours,
        datasets: [{
          label: 'Activity Minutes',
          data: activityByHour,
          backgroundColor: '#42A5F5'
        }]
      };
    }

    if (this.feedingAnalytics) {
      const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
      const feedingByHour = new Array(24).fill(0);
      this.feedingAnalytics.feeding_by_hour.forEach(h => {
        feedingByHour[h.hour] = h.total_grams;
      });

      this.hourlyFeedingChartData = {
        labels: hours,
        datasets: [{
          label: 'Food (g)',
          data: feedingByHour,
          backgroundColor: '#FFA726'
        }]
      };
    }
  }

  // ==================== Export Functions ====================

  exportPopulation(): void {
    this.isExporting = true;
    const params = { ...this.getQueryParams(), format: 'csv' as const };

    this.analyticsService.exportPopulationCsv(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.analyticsService.downloadCsv(data, 'population-report.csv');
          this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'Population data exported successfully',
            life: 3000
          });
          this.isExporting = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to export population data',
            life: 5000
          });
          this.isExporting = false;
        }
      });
  }

  exportActivity(): void {
    this.isExporting = true;
    const params = { ...this.getQueryParams(), format: 'csv' as const };

    this.analyticsService.exportActivityCsv(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.analyticsService.downloadCsv(data, 'activity-report.csv');
          this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'Activity data exported successfully',
            life: 3000
          });
          this.isExporting = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to export activity data',
            life: 5000
          });
          this.isExporting = false;
        }
      });
  }

  exportFeeding(): void {
    this.isExporting = true;
    const params = { ...this.getQueryParams(), format: 'csv' as const };

    this.analyticsService.exportFeedingCsv(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.analyticsService.downloadCsv(data, 'feeding-report.csv');
          this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: 'Feeding data exported successfully',
            life: 3000
          });
          this.isExporting = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to export feeding data',
            life: 5000
          });
          this.isExporting = false;
        }
      });
  }

  // ==================== Helper Functions ====================

  formatSpeciesLabel(species: string): string {
    return species.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  formatStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Available',
      adopted: 'Adopted',
      medical_care: 'Medical Care',
      quarantine: 'Quarantine',
      deceased: 'Deceased'
    };
    return labels[status] || status;
  }

  formatActivityTypeLabel(type: string): string {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  formatFoodTypeLabel(type: string): string {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  getStatusSeverity(status: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    const severities: Record<string, "success" | "secondary" | "info" | "warn" | "danger"> = {
      available: 'success',
      adopted: 'info',
      medical_care: 'warn',
      quarantine: 'warn',
      deceased: 'danger'
    };
    return severities[status] || 'secondary';
  }

  canViewAnalytics(): boolean {
    const role = this.authService.getCurrentUser()?.role;
    return role === 'Admin' || role === 'Caretaker' || role === 'Veterinarian';
  }
}
