import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { TechnicianServiceRequestsController } from './service-requests/service-requests.controller';
import { TechnicianGuard } from './technician.guard';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [TechnicianServiceRequestsController],
  providers: [TechnicianGuard],
})
export class TechnicianModule {}
