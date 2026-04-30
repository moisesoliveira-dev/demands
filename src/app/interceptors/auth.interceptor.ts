import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Functional interceptor: injects Bearer token and clears auth on 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const token = auth.token();

    const request = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(request).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401 && auth.isAuthenticated()) {
                auth.logout();
                router.navigate(['/login']);
            }
            return throwError(() => err);
        }),
    );
};
