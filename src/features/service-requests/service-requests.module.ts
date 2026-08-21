import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../service/cloudinary/cloudinary.module';
import { PaymentsModule } from '../payments/payments.module';
import { QuoteCounterofferService } from './quote-counteroffer.service';
import { RequestsController } from './requests.controller';
@Module({
  imports: [PaymentsModule, CloudinaryModule],
  controllers: [RequestsController],
  providers: [QuoteCounterofferService],
  exports: [QuoteCounterofferService],
})
export class ServiceRequestsModule {}
