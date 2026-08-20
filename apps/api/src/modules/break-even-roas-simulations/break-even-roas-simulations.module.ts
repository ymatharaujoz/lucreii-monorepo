import { Module } from "@nestjs/common";
import { BreakEvenRoasSimulationsController } from "./break-even-roas-simulations.controller";
import { BreakEvenRoasSimulationsService } from "./break-even-roas-simulations.service";

@Module({
  controllers: [BreakEvenRoasSimulationsController],
  providers: [BreakEvenRoasSimulationsService],
})
export class BreakEvenRoasSimulationsModule {}
