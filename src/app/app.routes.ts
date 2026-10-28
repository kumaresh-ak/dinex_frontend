import { Routes } from '@angular/router';
import { authGuard, homeGuard, roleGuard } from './core/auth/auth.guards';

const HOTEL_NAV = [
  { label: 'Dashboard', path: '/hotel/dashboard' },
  { label: 'Live orders', path: '/hotel/orders' },
  { label: 'Kitchen display', path: '/kitchen' },
  { label: 'Tables and QR', path: '/hotel/tables' },
  { label: 'Menu', path: '/hotel/menu' },
  { label: 'Billing', path: '/hotel/billing' },
  { label: 'Staff', path: '/hotel/staff' },
  { label: 'Reports', path: '/hotel/reports' },
  { label: 'Feedback', path: '/hotel/feedback' },
  { label: 'Notifications', path: '/hotel/notifications' },
  { label: 'Subscription', path: '/hotel/subscription' },
  { label: 'Support', path: '/hotel/support' },
  { label: 'Restaurant profile', path: '/hotel/profile' },
];

const ADMIN_NAV = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Hotels', path: '/admin/hotels' },
  { label: 'Subscriptions', path: '/admin/subscriptions' },
  { label: 'Support tickets', path: '/admin/support' },
  { label: 'Audit log', path: '/admin/audit' },
  { label: 'Settings', path: '/admin/settings' },
];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeGuard],
    loadComponent: () => import('./features/public/login.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/public/login.component').then(m => m.LoginPageComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/public/register.component').then(m => m.RegisterPageComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/public/forgot-password.component').then(m => m.ForgotPasswordPageComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/public/reset-password.component').then(m => m.ResetPasswordPageComponent),
  },
  {
    path: 'scan/:token',
    loadComponent: () => import('./features/guest/scan.component').then(m => m.ScanPageComponent),
  },
  {
    path: 'menu/:token',
    loadComponent: () => import('./features/guest/menu-entry.component').then(m => m.MenuEntryPageComponent),
  },
  {
    path: 'guest/:sessionToken',
    loadComponent: () => import('./features/guest/guest.component').then(m => m.GuestPageComponent),
  },
  {
    path: 'hotel',
    canActivate: [roleGuard('HOTEL_ADMIN')],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    data: { nav: HOTEL_NAV },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/hotel/dashboard.component').then(m => m.DashboardPageComponent) },
      { path: 'orders', loadComponent: () => import('./features/hotel/orders.component').then(m => m.OrdersPageComponent) },
      { path: 'tables', loadComponent: () => import('./features/hotel/tables.component').then(m => m.TablesPageComponent) },
      { path: 'menu', loadComponent: () => import('./features/hotel/menu.component').then(m => m.MenuPageComponent) },
      { path: 'billing', loadComponent: () => import('./features/hotel/billing.component').then(m => m.BillingPageComponent) },
      { path: 'staff', loadComponent: () => import('./features/hotel/staff.component').then(m => m.StaffPageComponent) },
      { path: 'reports', loadComponent: () => import('./features/hotel/reports.component').then(m => m.ReportsPageComponent) },
      { path: 'feedback', loadComponent: () => import('./features/hotel/feedback.component').then(m => m.FeedbackPageComponent) },
      { path: 'notifications', loadComponent: () => import('./features/hotel/notifications.component').then(m => m.NotificationsPageComponent) },
      { path: 'subscription', loadComponent: () => import('./features/hotel/subscription.component').then(m => m.SubscriptionPageComponent) },
      { path: 'support', loadComponent: () => import('./features/hotel/support.component').then(m => m.HotelSupportPageComponent) },
      { path: 'profile', loadComponent: () => import('./features/hotel/profile.component').then(m => m.ProfilePageComponent) },
      { path: 'account', loadComponent: () => import('./features/account/account.component').then(m => m.AccountPageComponent) },
    ],
  },
  {
    path: 'kitchen',
    canActivate: [authGuard, roleGuard('CHEF', 'HOTEL_ADMIN')],
    loadComponent: () => import('./features/kitchen/kitchen.component').then(m => m.KitchenPageComponent),
  },
  {
    path: 'admin',
    canActivate: [roleGuard('SUPER_ADMIN')],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    data: { nav: ADMIN_NAV },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard.component').then(m => m.AdminDashboardPageComponent) },
      { path: 'hotels', loadComponent: () => import('./features/admin/hotels.component').then(m => m.HotelsPageComponent) },
      { path: 'subscriptions', loadComponent: () => import('./features/admin/subscriptions.component').then(m => m.SubscriptionsPageComponent) },
      { path: 'support', loadComponent: () => import('./features/admin/support.component').then(m => m.AdminSupportPageComponent) },
      { path: 'audit', loadComponent: () => import('./features/admin/audit.component').then(m => m.AuditPageComponent) },
      { path: 'settings', loadComponent: () => import('./features/admin/settings.component').then(m => m.SettingsPageComponent) },
      { path: 'account', loadComponent: () => import('./features/account/account.component').then(m => m.AccountPageComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
