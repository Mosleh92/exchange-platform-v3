// src/core/multi-tenancy/decorators/levels.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const Levels = (...levels: string[]) => SetMetadata('levels', levels);
