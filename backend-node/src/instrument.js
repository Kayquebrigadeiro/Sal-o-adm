require("dotenv").config();
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  integrations: [
    // Instrumentação do Express (necessária na v10 para capturar rotas/erros HTTP)
    Sentry.expressIntegration(),
  ],
});