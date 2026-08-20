/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentPurpose,
  PaymentStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersController } from '../orders/orders.controller';
import { StripeService } from '../payments/stripe.service';
import { AdminCommerceService } from './admin-commerce.service';

describe('Admin commerce contracts', () => {
  const prisma = {
    $transaction: jest.fn((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    ),
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    order: { findUnique: jest.fn() },
    orderItem: { findFirst: jest.fn() },
    returnRequest: { create: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(() => jest.clearAllMocks());

  it('includes inactive products and applies low-stock inventory filters', async () => {
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);
    const service = new AdminCommerceService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.products({
        page: 2,
        pageSize: 10,
        search: 'FILTER',
        lowStock: true,
        lowStockThreshold: 3,
      }),
    ).resolves.toEqual({ items: [], total: 0, page: 2, pageSize: 10 });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          isActive: undefined,
          stock: { lte: 3 },
          OR: expect.arrayContaining([
            { sku: { contains: 'FILTER', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });

  it('reports only persisted payment methods and real capture eligibility', async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        provider: 'stripe',
        metadata: { paymentMethod: 'card' },
        purpose: PaymentPurpose.QUOTATION,
        status: PaymentStatus.AUTHORIZED,
        user: { id: 'customer-1' },
        order: null,
        quotation: {
          request: {
            id: 'request-1',
            requestNumber: 'SR-1',
            status: 'REPORT_SUBMITTED',
            report: { customerConfirmedAt: new Date() },
          },
        },
      },
    ]);
    prisma.payment.count.mockResolvedValue(1);
    const service = new AdminCommerceService(
      prisma as unknown as PrismaService,
    );

    const result = await service.payments({ page: 1, pageSize: 25 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        paymentMethod: 'card',
        actionEligibility: { canCapture: true, canRefundOrder: false },
      }),
    );
  });

  it('rejects an order item from a different order on customer return', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      customerId: 'customer-1',
      status: OrderStatus.DELIVERED,
    });
    prisma.returnRequest.findMany.mockResolvedValue([]);
    prisma.orderItem.findFirst.mockResolvedValue(null);
    const controller = new OrdersController(
      prisma as unknown as PrismaService,
      {} as StripeService,
      {} as NotificationsService,
    );

    await expect(
      controller.requestReturn(
        {
          id: 'customer-1',
          email: 'customer@example.com',
          role: UserRole.CUSTOMER,
        },
        'order-1',
        { orderItemId: 'other-order-item', reason: 'Damaged' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.returnRequest.create).not.toHaveBeenCalled();
  });
});
