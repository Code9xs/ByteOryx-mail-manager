export function getAppSecretKey(): string {
  const key = process.env.APP_SECRET_KEY;
  if (!key) {
    throw new Error("APP_SECRET_KEY is required");
  }
  return key;
}

export function getGraphTenantId(): string {
  return process.env.GRAPH_TENANT_ID || "common";
}

export function getGraphScopes(): string {
  return process.env.GRAPH_SCOPES || "https://graph.microsoft.com/Mail.Read offline_access";
}
