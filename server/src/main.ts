import { createApp } from './app.js';
import { db } from './db/database.js';
import { databaseFile } from './db/paths.js';
import { runMigrations } from './db/migrations.js';
import { APP_SLUG } from './http/apiCatalog.js';

// O AIOSON Play injeta BACKEND_PORT no spawn. PORT pertence ao frontend (webview)
// e nunca é usada aqui. Nenhuma porta é fixada em script.
const port = Number(process.env.BACKEND_PORT) || 3301;

const version = runMigrations(db(), databaseFile());
process.stdout.write(`[clave] banco em ${databaseFile()} (schema v${version})\n`);

createApp().listen(port, '0.0.0.0', () => {
  process.stdout.write(`[clave] api do app ${APP_SLUG} escutando em http://localhost:${port}\n`);
});
