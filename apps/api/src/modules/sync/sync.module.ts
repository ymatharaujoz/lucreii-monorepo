import { Module } from "@nestjs/common";
import { FinanceModule } from "@/modules/finance/finance.module";
import { SyncController } from "./sync.controller";
import { MercadoLivreTokenMaintenanceService } from "./mercadolivre-token-maintenance.service";
import { MercadoLivreTokenRefreshService } from "./mercadolivre-token-refresh.service";
import { MercadoLivreWebhookQueueService } from "./mercadolivre-webhook-queue.service";
import { SyncPerformanceMaterializerService } from "./sync-performance-materializer.service";
import { SyncService } from "./sync.service";

@Module({
  imports: [FinanceModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    SyncPerformanceMaterializerService,
    MercadoLivreTokenRefreshService,
    MercadoLivreTokenMaintenanceService,
    MercadoLivreWebhookQueueService,
  ],
  exports: [
    SyncService,
    MercadoLivreTokenRefreshService,
    MercadoLivreWebhookQueueService,
  ],
})
export class SyncModule {}
