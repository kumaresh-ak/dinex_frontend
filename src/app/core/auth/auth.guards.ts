import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isLoggedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Allows the route only for the listed roles and redirects everyone else to their own home. */
export function roleGuard(...roles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role();
    if (role === null) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    return roles.includes(role) ? true : router.parseUrl(auth.homeRoute());
  };
}

/** Sends the root path to the home page of the signed-in role. */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return inject(Router).parseUrl(auth.homeRoute());
};
