import { prisma } from '../config/database.js';

export const Customer = {
  create: (data) => prisma.customer.create({ data }),
  findById: (id) => prisma.customer.findUnique({ where: { id } }),
  updateBalance: (id, balance) =>
    prisma.customer.update({ where: { id }, data: { balance } }),
};
