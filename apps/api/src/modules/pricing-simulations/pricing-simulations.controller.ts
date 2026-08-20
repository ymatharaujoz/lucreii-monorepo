import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { EntitlementGuard } from "@/modules/billing/entitlement.guard";
import {
  CreatePricingSimulationRequestDto,
  DeletePricingSimulationsBulkRequestDto,
  ListPricingSimulationsQueryDto,
  UpdatePricingSimulationRequestDto,
} from "./pricing-simulations.dto";
import { PricingSimulationsService } from "./pricing-simulations.service";

@Controller("pricing/simulations")
@UseGuards(AuthGuard, EntitlementGuard)
export class PricingSimulationsController {
  constructor(
    @Inject(PricingSimulationsService)
    private readonly simulationsService: PricingSimulationsService,
  ) {}

  @Get()
  async list(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Query() query: ListPricingSimulationsQueryDto,
  ) {
    return {
      data: await this.simulationsService.list(
        this.context(authContext),
        query,
      ),
      error: null,
    };
  }

  @Post()
  async create(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreatePricingSimulationRequestDto,
  ) {
    return {
      data: await this.simulationsService.create(
        this.context(authContext),
        body,
      ),
      error: null,
    };
  }

  @Get(":id")
  async get(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") simulationId: string,
  ) {
    return {
      data: await this.simulationsService.get(
        this.context(authContext),
        simulationId,
      ),
      error: null,
    };
  }

  @Patch(":id")
  async update(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") simulationId: string,
    @Body() body: UpdatePricingSimulationRequestDto,
  ) {
    return {
      data: await this.simulationsService.update(
        this.context(authContext),
        simulationId,
        body,
      ),
      error: null,
    };
  }

  @Delete("bulk-delete")
  async removeMany(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: DeletePricingSimulationsBulkRequestDto,
  ) {
    return {
      data: await this.simulationsService.removeMany(
        this.context(authContext),
        body.ids,
      ),
      error: null,
    };
  }

  @Delete(":id")
  async remove(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Param("id") simulationId: string,
  ) {
    return {
      data: await this.simulationsService.remove(
        this.context(authContext),
        simulationId,
      ),
      error: null,
    };
  }

  private context(authContext: AuthenticatedRequestContext) {
    return {
      organizationId: authContext.organization!.id,
      selectedCompanyId: authContext.selectedCompanyId ?? null,
      userId: authContext.user.id,
    };
  }
}
