import { Module } from "@nestjs/common";
import { FinanceModule } from "@/modules/finance/finance.module";
import { SyncModule } from "@/modules/sync/sync.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { FinancialIndicatorsService } from "./financial-indicators.service";

@Module({
  imports: [FinanceModule, SyncModule],
  controllers: [DashboardController],
  providers: [DashboardService, FinancialIndicatorsService],
  exports: [DashboardService],
})
export class DashboardModule {}
