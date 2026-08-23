import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { StructuredLoggerService } from '../logger/structured-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLoggerService(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? res : { message: res };
    } else if (exception instanceof Error) {
      message = { message: exception.message };
    }

    this.logger.error('HTTP Exception caught', exception instanceof Error ? exception.stack : undefined);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      error: message,
    });
  }
}
