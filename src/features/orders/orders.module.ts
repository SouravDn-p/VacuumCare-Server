import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersController } from './orders.controller';
@Module({
  imports: [PaymentsModule, CartModule],
  controllers: [OrdersController],
})
export class OrdersModule {}
