import { Module } from "@nestjs/common";
import { ProductsModule } from "@/modules/products/products.module";
import { SyncModule } from "@/modules/sync/sync.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { OrderSpreadsheetImportService } from "./order-spreadsheet-import.service";

@Module({
  imports: [ProductsModule, SyncModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OrderSpreadsheetImportService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
