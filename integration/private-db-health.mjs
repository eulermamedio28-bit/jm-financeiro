// Entrypoint for staging only: activate authenticated API when explicitly enabled.
// Default behavior remains the original isolated health/test server.
if(process.env.JM_ENABLE_FINANCIAL_API==='true'){
  await import('./staging-financial-api.mjs');
}else{
  await import('./private-db-health-legacy.mjs');
}
