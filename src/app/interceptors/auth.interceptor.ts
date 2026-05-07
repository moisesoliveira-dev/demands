import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, retry, throwError, timeout, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/** Functional interceptor: injects Bearer token, applies timeout/retry,
 *  and clears auth on 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const token = auth.token();

    const request = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    let stream = next(request);

    // AI endpoints (LLM generation) can take much longer — skip the global timeout for them.
    const isAiRequest = !!environment.aiUrl && req.url.startsWith(environment.aiUrl);
    if (environment.apiTimeoutMs > 0 && !isAiRequest) {
        stream = stream.pipe(timeout({ each: environment.apiTimeoutMs }));
    }

    if (environment.apiRetries > 0 && req.method === 'GET') {
        stream = stream.pipe(
            retry({
                count: environment.apiRetries,
                delay: (err, attempt) => {
                    // só refaz em erros de rede ou 5xx
                    const status = (err as HttpErrorResponse)?.status;
                    if (status && status >= 400 && status < 500) return throwError(() => err);
                    return timer(Math.min(1000 * attempt, 4000));
                },
            }),
        );
    }

    return stream.pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401 && auth.isAuthenticated()) {
                auth.logout();
                router.navigate(['/login']);
            }
            return throwError(() => err);
        }),
    );
};
