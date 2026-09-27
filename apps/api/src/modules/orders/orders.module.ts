import { Module } from "@nestjs/common";
import { ProductsModule } from "@/modules/products/products.module";
import { SyncModule } from "@/modules/sync/sync.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [ProductsModule, SyncModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
