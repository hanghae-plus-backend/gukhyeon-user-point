import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PointService } from './point.service'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'

describe('PointService', () => {
    let service: PointService
    let userDb: jest.Mocked<UserPointTable>

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PointService,
                {
                    provide: UserPointTable,
                    useValue: {
                        selectById: jest.fn(),
                        insertOrUpdate: jest.fn(),
                    },
                },
                {
                    provide: PointHistoryTable,
                    useValue: {
                        insert: jest.fn(),
                        selectAllByUserId: jest.fn(),
                    },
                },
            ],
        }).compile()

        service = module.get<PointService>(PointService)
        userDb = module.get<UserPointTable>(
            UserPointTable,
        ) as jest.Mocked<UserPointTable>
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('charge', () => {
        it('should increase user points on charge', async () => {
            const userId = 1
            const initialPoints = 100
            const chargeAmount = 50

            userDb.selectById.mockResolvedValueOnce({
                id: userId,
                point: initialPoints,
                updateMillis: Date.now(),
            })

            userDb.insertOrUpdate.mockResolvedValueOnce({
                id: userId,
                point: initialPoints + chargeAmount,
                updateMillis: Date.now(),
            })

            const result = await service.charge(userId, chargeAmount)

            expect(userDb.insertOrUpdate).toHaveBeenCalledWith(
                userId,
                initialPoints + chargeAmount,
            )
            expect(result.point).toEqual(initialPoints + chargeAmount)
        })
    })

    describe('use', () => {
        it('should decrease user points on use', async () => {
            const userId = 1
            const initialPoints = 100
            const useAmount = 50

            userDb.selectById.mockResolvedValueOnce({
                id: userId,
                point: initialPoints,
                updateMillis: Date.now(),
            })

            userDb.insertOrUpdate.mockResolvedValueOnce({
                id: userId,
                point: initialPoints - useAmount,
                updateMillis: Date.now(),
            })

            const result = await service.use(userId, useAmount)

            expect(userDb.insertOrUpdate).toHaveBeenCalledWith(
                userId,
                initialPoints - useAmount,
            )
            expect(result.point).toEqual(initialPoints - useAmount)
        })

        it('should throw BadRequestException if user points are insufficient', async () => {
            const userId = 1
            const initialPoints = 30
            const useAmount = 50

            userDb.selectById.mockResolvedValueOnce({
                id: userId,
                point: initialPoints,
                updateMillis: Date.now(),
            })

            await expect(service.use(userId, useAmount)).rejects.toThrow(
                BadRequestException,
            )
        })
    })

    describe('validatePoint', () => {
        it('should throw BadRequestException for invalid points', () => {
            expect(() => service.validatePoint(0)).toThrow(BadRequestException)
            expect(() => service.validatePoint(-1)).toThrow(BadRequestException)
            expect(() => service.validatePoint(1000001)).toThrow(
                BadRequestException,
            )
        })
    })
})
