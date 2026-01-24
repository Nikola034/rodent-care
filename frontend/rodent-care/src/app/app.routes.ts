import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth/auth-guard';
import { AdminGuard } from './services/auth/admin-guard';
import { RodentManagerGuard } from './services/auth/rodent-manager-guard';
import { VeterinarianGuard } from './services/auth/veterinarian-guard';

export const routes: Routes = [
  // Public routes
  {
    path: '',
    loadComponent: () => import('./components/auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register').then(m => m.Register)
  },

  // Protected routes (require authentication)
  {
    path: 'app',
    loadComponent: () => import('./components/layout/layout').then(m => m.Layout),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard)
      },
      // Rodent routes
      {
        path: 'rodents',
        loadComponent: () => import('./components/rodent/rodent-list/rodent-list').then(m => m.RodentList)
      },
      {
        path: 'rodents/new',
        loadComponent: () => import('./components/rodent/rodent-form/rodent-form').then(m => m.RodentForm),
        canActivate: [RodentManagerGuard]
      },
      {
        path: 'rodents/:id',
        loadComponent: () => import('./components/rodent/rodent-detail/rodent-detail').then(m => m.RodentDetail)
      },
      {
        path: 'rodents/:id/edit',
        loadComponent: () => import('./components/rodent/rodent-form/rodent-form').then(m => m.RodentForm),
        canActivate: [RodentManagerGuard]
      },
      {
        path: 'rodents/:id/medical-records',
        loadComponent: () => import('./components/medical/medical-records/medical-records').then(m => m.MedicalRecords)
      },
      {
        path: 'rodents/:id/activity',
        loadComponent: () => import('./components/activity/activity-tracking/activity-tracking').then(m => m.ActivityTracking)
      },
      // Profile route
      {
        path: 'profile',
        loadComponent: () => import('./components/profile/profile').then(m => m.Profile)
      },
      // Admin routes
      {
        path: 'users',
        loadComponent: () => import('./components/admin/user-management/user-management').then(m => m.UserManagement),
        canActivate: [AdminGuard]
      },
      // Redirect unknown child routes to dashboard
      {
        path: '**',
        redirectTo: ''
      }
    ]
  },

  // Redirect unknown routes to login
  {
    path: '**',
    redirectTo: ''
  }
];
