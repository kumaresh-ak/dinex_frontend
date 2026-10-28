import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { apiBaseInterceptor } from './core/http/api-base.interceptor';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, apiBaseInterceptor])),
    // Restores the signed-in session from the refresh cookie before the first navigation.
    { provide: APP_INITIALIZER, useFactory: (auth: AuthService) => () => auth.restore(), deps: [AuthService], multi: true },
  ]
};
