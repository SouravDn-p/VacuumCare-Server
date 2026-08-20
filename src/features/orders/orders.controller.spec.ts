/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  OrderStatus,
  PaymentStatus,
  UserRole,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../payments/stripe.service';
import { OrdersController } from './orders.controller';
import { CustomerOrderGroup } from './dto/orders.dto';

describe('OrdersController customer My Orders', () => {
  const prisma = {
    $transaction: jest.fn((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    ),
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
    },
    returnRequest: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('filters the active My Orders tab and returns a tracking timeline', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        orderNumber: 'CC-90422',
        status: OrderStatus.PROCESSING,
        subtotal: 299,
        tax: 10.5,
        total: 324.5,
        paidAt: new Date('2026-04-24T13:45:00.000Z'),
        createdAt: new Date('2026-04-24T13:12:00.000Z'),
        shippingAddress: {
          line1: '128 Pristine Way',
          city: 'Clean Valley',
          state: 'CA',
          zipCode: '90210',
        },
        items: [],
        statusHistory: [
          {
            status: OrderStatus.PROCESSING,
            createdAt: new Date('2026-04-24T13:45:00.000Z'),
          },
        ],
        returnRequests: [],
        payments: [{ status: PaymentStatus.SUCCEEDED }],
      },
    ]);
    prisma.order.count.mockResolvedValue(1);
    const controller = new OrdersController(
      prisma as unknown as PrismaService,
      {} as StripeService,
      {} as NotificationsService,
      {} as CartService,
    );

    const result = await controller.list(
      {
        id: 'customer-1',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
      },
      { group: CustomerOrderGroup.ACTIVE, page: 1, pageSize: 25 },
    );

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        shippingFee: 15,
        paymentStatus: PaymentStatus.SUCCEEDED,
        canCancel: false,
        canReturn: false,
      }),
    );
    expect(result.items[0].timeline.map((step) => step.key)).toEqual([
      'PLACED',
      'PAYMENT_CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
    ]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customerId: 'customer-1',
          status: {
            in: [
              OrderStatus.PAYMENT_PENDING,
              OrderStatus.PLACED,
              OrderStatus.PAID,
              OrderStatus.PROCESSING,
              OrderStatus.SHIPPED,
            ],
          },
        }),
      }),
    );
  });

  it('lists the customer return requests with order numbers', async () => {
    prisma.returnRequest.findMany.mockResolvedValue([
      {
        id: 'return-1',
        orderId: 'order-1',
        status: 'REQUESTED',
        orderItemId: null,
        reason: 'Damaged in transit',
        comments: null,
        resolution: null,
        adminNotes: null,
        returnLabelUrl: null,
        createdAt: new Date('2026-04-26T12:00:00.000Z'),
        order: { orderNumber: 'CC-90422', status: OrderStatus.DELIVERED },
      },
    ]);
    const controller = new OrdersController(
      prisma as unknown as PrismaService,
      {} as StripeService,
      {} as NotificationsService,
      {} as CartService,
    );

    await expect(
      controller.listReturns({
        id: 'customer-1',
        email: 'customer@example.com',
        role: UserRole.CUSTOMER,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'return-1',
        orderNumber: 'CC-90422',
        orderStatus: OrderStatus.DELIVERED,
      }),
    ]);
    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { order: { customerId: 'customer-1' } },
      }),
    );
  });
});
