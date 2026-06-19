DROP INDEX IF EXISTS "companies_org_cnpj_key";
CREATE UNIQUE INDEX IF NOT EXISTS "companies_cnpj_key" ON "companies" USING btree ("cnpj");
