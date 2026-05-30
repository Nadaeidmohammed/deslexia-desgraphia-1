import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DatabaseError } from 'sequelize';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: any;
    let error: string;

    // 🔥 أهم سطر (هيطلعلك السبب الحقيقي)
    console.log('🔥 FULL ERROR:', exception);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        message = (exceptionResponse as any).message || exceptionResponse;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else if (exception instanceof DatabaseError) {
      status = HttpStatus.BAD_REQUEST;

      // 👇 خلي الرسالة الحقيقية تظهر
      message = exception.message;
      error = exception.name;

      // تفاصيل أكتر لو موجودة
      console.log('🔥 SQL:', (exception as any).parent?.sqlMessage);
      console.log('🔥 PARAMETERS:', exception.parent);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception instanceof Error ? exception.message : exception;
      error = 'Internal Server Error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    };

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json(errorResponse);
  }
}
