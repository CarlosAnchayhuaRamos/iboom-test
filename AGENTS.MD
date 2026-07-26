# ms-quotas - Development Guidelines

## Project Overview

`ms-quotas` es un microservicio backend para administrar cronogramas de cuotas de creditos.
El proyecto construye una API NestJS que cubre creacion de creditos, pago de cuotas,
control de mora, consulta filtrada, autenticacion JWT, eventos Kafka, Swagger y
ejecucion segura del job de mora con lock.

No hay frontend en este proyecto.

## Core Scope

### Functional Requirements

1. **Crear cronograma de cuotas**
   - Endpoint: `POST /credits`
   - Body:
     ```json
     {
       "userId": "string",
       "amountTotal": 900,
       "numberOfQuotas": 3,
       "startDate": "2026-08-01"
     }
     ```
   - Debe crear un credito con `numberOfQuotas` cuotas asociadas.
   - Cada cuota debe tener `amount`, `dueDate` y estado inicial `PENDING`.
   - Las fechas de vencimiento se espacian cada 30 dias desde `startDate`.

2. **Pagar una cuota**
   - Endpoint: `POST /quotas/:id/pay`
   - Requiere header `Idempotency-Key`.
   - Debe ser idempotente: mismo header en reintentos devuelve mismo resultado sin duplicar efecto.
   - Cambia cuota a `PAID`.
   - Si era la ultima cuota pendiente del credito, cambia credito a `FINALIZADO`.

3. **Job de mora simulado**
   - Endpoint: `POST /jobs/run-overdue-check`
   - Simula un CRON de produccion.
   - Marca como `OVERDUE` toda cuota `PENDING` con `dueDate` pasada.
   - Aplica una penalidad unica de 15% sobre el monto de esa cuota.
   - Nunca aplicar penalidad dos veces a la misma cuota.

4. **Consulta de cuotas con filtros**
   - Endpoint: `GET /credits/:userId/quotas?status=PENDING&page=1&limit=10`
   - Debe soportar paginacion.
   - Debe soportar filtro por `status`.

5. **Autenticacion**
   - Todos los endpoints deben estar protegidos con `JwtAuthGuard`, excepto health.
   - Endpoint libre: `GET /health`.
   - Endpoint libre: `POST /auth/login`, recibe cualquier `userId` y devuelve JWT valido.
   - No implementar sistema real de usuarios.

## Domain Model

### Credit

Use estados claros y consistentes:

- `ACTIVE`: credito con cuotas pendientes, pagadas o vencidas.
- `FINALIZADO`: todas las cuotas pendientes fueron pagadas.

Campos esperados:

- `id`
- `userId`
- `amountTotal`
- `numberOfQuotas`
- `status`
- `createdAt`
- `updatedAt`

### Quota

Estados permitidos:

- `PENDING`
- `PAID`
- `OVERDUE`

Campos esperados:

- `id`
- `creditId`
- `amount`
- `dueDate`
- `status`
- `penaltyApplied`
- `paidAt`
- `createdAt`
- `updatedAt`

### Idempotency Record

Guardar informacion suficiente para responder igual ante reintentos.

Campos esperados:

- `id`
- `key`
- `method`
- `path`
- `requestHash`
- `statusCode`
- `responseBody`
- `createdAt`

### JobLock

Usar lock persistente para impedir ejecuciones simultaneas del job de mora.

Campos esperados:

- `id`
- `name`
- `lockedAt`
- `expiresAt`
- `createdAt`
- `updatedAt`

## Backend Architecture

Use NestJS + TypeScript con separacion por modulos de dominio.

```
src/
  auth/
    auth.controller.ts
    auth.module.ts
    auth.service.ts
    jwt-auth.guard.ts
    jwt.strategy.ts
  credits/
    dto/
    credits.controller.ts
    credits.module.ts
    credits.service.ts
  quotas/
    dto/
    quotas.controller.ts
    quotas.module.ts
    quotas.service.ts
  jobs/
    jobs.controller.ts
    jobs.module.ts
    jobs.service.ts
  idempotency/
    idempotency.module.ts
    idempotency.service.ts
  common/
    filters/
    guards/
    decorators/
    events/
  kafka/
    kafka.module.ts
    kafka.service.ts
  health/
    health.controller.ts
  prisma/
```

### Rules

1. Controllers only handle HTTP concerns: params, query, body, guards and status codes.
2. Services contain business logic: quota calculation, payment, overdue check and state transitions.
3. DTOs live in `dto/` and must use `class-validator`.
4. Domain types/enums must be shared from one source, not duplicated across files.
5. Database access must stay behind service/repository boundaries.
6. Event publishing must be implemented through `KafkaService`.
7. No business logic inside controllers.
8. No silent fallbacks that hide missing data.

## Database

Use **PostgreSQL + Prisma**.

Reason:

- Relaciones claras entre `Credit`, `Quota` and `IdempotencyRecord`.
- Transacciones ayudan con pago idempotente y transiciones de estado.
- Constraints unicas protegen `Idempotency-Key`.
- `JobLock` persistente permite bloquear el job de mora entre requests concurrentes.

## API Behavior

### Validation

- Validate all request bodies with DTOs.
- Reject invalid `amountTotal`, `numberOfQuotas`, `startDate`, `status`, `page` and `limit`.
- Use explicit HTTP errors with consistent response shape.

### Error Handling

Use a global Exception Filter.

Response shape must be consistent:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "path": "/credits",
  "timestamp": "2026-08-01T00:00:00.000Z"
}
```

Never return raw internal errors or stack traces in API responses.

### Idempotency

- `POST /quotas/:id/pay` requires `Idempotency-Key`.
- First request stores result.
- Retry with same key, method, path and equivalent body returns stored result.
- Same key with different request hash must return conflict.
- Payment logic and idempotency record write must be atomic.
- Use Prisma transaction for payment, idempotency record and credit state transition.

### State Transitions

Allowed quota transitions:

- `PENDING -> PAID`
- `PENDING -> OVERDUE`
- `OVERDUE -> PAID`

Disallowed:

- `PAID -> PENDING`
- `PAID -> OVERDUE`
- Reapplying overdue penalty after `penaltyApplied = true`

Credit becomes `FINALIZADO` only when no unpaid quota remains for that credit.

## Events

Use real Kafka through Docker Compose.

Publish events through `KafkaService`:

- Publish `quota.paid` when quota is paid.
- Publish `credit.completed` when credit becomes `FINALIZADO`.
- Keep event publishing isolated from domain logic.
- Tests mock `KafkaService`; production code must not use `console.log` as event bus.

Required topics:

- `quota.paid`
- `credit.completed`

## Job Lock

`POST /jobs/run-overdue-check` must acquire lock `overdue-check` before processing.

Rules:

- If active lock exists and `expiresAt` is in future, return `409 Conflict`.
- If lock does not exist or is expired, acquire lock inside transaction.
- Release lock in `finally` after job finishes.
- Use 5 minute TTL to recover from process crash.
- Overdue penalty must remain idempotent through `penaltyApplied = true`.

## Docker

`docker-compose up` must start whole system with one command:

- API
- Database
- Kafka broker

Compose must include healthchecks for PostgreSQL and Kafka.

Required env examples:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/ms_quotas
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=1h
PORT=3000
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=ms-quotas
```

Use `npm` for package management. Do not use pnpm or yarn.

## Tests

Prioritize unit tests for domain behavior.

Must cover:

- Quota amount calculation.
- Due dates spaced every 30 days.
- Payment idempotency.
- Quota status transition to `PAID`.
- Credit transition to `FINALIZADO`.
- Overdue job marks only pending expired quotas.
- Overdue penalty applies once.
- Overdue job returns conflict when lock is active.
- Kafka events are published for paid quota and completed credit.

Full coverage is not required. Business logic coverage matters most.

## README Requirements

README must include:

- How to install dependencies.
- How to run with `docker-compose up`.
- How to run `npx prisma generate`.
- How to run `npx prisma migrate dev`.
- How to run tests.
- PostgreSQL + Prisma choice and reason.
- Auth flow and how to obtain JWT.
- Main endpoints with sample requests.
- Design decisions around idempotency, Kafka and job lock.

## Swagger / API Docs

Swagger/OpenAPI is required.

Swagger must:

- Document auth bearer token.
- Document `Idempotency-Key` header.
- Document request DTOs and response examples.
- Keep status enum values visible.
- Be available at `GET /docs`.

## Code Style

- TypeScript strict mode.
- NestJS decorators for controllers, DTOs, guards and Swagger docs.
- Prefer dependency injection over manual instantiation.
- Use early returns for guard clauses.
- Avoid nested `if/else`.
- Keep functions small and named by business action.
- No over-engineering: implement minimum robust solution for test scope.
- No frontend code.
- No emojis in code, logs, README or API messages.
- Use npm scripts only.
- Terse, direct commit messages.

## Out of Scope

- No real user management.
- No frontend.
- No production deployment.
- No need for perfect Swagger visual design.
- No need for 100% test coverage.
