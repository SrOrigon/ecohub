-- Indices para consultas multi-tenant frequentes em User
CREATE INDEX IF NOT EXISTS "User_schoolId_idx" ON "User"("schoolId");
CREATE INDEX IF NOT EXISTS "User_schoolId_role_idx" ON "User"("schoolId", "role");
