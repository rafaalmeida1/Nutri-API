import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { AccessLog, AccessLogSchema } from './schemas/access-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AccessLog.name, schema: AccessLogSchema }]),
  ],
  controllers: [LogsController],  
  providers: [LogsService],
  exports: [
    LogsService,
    MongooseModule.forFeature([{ name: AccessLog.name, schema: AccessLogSchema }])
  ],
})
export class LogsModule {} 