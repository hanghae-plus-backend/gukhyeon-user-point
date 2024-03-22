import { Module } from '@nestjs/common'
import { PointService } from './point.service'
import { PointController } from './point.controller'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'

@Module({
    providers: [PointService, UserPointTable, PointHistoryTable],
    controllers: [PointController],
})
export class PointModule {}
