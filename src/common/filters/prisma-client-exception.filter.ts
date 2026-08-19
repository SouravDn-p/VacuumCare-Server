import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../../generated/prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        // Try to extract fields from standard target, or driver adapter cause if available
        let fields: string[] = [];
        if (Array.isArray(exception.meta?.target)) {
          fields = exception.meta.target as string[];
        } else if (
          exception.meta?.driverAdapterError &&
          typeof exception.meta.driverAdapterError === 'object' &&
          (exception.meta.driverAdapterError as any).cause?.constraint?.fields
        ) {
          fields = (exception.meta.driverAdapterError as any).cause.constraint.fields;
        }

        const fieldMessage = fields.length > 0 ? fields.join(', ') : 'unique constraint';
        
        response.status(status).json({
          statusCode: status,
          message: `${exception.meta?.modelName || 'Record'} already exists. Conflict on: ${fieldMessage}.`,
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: exception.meta?.cause || 'Record not found.',
          error: 'Not Found',
        });
        break;
      }
      default:
        // Pass unhandled Prisma errors to the default exception filter
        super.catch(exception, host);
        break;
    }
  }
}
