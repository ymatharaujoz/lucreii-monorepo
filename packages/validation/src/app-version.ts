import { z } from "zod";
import { createApiSuccessResponseSchema } from "./protected-app";

const semverPattern =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const appVersionSchema = z.string().trim().regex(semverPattern, "Version must be a valid semver.");

export const appVersionApiResponseSchema = createApiSuccessResponseSchema(
  z.object({
    version: appVersionSchema,
  }),
);

export type AppVersionInput = z.infer<typeof appVersionSchema>;
