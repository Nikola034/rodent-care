import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, takeUntil, debounceTime } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
import { DividerModule } from 'primeng/divider';
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
    RouterLink,
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
    TooltipModule,
    DividerModule
  ],
  providers: [MessageService],
  templateUrl: 'analytics-dashboard.html'
})
export class AnalyticsDashboard implements OnInit, OnDestroy {
  isLoading = true;
  isExporting = false;
  isGeneratingReport = false;

  // Report options
  reportTypes = [
    { label: 'Activity Report', value: 'activity', icon: 'pi-clock' },
    { label: 'Feeding Report', value: 'feeding', icon: 'pi-th-large' },
    { label: 'Population Statistics', value: 'population', icon: 'pi-users' },
    { label: 'Health Report', value: 'health', icon: 'pi-heart' }
  ];
  reportPeriods = [
    { label: 'Monthly Report', value: 'monthly' },
    { label: 'Annual Report', value: 'annual' }
  ];

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

  formatRecordType(type: string): string {
    const labels: Record<string, string> = {
      vaccination: 'Vaccination',
      treatment: 'Treatment',
      diagnosis: 'Diagnosis',
      surgery: 'Surgery',
      check_up: 'Check-up'
    };
    return labels[type] || type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  getRecordTypeSeverity(type: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    const severities: Record<string, "success" | "secondary" | "info" | "warn" | "danger"> = {
      vaccination: 'success',
      treatment: 'warn',
      diagnosis: 'info',
      surgery: 'danger',
      check_up: 'secondary'
    };
    return severities[type] || 'secondary';
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

  // ==================== PDF Report Generation ====================

  generateReport(reportType: string, period: 'monthly' | 'annual'): void {
    this.isGeneratingReport = true;
    const periodLabel = period === 'monthly' ? 'Monthly' : 'Annual';
    const dateRange = this.getReportDateRange(period);
    
    // Build query params for the report period
    const reportParams: AnalyticsQueryParams = {
      from_date: dateRange.start.toISOString(),
      to_date: dateRange.end.toISOString()
    };
    if (this.selectedSpecies) {
      reportParams.species = this.selectedSpecies;
    }

    // Fetch fresh data for the report period
    forkJoin({
      population: this.analyticsService.getPopulationStats(reportParams),
      health: this.analyticsService.getHealthAnalytics(reportParams),
      activity: this.analyticsService.getActivityAnalytics(reportParams),
      feeding: this.analyticsService.getFeedingAnalytics(reportParams)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.buildAndDownloadReport(reportType, period, dateRange, data);
          this.isGeneratingReport = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch data for report',
            life: 5000
          });
          this.isGeneratingReport = false;
        }
      });
  }

  private buildAndDownloadReport(
    reportType: string,
    period: 'monthly' | 'annual',
    dateRange: { start: Date; end: Date },
    data: {
      population: PopulationStatsResponse;
      health: HealthAnalyticsResponse;
      activity: ActivityAnalyticsResponse;
      feeding: FeedingAnalyticsResponse;
    }
  ): void {
    const doc = new jsPDF();
    const currentDate = new Date();
    const periodLabel = period === 'monthly' ? 'Monthly' : 'Annual';
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(60, 60, 60);
    doc.text('Rodent Care Center', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(80, 80, 80);
    const reportTitle = this.getReportTitle(reportType);
    doc.text(`${periodLabel} ${reportTitle}`, 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Period: ${this.formatDate(dateRange.start)} - ${this.formatDate(dateRange.end)}`, 105, 38, { align: 'center' });
    doc.text(`Generated: ${this.formatDate(currentDate)}`, 105, 44, { align: 'center' });
    
    let yPosition = 55;

    switch (reportType) {
      case 'activity':
        yPosition = this.generateActivityReportWithData(doc, yPosition, data.activity);
        break;
      case 'feeding':
        yPosition = this.generateFeedingReportWithData(doc, yPosition, data.feeding);
        break;
      case 'population':
        yPosition = this.generatePopulationReportWithData(doc, yPosition, data.population);
        break;
      case 'health':
        yPosition = this.generateHealthReportWithData(doc, yPosition, data.health);
        break;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    // Save PDF
    const fileName = `${reportType}_${period}_report_${this.formatDateForFilename(currentDate)}.pdf`;
    doc.save(fileName);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Report Generated',
      detail: `${periodLabel} ${reportTitle} has been downloaded`
    });
  }

  generateAllReports(period: 'monthly' | 'annual'): void {
    this.isGeneratingReport = true;
    const dateRange = this.getReportDateRange(period);
    
    // Build query params for the report period
    const reportParams: AnalyticsQueryParams = {
      from_date: dateRange.start.toISOString(),
      to_date: dateRange.end.toISOString()
    };
    if (this.selectedSpecies) {
      reportParams.species = this.selectedSpecies;
    }

    // Fetch all data once for all reports
    forkJoin({
      population: this.analyticsService.getPopulationStats(reportParams),
      health: this.analyticsService.getHealthAnalytics(reportParams),
      activity: this.analyticsService.getActivityAnalytics(reportParams),
      feeding: this.analyticsService.getFeedingAnalytics(reportParams)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const types = ['activity', 'feeding', 'population', 'health'];
          types.forEach((type) => {
            this.buildAndDownloadReportSilent(type, period, dateRange, data);
          });
          
          this.isGeneratingReport = false;
          this.messageService.add({
            severity: 'success',
            summary: 'All Reports Generated',
            detail: `All ${period} reports have been downloaded`
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch data for reports',
            life: 5000
          });
          this.isGeneratingReport = false;
        }
      });
  }

  private buildAndDownloadReportSilent(
    reportType: string,
    period: 'monthly' | 'annual',
    dateRange: { start: Date; end: Date },
    data: {
      population: PopulationStatsResponse;
      health: HealthAnalyticsResponse;
      activity: ActivityAnalyticsResponse;
      feeding: FeedingAnalyticsResponse;
    }
  ): void {
    const doc = new jsPDF();
    const currentDate = new Date();
    const periodLabel = period === 'monthly' ? 'Monthly' : 'Annual';
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(60, 60, 60);
    doc.text('Rodent Care Center', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(80, 80, 80);
    const reportTitle = this.getReportTitle(reportType);
    doc.text(`${periodLabel} ${reportTitle}`, 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Period: ${this.formatDate(dateRange.start)} - ${this.formatDate(dateRange.end)}`, 105, 38, { align: 'center' });
    doc.text(`Generated: ${this.formatDate(currentDate)}`, 105, 44, { align: 'center' });
    
    let yPosition = 55;

    switch (reportType) {
      case 'activity':
        yPosition = this.generateActivityReportWithData(doc, yPosition, data.activity);
        break;
      case 'feeding':
        yPosition = this.generateFeedingReportWithData(doc, yPosition, data.feeding);
        break;
      case 'population':
        yPosition = this.generatePopulationReportWithData(doc, yPosition, data.population);
        break;
      case 'health':
        yPosition = this.generateHealthReportWithData(doc, yPosition, data.health);
        break;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    const fileName = `${reportType}_${period}_report_${this.formatDateForFilename(currentDate)}.pdf`;
    doc.save(fileName);
  }

  private getReportDateRange(period: 'monthly' | 'annual'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    if (period === 'monthly') {
      start.setMonth(start.getMonth() - 1);
    } else {
      start.setFullYear(start.getFullYear() - 1);
    }
    return { start, end };
  }

  private getReportTitle(type: string): string {
    const titles: Record<string, string> = {
      activity: 'Activity Report',
      feeding: 'Feeding Report',
      population: 'Population Statistics',
      health: 'Health Report'
    };
    return titles[type] || 'Report';
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private generateActivityReport(doc: jsPDF, startY: number): number {
    let y = startY;

    if (this.activityAnalytics) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Activity Summary', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Activity Duration: ${this.activityAnalytics.total_activity_minutes} minutes`, 14, y);
      y += 6;
      doc.text(`Average Daily Activity: ${this.activityAnalytics.avg_daily_activity.toFixed(1)} minutes`, 14, y);
      y += 12;

      // Activity by Type Table
      if (this.activityAnalytics.by_activity_type?.length > 0) {
        doc.setFontSize(12);
        doc.text('Activity by Type', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Activity Type', 'Sessions', 'Total Minutes', 'Avg Duration']],
          body: this.activityAnalytics.by_activity_type.map((item: any) => [
            this.formatActivityTypeLabel(item.activity_type),
            item.session_count.toString(),
            item.total_minutes.toString(),
            item.avg_duration.toFixed(1)
          ]),
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Most Active Rodents Table
      if (this.activityAnalytics.most_active_rodents?.length > 0) {
        doc.setFontSize(12);
        doc.text('Most Active Rodents', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Rodent Name', 'Total Minutes', 'Session Count']],
          body: this.activityAnalytics.most_active_rodents.map((item: any) => [
            item.rodent_name,
            item.total_minutes.toString(),
            item.session_count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No activity data available for the selected period.', 14, y);
      y += 10;
    }

    return y;
  }

  private generateFeedingReport(doc: jsPDF, startY: number): number {
    let y = startY;

    if (this.feedingAnalytics) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Feeding Summary', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Food Consumed: ${this.feedingAnalytics.total_food_grams.toFixed(1)} grams`, 14, y);
      y += 6;
      doc.text(`Average Daily Food: ${this.feedingAnalytics.avg_daily_food.toFixed(1)} grams`, 14, y);
      y += 6;
      doc.text(`Consumption Rate: ${(this.feedingAnalytics.consumption_rate * 100).toFixed(1)}%`, 14, y);
      y += 12;

      // Feeding by Food Type Table
      if (this.feedingAnalytics.by_food_type?.length > 0) {
        doc.setFontSize(12);
        doc.text('Consumption by Food Type', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Food Type', 'Feeding Count', 'Total Grams', 'Avg Quantity']],
          body: this.feedingAnalytics.by_food_type.map((item: any) => [
            this.formatFoodTypeLabel(item.food_type),
            item.feeding_count.toString(),
            item.total_grams.toFixed(1),
            item.avg_quantity.toFixed(1)
          ]),
          theme: 'striped',
          headStyles: { fillColor: [92, 184, 92] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Top Consumers Table
      if (this.feedingAnalytics.top_consumers?.length > 0) {
        doc.setFontSize(12);
        doc.text('Top Consumers', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Rodent Name', 'Total Grams', 'Feeding Count']],
          body: this.feedingAnalytics.top_consumers.map(item => [
            item.rodent_name,
            item.total_grams.toFixed(1),
            item.feeding_count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [92, 184, 92] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No feeding data available for the selected period.', 14, y);
      y += 10;
    }

    return y;
  }

  private generatePopulationReport(doc: jsPDF, startY: number): number {
    let y = startY;

    if (this.populationStats) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Population Overview', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Rodents: ${this.populationStats.total_rodents}`, 14, y);
      y += 6;
      doc.text(`Recent Intakes: ${this.populationStats.recent_intakes}`, 14, y);
      y += 6;
      doc.text(`Recent Adoptions: ${this.populationStats.recent_adoptions}`, 14, y);
      y += 12;

      // Species Distribution Table
      if (this.populationStats.by_species?.length > 0) {
        doc.setFontSize(12);
        doc.text('Distribution by Species', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Species', 'Count', 'Percentage']],
          body: this.populationStats.by_species.map((item: any) => [
            this.formatSpeciesLabel(item.species),
            item.count.toString(),
            `${item.percentage.toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [240, 173, 78] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Gender Distribution Table
      if (this.populationStats.by_gender) {
        doc.setFontSize(12);
        doc.text('Distribution by Gender', 14, y);
        y += 6;

        const genderData = [
          ['Male', this.populationStats.by_gender.male.toString(), `${((this.populationStats.by_gender.male / this.populationStats.total_rodents) * 100).toFixed(1)}%`],
          ['Female', this.populationStats.by_gender.female.toString(), `${((this.populationStats.by_gender.female / this.populationStats.total_rodents) * 100).toFixed(1)}%`],
          ['Unknown', this.populationStats.by_gender.unknown.toString(), `${((this.populationStats.by_gender.unknown / this.populationStats.total_rodents) * 100).toFixed(1)}%`]
        ];

        autoTable(doc, {
          startY: y,
          head: [['Gender', 'Count', 'Percentage']],
          body: genderData,
          theme: 'striped',
          headStyles: { fillColor: [240, 173, 78] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Status Distribution Table
      if (this.populationStats.by_status?.length > 0) {
        doc.setFontSize(12);
        doc.text('Distribution by Status', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Status', 'Count', 'Percentage']],
          body: this.populationStats.by_status.map((item: any) => [
            this.formatStatusLabel(item.status),
            item.count.toString(),
            `${((item.count / this.populationStats!.total_rodents) * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [240, 173, 78] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No population data available.', 14, y);
      y += 10;
    }

    return y;
  }

  private generateHealthReport(doc: jsPDF, startY: number): number {
    let y = startY;

    if (this.healthAnalytics) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Health Overview', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Health Observations: ${this.healthAnalytics.health_observations_count}`, 14, y);
      y += 6;
      doc.text(`Medical Records: ${this.healthAnalytics.recent_treatments?.length || 0}`, 14, y);
      y += 12;

      // Treatments by Type Table
      if (this.healthAnalytics.treatments_by_type?.length > 0) {
        doc.setFontSize(12);
        doc.text('Medical Records by Type', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Record Type', 'Count']],
          body: this.healthAnalytics.treatments_by_type.map(item => [
            this.formatRecordType(item.record_type),
            item.count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [217, 83, 79] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Recent Treatments Table
      if (this.healthAnalytics.recent_treatments?.length > 0) {
        doc.setFontSize(12);
        doc.text('Recent Medical Records', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Rodent', 'Type', 'Description', 'Veterinarian']],
          body: this.healthAnalytics.recent_treatments.map(item => [
            new Date(item.date).toLocaleDateString(),
            item.rodent_name,
            this.formatRecordType(item.record_type),
            item.description.length > 30 ? item.description.substring(0, 30) + '...' : item.description,
            item.veterinarian_name
          ]),
          theme: 'striped',
          headStyles: { fillColor: [217, 83, 79] },
          columnStyles: {
            3: { cellWidth: 50 }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No health data available for the selected period.', 14, y);
      y += 10;
    }

    return y;
  }

  // ==================== Report Generation Methods with Data ====================

  private generateActivityReportWithData(doc: jsPDF, startY: number, activityData: ActivityAnalyticsResponse | null): number {
    let y = startY;

    if (activityData) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Activity Summary', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Activity Duration: ${activityData.total_activity_minutes} minutes`, 14, y);
      y += 6;
      doc.text(`Average Daily Activity: ${activityData.avg_daily_activity.toFixed(1)} minutes`, 14, y);
      y += 12;

      // Activity by Type Table
      if (activityData.by_activity_type?.length > 0) {
        doc.setFontSize(12);
        doc.text('Activity by Type', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Activity Type', 'Sessions', 'Total Minutes', 'Avg Duration']],
          body: activityData.by_activity_type.map((item: any) => [
            this.formatActivityTypeLabel(item.activity_type),
            item.session_count.toString(),
            item.total_minutes.toString(),
            item.avg_duration.toFixed(1)
          ]),
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Most Active Rodents Table
      if (activityData.most_active_rodents?.length > 0) {
        doc.setFontSize(12);
        doc.text('Most Active Rodents', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Rodent Name', 'Total Minutes', 'Session Count']],
          body: activityData.most_active_rodents.map((item: any) => [
            item.rodent_name,
            item.total_minutes.toString(),
            item.session_count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No activity data available for the selected period.', 14, y);
      y += 10;
    }

    return y;
  }

  private generateFeedingReportWithData(doc: jsPDF, startY: number, feedingData: FeedingAnalyticsResponse | null): number {
    let y = startY;

    if (feedingData) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Feeding Summary', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Food Consumed: ${feedingData.total_food_grams.toFixed(1)} grams`, 14, y);
      y += 6;
      doc.text(`Average Daily Food: ${feedingData.avg_daily_food.toFixed(1)} grams`, 14, y);
      y += 6;
      doc.text(`Consumption Rate: ${(feedingData.consumption_rate * 100).toFixed(1)}%`, 14, y);
      y += 12;

      // Feeding by Food Type Table
      if (feedingData.by_food_type?.length > 0) {
        doc.setFontSize(12);
        doc.text('Consumption by Food Type', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Food Type', 'Feeding Count', 'Total Grams', 'Avg Quantity']],
          body: feedingData.by_food_type.map((item: any) => [
            this.formatFoodTypeLabel(item.food_type),
            item.feeding_count.toString(),
            item.total_grams.toFixed(1),
            item.avg_quantity.toFixed(1)
          ]),
          theme: 'striped',
          headStyles: { fillColor: [92, 184, 92] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Top Consumers Table
      if (feedingData.top_consumers?.length > 0) {
        doc.setFontSize(12);
        doc.text('Top Consumers', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Rodent Name', 'Total Grams', 'Feeding Count']],
          body: feedingData.top_consumers.map(item => [
            item.rodent_name,
            item.total_grams.toFixed(1),
            item.feeding_count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [92, 184, 92] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No feeding data available for the selected period.', 14, y);
      y += 10;
    }

    return y;
  }

  private generatePopulationReportWithData(doc: jsPDF, startY: number, populationData: PopulationStatsResponse | null): number {
    let y = startY;

    if (populationData) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Population Overview', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Rodents: ${populationData.total_rodents}`, 14, y);
      y += 6;
      doc.text(`Recent Intakes: ${populationData.recent_intakes}`, 14, y);
      y += 6;
      doc.text(`Recent Adoptions: ${populationData.recent_adoptions}`, 14, y);
      y += 12;

      // Species Distribution Table
      if (populationData.by_species?.length > 0) {
        doc.setFontSize(12);
        doc.text('Distribution by Species', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Species', 'Count', 'Percentage']],
          body: populationData.by_species.map((item: any) => [
            this.formatSpeciesLabel(item.species),
            item.count.toString(),
            `${item.percentage.toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [240, 173, 78] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Gender Distribution Table
      if (populationData.by_gender) {
        doc.setFontSize(12);
        doc.text('Distribution by Gender', 14, y);
        y += 6;

        const totalRodents = populationData.total_rodents || 1;
        const genderData = [
          ['Male', populationData.by_gender.male.toString(), `${((populationData.by_gender.male / totalRodents) * 100).toFixed(1)}%`],
          ['Female', populationData.by_gender.female.toString(), `${((populationData.by_gender.female / totalRodents) * 100).toFixed(1)}%`],
          ['Unknown', populationData.by_gender.unknown.toString(), `${((populationData.by_gender.unknown / totalRodents) * 100).toFixed(1)}%`]
        ];

        autoTable(doc, {
          startY: y,
          head: [['Gender', 'Count', 'Percentage']],
          body: genderData,
          theme: 'striped',
          headStyles: { fillColor: [240, 173, 78] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Status Distribution Table
      if (populationData.by_status?.length > 0) {
        doc.setFontSize(12);
        doc.text('Distribution by Status', 14, y);
        y += 6;

        const totalRodents = populationData.total_rodents || 1;
        autoTable(doc, {
          startY: y,
          head: [['Status', 'Count', 'Percentage']],
          body: populationData.by_status.map((item: any) => [
            this.formatStatusLabel(item.status),
            item.count.toString(),
            `${((item.count / totalRodents) * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [240, 173, 78] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No population data available.', 14, y);
      y += 10;
    }

    return y;
  }

  private generateHealthReportWithData(doc: jsPDF, startY: number, healthData: HealthAnalyticsResponse | null): number {
    let y = startY;

    if (healthData) {
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text('Health Overview', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Health Observations: ${healthData.health_observations_count}`, 14, y);
      y += 6;
      doc.text(`Medical Records: ${healthData.recent_treatments?.length || 0}`, 14, y);
      y += 12;

      // Treatments by Type Table
      if (healthData.treatments_by_type?.length > 0) {
        doc.setFontSize(12);
        doc.text('Medical Records by Type', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Record Type', 'Count']],
          body: healthData.treatments_by_type.map(item => [
            this.formatRecordType(item.record_type),
            item.count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [217, 83, 79] }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Recent Treatments Table
      if (healthData.recent_treatments?.length > 0) {
        doc.setFontSize(12);
        doc.text('Recent Medical Records', 14, y);
        y += 6;

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Rodent', 'Type', 'Description', 'Veterinarian']],
          body: healthData.recent_treatments.map(item => [
            new Date(item.date).toLocaleDateString(),
            item.rodent_name,
            this.formatRecordType(item.record_type),
            item.description.length > 30 ? item.description.substring(0, 30) + '...' : item.description,
            item.veterinarian_name
          ]),
          theme: 'striped',
          headStyles: { fillColor: [217, 83, 79] },
          columnStyles: {
            3: { cellWidth: 50 }
          }
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }
    } else {
      doc.setFontSize(10);
      doc.text('No health data available for the selected period.', 14, y);
      y += 10;
    }

    return y;
  }
}
