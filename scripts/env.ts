// Lädt .env für CLI-Skripte (Next.js macht das für die App selbst).
try { process.loadEnvFile(".env"); } catch { /* keine .env – ok */ }
export {};
