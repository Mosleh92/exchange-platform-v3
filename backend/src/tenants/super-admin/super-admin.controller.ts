// src/tenants/super-admin/super-admin.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TenantService } from 'src/core/multi-tenancy/tenant.service';
import { CreateTenantDto } from 'src/core/multi-tenancy/dto/create-tenant.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { TenantGuard } from 'src/core/multi-tenancy/tenant.guard';
import { Levels } from 'src/core/multi-tenancy/decorators/levels.decorator';

@Controller('super-admin/tenants')
@UseGuards(JwtAuthGuard, TenantGuard)
@Levels(['SUPER_ADMIN'])
export class SuperAdminController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('exchange')
  async createExchange(@Body() createDto: CreateTenantDto) {
    return this.tenantService.createExchange(createDto);
  }

  @Post('branch')
  async createBranch(@Body() createDto: CreateTenantDto) {
    return this.tenantService.createBranch(createDto);
  }

  @Post('user')
  async createUser(@Body() createDto: CreateTenantDto) {
    return this.tenantService.createUser(createDto);
  }
}
