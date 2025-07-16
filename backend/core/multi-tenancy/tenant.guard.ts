// src/core/multi-tenancy/tenant.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevels = this.reflector.get<string[]>(
      'levels',
      context.getHandler(),
    );

    if (!requiredLevels) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Get user's tenant hierarchy
    const userTenant = await this.tenantService.getHierarchy(user.tenantId);
    
    // Check if user has required access level
    if (!this.checkAccessLevel(userTenant, requiredLevels)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }

  private checkAccessLevel(tenant: any, requiredLevels: string[]): boolean {
    // SUPER_ADMIN has access to everything
    if (tenant.level === 'SUPER_ADMIN') return true;

    // Check if user's level is in required levels
    return requiredLevels.includes(tenant.level);
  }
}
