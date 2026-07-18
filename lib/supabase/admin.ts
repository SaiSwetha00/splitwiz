// Re-exported so there's a single implementation of the service-role
// client (previously duplicated here and in server.ts with slightly
// different options). Import from either path — both point here.
export { createAdminClient } from "./server";
