import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  OrderStatus,
  PaymentPurpose,
  PaymentStatus,
  ReturnStatus,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../database/prisma.service';
import { orderDetailInclude } from '../orders/order-detail';
import { adminUtcRange } from './admin-date-range';
import {
  AdminOrderQueryDto,
  AdminPaymentQueryDto,
  AdminProductQueryDto,
  AdminReturnQueryDto,
} from './dto/admin-commerce.dto';

const personSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
} as const;

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PAYMENT_PENDING: [],
  PLACED: [],
  PAID: [OrderStatus.PROCESSING],
  PROCESSING: [OrderStatus.SHIPPED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
  PAYMENT_FAILED: [OrderStatus.CANCELLED],
  REFUNDED: [],
};

const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
  APPROVED: [ReturnStatus.RECEIVED, ReturnStatus.REJECTED],
  REJECTED: [],
  RECEIVED: [],
  REFUNDED: [],
};

@Injectable()
export class AdminCommerceService {
  constructor(private readonly prisma: PrismaService) {}

  async products(query: AdminProductQueryDto) {
    const where: Prisma.ProductWhereInput = {
      isActive: query.isActive,
      category: query.category
        ? { equals: query.category, mode: 'insensitive' }
        : undefined,
      stock: query.lowStock ? { lte: query.lowStockThreshold } : undefined,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.page(
      this.prisma.product.findMany({
        where,
        orderBy: [{ stock: 'asc' }, { name: 'asc' }],
        skip: this.skip(query),
        take: query.pageSize,
      }),
      this.prisma.product.count({ where }),
      query,
    );
  }

  async product(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async orders(query: AdminOrderQueryDto) {
    const where: Prisma.OrderWhereInput = {
      status: query.status,
      customerId: query.customerId,
      createdAt: this.dateRange(query),
    };
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        {
          customer: { email: { contains: query.search, mode: 'insensitive' } },
        },
        {
          customer: {
            firstName: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          customer: {
            lastName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }
    const result = await this.page(
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          customer: { select: personSelect },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.pageSize,
      }),
      this.prisma.order.count({ where }),
      query,
    );
    return {
      ...result,
      items: result.items.map(({ _count, ...order }) => ({
        ...order,
        itemCount: _count.items,
        actionEligibility: this.orderActions(order.status),
      })),
    };
  }

  async order(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return { ...order, actionEligibility: this.orderActions(order.status) };
  }

  async returns(query: AdminReturnQueryDto) {
    const where: Prisma.ReturnRequestWhereInput = {
      status: query.status,
      createdAt: this.dateRange(query),
    };
    if (query.search) {
      where.OR = [
        { reason: { contains: query.search, mode: 'insensitive' } },
        { comments: { contains: query.search, mode: 'insensitive' } },
        { adminNotes: { contains: query.search, mode: 'insensitive' } },
        {
          order: {
            orderNumber: { contains: query.search, mode: 'insensitive' },
          },
        },
        {
          order: {
            customer: {
              email: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          orderItem: {
            is: {
              product: {
                name: { contains: query.search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }
    const include = {
      order: {
        include: {
          customer: { select: personSelect },
          payments: true,
        },
      },
      orderItem: { include: { product: true } },
    } satisfies Prisma.ReturnRequestInclude;
    const result = await this.page(
      this.prisma.returnRequest.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.pageSize,
      }),
      this.prisma.returnRequest.count({ where }),
      query,
    );
    return {
      ...result,
      items: result.items.map((request) => this.mapReturn(request)),
    };
  }

  async returnRequest(id: string) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: { customer: { select: personSelect }, payments: true },
        },
        orderItem: { include: { product: true } },
      },
    });
    if (!request) throw new NotFoundException('Return request not found');
    return this.mapReturn(request);
  }

  async payments(query: AdminPaymentQueryDto) {
    const where = this.paymentWhere(query);
    const include = this.paymentInclude();
    const result = await this.page(
      this.prisma.payment.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: this.skip(query),
        take: query.pageSize,
      }),
      this.prisma.payment.count({ where }),
      query,
    );
    return {
      ...result,
      items: result.items.map((payment) => this.mapPayment(payment)),
    };
  }

  async payment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: this.paymentInclude(),
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.mapPayment(payment);
  }

  private paymentWhere(query: AdminPaymentQueryDto): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {
      status: query.status,
      purpose: query.purpose,
      userId: query.userId,
      orderId: query.orderId,
      quotation: query.requestId
        ? { is: { requestId: query.requestId } }
        : undefined,
      createdAt: this.dateRange(query),
    };
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        {
          providerReference: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          stripePaymentIntentId: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
        {
          order: {
            is: {
              orderNumber: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          quotation: {
            is: {
              request: {
                requestNumber: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ];
    }
    return where;
  }

  private paymentInclude() {
    return {
      user: { select: personSelect },
      order: { include: { returnRequests: true } },
      quotation: {
        include: {
          request: { include: { report: true } },
        },
      },
    } satisfies Prisma.PaymentInclude;
  }

  private mapPayment(payment: {
    metadata: unknown;
    provider: string;
    status: PaymentStatus;
    purpose: PaymentPurpose;
    order: {
      id: string;
      orderNumber: string;
      returnRequests: { status: ReturnStatus }[];
    } | null;
    quotation: {
      request: {
        id: string;
        requestNumber: string;
        status: string;
        report: { customerConfirmedAt: Date | null } | null;
      };
    } | null;
    [key: string]: unknown;
  }) {
    const metadata =
      typeof payment.metadata === 'object' && payment.metadata !== null
        ? (payment.metadata as Record<string, unknown>)
        : undefined;
    const method =
      typeof metadata?.paymentMethod === 'string'
        ? metadata.paymentMethod
        : typeof metadata?.payment_method_type === 'string'
          ? metadata.payment_method_type
          : null;
    const canCapture =
      payment.provider === 'stripe' &&
      payment.purpose === PaymentPurpose.QUOTATION &&
      payment.status === PaymentStatus.AUTHORIZED &&
      payment.quotation?.request.status === 'REPORT_SUBMITTED' &&
      Boolean(payment.quotation.request.report?.customerConfirmedAt);
    const canRefundOrder =
      payment.provider === 'stripe' &&
      payment.purpose === PaymentPurpose.ORDER &&
      (payment.status === PaymentStatus.SUCCEEDED ||
        payment.status === PaymentStatus.PARTIALLY_REFUNDED) &&
      Boolean(
        payment.order?.returnRequests.some(
          (request) =>
            request.status === ReturnStatus.APPROVED ||
            request.status === ReturnStatus.RECEIVED,
        ),
      );
    return {
      ...payment,
      paymentMethod: method,
      orderId: payment.order?.id ?? null,
      orderNumber: payment.order?.orderNumber ?? null,
      requestId: payment.quotation?.request.id ?? null,
      requestNumber: payment.quotation?.request.requestNumber ?? null,
      actionEligibility: { canCapture, canRefundOrder },
    };
  }

  private mapReturn(request: {
    status: ReturnStatus;
    order: {
      id: string;
      orderNumber: string;
      customer: unknown;
      payments: { purpose: PaymentPurpose; status: PaymentStatus }[];
    };
    orderItem: unknown;
    [key: string]: unknown;
  }) {
    const hasRefundablePayment = request.order.payments.some(
      (payment) =>
        payment.purpose === PaymentPurpose.ORDER &&
        (payment.status === PaymentStatus.SUCCEEDED ||
          payment.status === PaymentStatus.PARTIALLY_REFUNDED),
    );
    return {
      ...request,
      orderId: request.order.id,
      orderNumber: request.order.orderNumber,
      customer: request.order.customer,
      item: request.orderItem,
      actionEligibility: {
        allowedStatusTransitions: RETURN_TRANSITIONS[request.status],
        canRefund:
          hasRefundablePayment &&
          (request.status === ReturnStatus.APPROVED ||
            request.status === ReturnStatus.RECEIVED),
      },
    };
  }

  private orderActions(status: OrderStatus) {
    return {
      allowedStatusTransitions: ORDER_TRANSITIONS[status],
      canCancel: status === OrderStatus.PAYMENT_PENDING,
    };
  }

  private dateRange(query: {
    from?: string;
    to?: string;
    timezone?: string;
  }): Prisma.DateTimeFilter | undefined {
    if (!query.from && !query.to) return undefined;
    if (!query.from || !query.to) {
      throw new BadRequestException('from and to must be provided together');
    }
    const range = adminUtcRange(query.from, query.to, query.timezone);
    return { gte: range.start, lt: range.end };
  }

  private skip(query: { page: number; pageSize: number }) {
    return (query.page - 1) * query.pageSize;
  }

  private async page<T>(
    itemsQuery: Prisma.PrismaPromise<T[]>,
    totalQuery: Prisma.PrismaPromise<number>,
    query: { page: number; pageSize: number },
  ) {
    const [items, total] = await this.prisma.$transaction([
      itemsQuery,
      totalQuery,
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }
}
