import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { PointHistory, TransactionType, UserPoint } from './point.model'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'
import AsyncLock = require('async-lock')

enum PointExceptionMessage {
    INVALID_POINT = '올바르지 않은 포인트 입니다.',
    EXCEED_DO_USE_POINT = '사용하려는 포인트가 보유 포인트보다 큽니다.',
}

@Injectable()
export class PointService {
    private lock = new AsyncLock()
    private readonly logger = new Logger(PointService.name)

    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    async point(id: number): Promise<UserPoint> {
        return await this.userDb.selectById(id)
    }

    async history(id: number): Promise<PointHistory[]> {
        return await this.historyDb.selectAllByUserId(id)
    }

    async charge(id: number, amount: number): Promise<UserPoint> {
        this.validatePoint(amount)

        return this.lock.acquire(`user_${id}`, async () => {
            const currentUserPoint = await this.userDb.selectById(id)

            return await this.modifyUserPoint(
                currentUserPoint,
                amount,
                TransactionType.CHARGE,
            )
        })
    }

    async use(id: number, amount: number): Promise<UserPoint> {
        this.validatePoint(amount)

        return this.lock.acquire(`user_${id}`, async () => {
            const currentUserPoint = await this.userDb.selectById(id)
            if (currentUserPoint.point < amount) {
                throw new BadRequestException(
                    PointExceptionMessage.EXCEED_DO_USE_POINT,
                )
            }

            return await this.modifyUserPoint(
                currentUserPoint,
                -amount,
                TransactionType.USE,
            )
        })
    }

    validatePoint(amount: number) {
        if (amount <= 0 || amount > 1000000) {
            throw new BadRequestException(PointExceptionMessage.INVALID_POINT)
        }
    }

    async modifyUserPoint(
        currentUserPoint: UserPoint,
        amount: number,
        type: TransactionType,
    ): Promise<UserPoint> {
        // 사용자 포인트 적용
        const updatedPoint = currentUserPoint.point + amount
        let updatedUserPoint: UserPoint

        try {
            // 사용자 포인트 갱신
            updatedUserPoint = await this.userDb.insertOrUpdate(
                currentUserPoint.id,
                updatedPoint,
            )
        } catch (error) {
            this.handleError(error)
        }

        try {
            // 로그 남기기
            await this.historyDb.insert(
                currentUserPoint.id,
                amount,
                type,
                updatedUserPoint.updateMillis,
            )

            return {
                id: currentUserPoint.id,
                point: updatedPoint,
                updateMillis: updatedUserPoint.updateMillis,
            }
        } catch (error) {
            // historyDb.insert가 실패하면 userDb.insertOrUpdate의 변경 사항을 롤백
            try {
                await this.userDb.insertOrUpdate(
                    currentUserPoint.id,
                    currentUserPoint.point, // 원래 포인트로 롤백
                )
            } catch (rollbackError) {
                // 롤백 실패: 로그를 남김
                this.logger.error(
                    'Failed to rollback user point update:',
                    rollbackError,
                )
            }
            this.handleError(error)
        }
    }

    handleError(error: any) {
        //실제 db라면 error를 instnaceof로 구분하여 처리할 것
        throw error
    }
}
