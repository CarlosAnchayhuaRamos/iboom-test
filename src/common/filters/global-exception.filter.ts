import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message = this.getMessage(exceptionResponse, exception);
    const error = this.getError(exceptionResponse, statusCode);

    response.status(statusCode).json({
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getMessage(response: string | object | null, exception: unknown) {
    if (typeof response === 'object' && response !== null && 'message' in response) {
      return response.message;
    }

    if (typeof response === 'string') return response;

    if (exception instanceof Error) return exception.message;

    return 'Internal server error';
  }

  private getError(response: string | object | null, statusCode: number) {
    if (typeof response === 'object' && response !== null && 'error' in response) {
      return response.error;
    }

    return HttpStatus[statusCode] ?? 'Error';
  }
}
