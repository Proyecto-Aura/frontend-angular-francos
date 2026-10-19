import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../../modules/auth/services/auth.service';

describe('authGuard', () => {
  function run(isAuthenticated: boolean) {
    const urlTree = { fake: 'url-tree' };
    const router = { createUrlTree: vi.fn().mockReturnValue(urlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated } },
        { provide: Router, useValue: router },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    return { result, router, urlTree };
  }

  it('allows navigation when there is a session', () => {
    const { result } = run(true);
    expect(result).toBe(true);
  });

  it('redirects to /auth when there is no session', () => {
    const { result, router, urlTree } = run(false);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth']);
    expect(result).toBe(urlTree);
  });
});
