// src/core/multi-tenancy/schemas/tenant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, enum: ['SUPER_ADMIN', 'EXCHANGE', 'BRANCH', 'USER'] })
  level: string;

  @Prop({ required: true })
  name: string;

  @Prop() // Only for EXCHANGE
  country?: string;

  @Prop({ type: String, ref: 'Tenant' }) // Parent reference
  parent?: string;

  @Prop({ type: String, ref: 'User' }) // Admin user for exchange/branch
  admin?: string;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
