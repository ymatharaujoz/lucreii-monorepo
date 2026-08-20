import { DynamicModule, Global, Module } from "@nestjs/common";
import { HealthModule } from "@/modules/health/health.module";
import { API_RUNTIME_ENV } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { DatabaseModule } from "@/infra";
import { AuthModule } from "@/modules/auth/auth.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { BreakEvenRoasSimulationsModule } from "@/modules/break-even-roas-simulations/break-even-roas-simulations.module";
import { DashboardModule } from "@/modules/dashboard/dashboard.module";
import { FinanceModule } from "@/modules/finance/finance.module";
import { FinanceInputsModule } from "@/modules/finance-inputs/finance-inputs.module";
import { IntegrationsModule } from "@/modules/integrations/integrations.module";
import { OnboardingModule } from "@/modules/onboarding/onboarding.module";
import { OrdersModule } from "@/modules/orders/orders.module";
import { PricingSimulationsModule } from "@/modules/pricing-simulations/pricing-simulations.module";
import { ProductsModule } from "@/modules/products/products.module";
import { SyncModule } from "@/modules/sync/sync.module";

@Global()
@Module({})
export class AppModule {
  static register(env: ApiRuntimeEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DatabaseModule.register(env),
        AuthModule.register(env),
        BillingModule.register(env),
        BreakEvenRoasSimulationsModule,
        DashboardModule,
        FinanceModule,
        FinanceInputsModule,
        IntegrationsModule,
        OnboardingModule,
        OrdersModule,
        PricingSimulationsModule,
        ProductsModule,
        SyncModule,
        HealthModule,
      ],
      providers: [
        {
          provide: API_RUNTIME_ENV,
          useValue: env,
        },
      ],
      exports: [API_RUNTIME_ENV],
    };
  }
}
