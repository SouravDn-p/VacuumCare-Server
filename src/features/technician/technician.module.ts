import { Module } from '@nestjs/common';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { TechnicianHomeController } from './home/home.controller';
import { TechnicianHomeService } from './home/home.service';
import { TechnicianServiceRequestsController } from './service-requests/service-requests.controller';
import { TechnicianGuard } from './technician.guard';

@Module({
  imports: [ServiceRequestsModule],
  controllers: [TechnicianHomeController, TechnicianServiceRequestsController],
  providers: [TechnicianGuard, TechnicianHomeService],
})
export class TechnicianModule {}
