import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccessLog, AccessLogDocument } from './schemas/access-log.schema';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(AccessLog.name)
    private readonly accessLogModel: Model<AccessLogDocument>,
  ) {}

  async findByUser(userId: string, limit = 100): Promise<AccessLog[]> {
    return this.accessLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findByTenant(tenantId: string, limit = 100): Promise<AccessLog[]> {
    return this.accessLogModel
      .find({ tenantId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findFailedLogins(tenantId?: string): Promise<AccessLog[]> {
    const filter: any = {
      success: false,
      action: 'login',
    };

    if (tenantId) {
      filter.tenantId = tenantId;
    }

    return this.accessLogModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(50)
      .exec();
  }

  async getAccessStats(tenantId?: string) {
    const matchStage: any = {};
    if (tenantId) {
      matchStage.tenantId = tenantId;
    }

    const stats = await this.accessLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAccess: { $sum: 1 },
          successfulAccess: { $sum: { $cond: ['$success', 1, 0] } },
          failedAccess: { $sum: { $cond: ['$success', 0, 1] } },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          _id: 0,
          totalAccess: 1,
          successfulAccess: 1,
          failedAccess: 1,
          uniqueUsersCount: { $size: '$uniqueUsers' },
          successRate: {
            $multiply: [
              { $divide: ['$successfulAccess', '$totalAccess'] },
              100,
            ],
          },
        },
      },
    ]);

    return stats[0] || {
      totalAccess: 0,
      successfulAccess: 0,
      failedAccess: 0,
      uniqueUsersCount: 0,
      successRate: 0,
    };
  }

  async getAccessByHour(tenantId?: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage: any = {
      timestamp: { $gte: startDate },
    };

    if (tenantId) {
      matchStage.tenantId = tenantId;
    }

    return this.accessLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } },
    ]);
  }

  async getMostAccessedResources(tenantId?: string, limit = 10) {
    const matchStage: any = {};
    if (tenantId) {
      matchStage.tenantId = tenantId;
    }

    return this.accessLogModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
          successCount: { $sum: { $cond: ['$success', 1, 0] } },
          methods: { $addToSet: '$method' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }
} 