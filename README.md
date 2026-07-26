# ms-quotas

Microservicio NestJS para administrar cronogramas de cuotas de creditos.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- Kafka
- JWT
- Swagger en `/docs`
- npm

## Decisiones

PostgreSQL + Prisma se usa por relaciones claras entre creditos, cuotas, idempotencia y locks. Prisma transactions protegen pago de cuota, registro idempotente y cambio de estado del credito.

Kafka se usa para publicar eventos reales:

- `quota.paid`
- `credit.completed`

El job de mora usa `JobLock` persistente con TTL de 5 minutos. Si otra ejecucion esta activa, responde `409 Conflict`.

## Ejecutar con Docker

```bash
docker-compose up
```

Servicios:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- PostgreSQL: `localhost:5432`
- Kafka local: `localhost:29092`
- Kafka Docker network: `kafka:9092`

## Ejecutar local

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ms_quotas
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=1h
PORT=3000
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=ms-quotas
```

## Tests

```bash
npm test
```

## Auth

Generar token:

```http
POST /auth/login
Content-Type: application/json

{
  "userId": "user-1"
}
```

Usar respuesta como bearer token:

```http
Authorization: Bearer <accessToken>
```

## Endpoints

### Health

```http
GET /health
```

### Crear credito

```http
POST /credits
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "user-1",
  "amountTotal": 900,
  "numberOfQuotas": 3,
  "startDate": "2026-08-01"
}
```

### Pagar cuota

```http
POST /quotas/:id/pay
Authorization: Bearer <token>
Idempotency-Key: payment-1
```

Mismo `Idempotency-Key` con misma cuota devuelve mismo resultado. Mismo key con otra cuota responde `409 Conflict`.

### Ejecutar mora

```http
POST /jobs/run-overdue-check
Authorization: Bearer <token>
```

Marca cuotas `PENDING` vencidas como `OVERDUE` y aplica penalidad unica de 15%.

### Consultar cuotas

```http
GET /credits/user-1/quotas?status=PENDING&page=1&limit=10
Authorization: Bearer <token>
```
