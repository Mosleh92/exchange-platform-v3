// src/core/multi-tenancy/tenant.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async createSuperAdmin(): Promise<Tenant> {
    return this.tenantModel.create({
      level: 'SUPER_ADMIN',
      name: 'System Super Admin',
    });
  }

  async createExchange(createDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantModel.create({
      level: 'EXCHANGE',
      name: createDto.name,
      country: createDto.country,
      parent: createDto.parentId, // SUPER_ADMIN ID
    });
  }

  async createBranch(createDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantModel.create({
      level: 'BRANCH',
      name: createDto.name,
      parent: createDto.parentId, // EXCHANGE ID
    });
  }

  async createUser(createDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantModel.create({
      level: 'USER',
      name: createDto.name,
      parent: createDto.parentId, // BRANCH ID
    });
  }

  async getHierarchy(tenantId: string): Promise<any> {
    const tenant = await this.tenantModel.findById(tenantId);
    const hierarchy = { ...tenant.toObject() };

    if (tenant.level !== 'USER') {
      hierarchy.children = await this.tenantModel.find({ parent: tenantId });
    }

    return hierarchy;
  }
}
