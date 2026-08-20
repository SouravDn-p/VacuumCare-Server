import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../../common/dto/api-response.dto';
import { ProductResponseDto } from '../catalog/dto/catalog-response.dto';
import { AdminCommerceService } from './admin-commerce.service';
import { AdminGuard } from './admin.guard';
import {
  AdminOrderQueryDto,
  AdminPaymentQueryDto,
  AdminProductQueryDto,
  AdminReturnQueryDto,
} from './dto/admin-commerce.dto';
import {
  AdminOrderDetailDto,
  AdminOrderPageDto,
  AdminPaymentDto,
  AdminPaymentPageDto,
  AdminProductPageDto,
  AdminReturnPageDto,
  AdminReturnRequestDto,
} from './dto/admin-commerce-response.dto';

@ApiTags('Admin Products')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
export class AdminCommerceController {
  constructor(private readonly commerce: AdminCommerceService) {}

  @Get('products')
  @ApiOperation({
    summary: 'List all products with inventory and active-state filters',
    description:
      'Includes inactive products by default. Use the existing /catalog/products write routes to create or update products.',
  })
  @ApiOkResponse({ type: AdminProductPageDto })
  products(@Query() query: AdminProductQueryDto) {
    return this.commerce.products(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get any active or inactive product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  product(@Param('id') id: string) {
    return this.commerce.product(id);
  }

  @Get('orders')
  @ApiOperation({
    summary: 'List orders for admin commerce tabs',
    description:
      'Status values are the persisted order workflow states. Existing /orders/:id/status and /orders/:id/cancel routes own all order writes.',
  })
  @ApiOkResponse({ type: AdminOrderPageDto })
  orders(@Query() query: AdminOrderQueryDto) {
    return this.commerce.orders(query);
  }

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get an order using the shared order-detail relation contract',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiOkResponse({ type: AdminOrderDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  order(@Param('id') id: string) {
    return this.commerce.order(id);
  }

  @Get('return-requests')
  @ApiOperation({
    summary: 'List return requests with order, item, product, and eligibility',
    description:
      'Use /orders/returns/:id/status for review notes/status and /orders/:id/refund for Stripe refunds.',
  })
  @ApiOkResponse({ type: AdminReturnPageDto })
  returns(@Query() query: AdminReturnQueryDto) {
    return this.commerce.returns(query);
  }

  @Get('return-requests/:id')
  @ApiOperation({ summary: 'Get one return request with action eligibility' })
  @ApiParam({ name: 'id', description: 'Return request ID' })
  @ApiOkResponse({ type: AdminReturnRequestDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  returnRequest(@Param('id') id: string) {
    return this.commerce.returnRequest(id);
  }

  @Get('payments')
  @ApiOperation({
    summary: 'List Stripe payments for admin commerce tabs',
    description:
      'Provider and payment method are reported only from persisted data. Use /payments/:id/capture for eligible service captures and /orders/:id/refund for order refunds.',
  })
  @ApiOkResponse({ type: AdminPaymentPageDto })
  payments(@Query() query: AdminPaymentQueryDto) {
    return this.commerce.payments(query);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get one Stripe payment with action eligibility' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiOkResponse({ type: AdminPaymentDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  payment(@Param('id') id: string) {
    return this.commerce.payment(id);
  }
}
