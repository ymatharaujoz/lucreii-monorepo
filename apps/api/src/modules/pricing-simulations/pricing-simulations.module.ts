import { Module } from "@nestjs/common";
import { PricingSimulationsController } from "./pricing-simulations.controller";
import { PricingSimulationsService } from "./pricing-simulations.service";

@Module({
  controllers: [PricingSimulationsController],
  providers: [PricingSimulationsService],
})
export class PricingSimulationsModule {}
