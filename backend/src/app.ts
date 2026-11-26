import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import transactionRoutes from './routes/transactions.routes.js';

const app = express();
app.use(cors());
app.use(express.json());

const otelApi = (() => {
  try {
    return require('@opentelemetry/api') as any;
  } catch {
    return undefined;
  }
})();
const httpMeter = otelApi?.metrics.getMeter('finance-backend.http');
const requestCount = httpMeter?.createCounter('http.server.request.count', {
  description: 'Número de peticiones HTTP completadas',
});
const requestDuration = httpMeter?.createHistogram('http.server.request.duration', {
  description: 'Duración de las peticiones HTTP completadas',
  unit: 's',
});

// Access log estructurado con IDs de correlación para relacionarlo con la traza.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    let traceId: string | undefined;
    let spanId: string | undefined;
    try {
      const span = otelApi?.trace.getSpan(otelApi.context.active());
      const spanContext = span?.spanContext();
      traceId = spanContext?.traceId;
      spanId = spanContext?.spanId;
    } catch {
      // OpenTelemetry es opcional durante desarrollo local.
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    const attributes = {
      'http.request.method': req.method,
      'http.route': route,
      'http.response.status_code': res.statusCode,
    };
    requestCount?.add(1, attributes);
    requestDuration?.record(durationMs / 1000, attributes);

    console.log(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'info',
      event: 'http_request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
      ...(traceId ? { traceId } : {}),
      ...(spanId ? { spanId } : {}),
    }));
  });
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

export default app;
