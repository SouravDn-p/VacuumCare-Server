import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { QuoteCounterofferService } from './quote-counteroffer.service';
import { RequestsController } from './requests.controller';
@Module({
  imports: [PaymentsModule],
  controllers: [RequestsController],
  providers: [QuoteCounterofferService],
  exports: [QuoteCounterofferService],
})
export class ServiceRequestsModule {}
