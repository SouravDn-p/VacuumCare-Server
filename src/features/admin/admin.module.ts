import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../service/cloudinary/cloudinary.module';
import { ServiceRequestsModule } from '../service-requests/service-requests.module';
import { AdminCommerceController } from './admin-commerce.controller';
import { AdminCommerceService } from './admin-commerce.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminEquipmentController } from './admin-equipment.controller';
import { AdminEquipmentService } from './admin-equipment.service';
import { AdminGuard } from './admin.guard';
import { AdminPeopleController } from './admin-people.controller';
import { AdminPeopleService } from './admin-people.service';
import { AdminServiceOperationsController } from './admin-service-operations.controller';
import { AdminServiceOperationsService } from './admin-service-operations.service';
import { AdminInsightsController } from './admin-insights.controller';
import { AdminInsightsService } from './admin-insights.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [ServiceRequestsModule, CloudinaryModule],
  controllers: [
    AdminController,
    AdminServiceOperationsController,
    AdminPeopleController,
    AdminEquipmentController,
    AdminCommerceController,
    AdminInsightsController,
  ],
  providers: [
    AdminDashboardService,
    AdminServiceOperationsService,
    AdminPeopleService,
    AdminEquipmentService,
    AdminCommerceService,
    AdminInsightsService,
    AdminGuard,
  ],
})
export class AdminModule {}
