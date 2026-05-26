CREATE TABLE IF NOT EXISTS "auth_exchange_ticket" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_hash" varchar(128) NOT NULL,
  "user_id" text NOT NULL,
  "session_id" text NOT NULL,
  "organization_id" uuid,
  "remote_session_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "auth_exchange_ticket" ADD CONSTRAINT "auth_exchange_ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_exchange_ticket" ADD CONSTRAINT "auth_exchange_ticket_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_exchange_ticket" ADD CONSTRAINT "auth_exchange_ticket_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_exchange_ticket_hash_key" ON "auth_exchange_ticket" USING btree ("ticket_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_exchange_ticket_session_id_idx" ON "auth_exchange_ticket" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_exchange_ticket_expires_at_idx" ON "auth_exchange_ticket" USING btree ("expires_at");--> statement-breakpoint
