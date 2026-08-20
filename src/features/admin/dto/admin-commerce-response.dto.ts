import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrderStatus,
  PaymentPurpose,
  PaymentStatus,
  ReturnStatus,
} from '../../../../generated/prisma/enums';
import { ProductResponseDto } from '../../catalog/dto/catalog-response.dto';
import {
  OrderItemResponseDto,
  OrderResponseDto,
} from '../../orders/dto/orders.dto';
import { PaginatedResponseDto } from './paginated-response.dto';

export class AdminPersonSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiPropertyOptional({ nullable: true }) phone!: string | null;
}

export class AdminProductPageDto extends PaginatedResponseDto<ProductResponseDto> {
  @ApiProperty({ type: [ProductResponseDto] })
  declare items: ProductResponseDto[];
}

export class AdminOrderActionEligibilityDto {
  @ApiProperty({ enum: OrderStatus, isArray: true })
  allowedStatusTransitions!: OrderStatus[];
  @ApiProperty() canCancel!: boolean;
}

export class AdminOrderListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty() total!: number;
  @ApiProperty() itemCount!: number;
  @ApiProperty({ type: AdminPersonSummaryDto })
  customer!: AdminPersonSummaryDto;
  @ApiProperty({ type: AdminOrderActionEligibilityDto })
  actionEligibility!: AdminOrderActionEligibilityDto;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class AdminOrderPageDto extends PaginatedResponseDto<AdminOrderListItemDto> {
  @ApiProperty({ type: [AdminOrderListItemDto] })
  declare items: AdminOrderListItemDto[];
}

export class AdminOrderDetailDto extends OrderResponseDto {
  @ApiProperty({ type: AdminPersonSummaryDto })
  customer!: AdminPersonSummaryDto;
  @ApiProperty({ type: AdminOrderActionEligibilityDto })
  actionEligibility!: AdminOrderActionEligibilityDto;
}

export class AdminReturnActionEligibilityDto {
  @ApiProperty({ enum: ReturnStatus, isArray: true })
  allowedStatusTransitions!: ReturnStatus[];
  @ApiProperty() canRefund!: boolean;
}

export class AdminReturnRequestDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ReturnStatus }) status!: ReturnStatus;
  @ApiProperty() reason!: string;
  @ApiPropertyOptional({ nullable: true }) comments!: string | null;
  @ApiPropertyOptional({ nullable: true }) adminNotes!: string | null;
  @ApiPropertyOptional({ nullable: true }) resolution!: string | null;
  @ApiProperty() orderId!: string;
  @ApiPropertyOptional({ nullable: true }) orderItemId!: string | null;
  @ApiProperty() orderNumber!: string;
  @ApiProperty({ type: AdminPersonSummaryDto })
  customer!: AdminPersonSummaryDto;
  @ApiPropertyOptional({ type: OrderItemResponseDto, nullable: true })
  item!: OrderItemResponseDto | null;
  @ApiProperty({ type: AdminReturnActionEligibilityDto })
  actionEligibility!: AdminReturnActionEligibilityDto;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class AdminReturnPageDto extends PaginatedResponseDto<AdminReturnRequestDto> {
  @ApiProperty({ type: [AdminReturnRequestDto] })
  declare items: AdminReturnRequestDto[];
}

export class AdminPaymentActionEligibilityDto {
  @ApiProperty() canCapture!: boolean;
  @ApiProperty() canRefundOrder!: boolean;
}

export class AdminPaymentDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: PaymentStatus }) status!: PaymentStatus;
  @ApiProperty({ enum: PaymentPurpose }) purpose!: PaymentPurpose;
  @ApiProperty({ example: 'stripe' }) provider!: string;
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Stripe payment method type when persisted in provider metadata; otherwise null.',
  })
  paymentMethod!: string | null;
  @ApiProperty() amount!: number;
  @ApiProperty() refundedAmount!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: AdminPersonSummaryDto }) user!: AdminPersonSummaryDto;
  @ApiPropertyOptional({ nullable: true }) orderId!: string | null;
  @ApiPropertyOptional({ nullable: true }) orderNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) requestId!: string | null;
  @ApiPropertyOptional({ nullable: true }) requestNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) providerReference!: string | null;
  @ApiProperty({ type: AdminPaymentActionEligibilityDto })
  actionEligibility!: AdminPaymentActionEligibilityDto;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class AdminPaymentPageDto extends PaginatedResponseDto<AdminPaymentDto> {
  @ApiProperty({ type: [AdminPaymentDto] })
  declare items: AdminPaymentDto[];
}
