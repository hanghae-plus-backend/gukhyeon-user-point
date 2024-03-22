import { Test, TestingModule } from '@nestjs/testing'
import { HttpStatus, INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from './../src/app.module'
import { PointModule } from '../src/point/point.module'

describe('AppController (e2e)', () => {
    let app: INestApplication

    const userId = 1
    const max = 200
    const amount = 100
    const tenSecond = 100000

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule, PointModule],
        }).compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    // it('/ (PATCH) point charge is response BAD_REQUEST cause invalid amount', async () => {
    //     const userId = 1
    //     const amount = -100

    //     const result = await request(app.getHttpServer())
    //         .patch(`/point/${userId}/charge`)
    //         .send({ amount })

    //     expect(result.status).toBe(HttpStatus.BAD_REQUEST)
    // })

    // it(
    //     '/ (PATCH) point charge is response OK',
    //     async () => {
    //         const requests = Array(max)
    //             .fill(null)
    //             .map(async () => {
    //                 await request(app.getHttpServer())
    //                     .patch(`/point/${userId}/charge`)
    //                     .send({ amount })
    //                     .expect(HttpStatus.OK)
    //                     .catch(e =>
    //                         console.error(
    //                             `/point/${userId}/charge Request failed`,
    //                             e,
    //                         ),
    //                     )
    //             })

    //         await Promise.all(requests)

    //         const result = await request(app.getHttpServer())
    //             .get(`/point/${userId}/histories`)
    //             .expect(HttpStatus.OK)

    //         expect(result.body.length).toEqual(max)
    //     },
    //     tenSecond,
    // )

    // it('/(POST) point use is response BAD_REQUEST cause exceed amount', async () => {
    //     await request(app.getHttpServer())
    //         .patch(`/point/${userId}/charge`)
    //         .send({ amount })
    //         .expect(HttpStatus.OK)

    //     await request(app.getHttpServer())
    //         .patch(`/point/${userId}/use`)
    //         .send({ amount: 10000 })
    //         .expect(HttpStatus.BAD_REQUEST)
    // })

    it(
        '/(POST) point use is response OK',
        async () => {
            const requests = Array(max)
                .fill(null)
                .map(() => {
                    // 50% 확률로 충전 선택합니다.
                    const isCharge = Math.random() < 0.5
                    const isValid = Math.random() < 0.1
                    const value = isValid ? -amount : amount

                    if (isCharge) {
                        return request(app.getHttpServer())
                            .patch(`/point/${userId}/charge`)
                            .send({ amount: value })
                            .then(response => {
                                if (response.status >= 400) {
                                    throw new Error(
                                        response.body.message || 'Bad request',
                                    )
                                }
                                return response
                            })
                    } else {
                        return request(app.getHttpServer())
                            .patch(`/point/${userId}/use`)
                            .send({ amount: value })
                            .then(response => {
                                if (response.status >= 400) {
                                    throw new Error(
                                        response.body.message || 'Bad request',
                                    )
                                }
                                return response
                            })
                    }
                })

            const responses = await Promise.allSettled(requests)

            const rejectedResponses = responses.filter(
                r => r.status === 'rejected',
            )

            const groupedByReason = rejectedResponses.reduce(
                (groups, response) => {
                    if (response.status === 'rejected') {
                        const reason = response.reason
                        if (!groups[reason]) {
                            groups[reason] = 0
                        }
                        groups[reason]++
                    }
                    return groups
                },
                {},
            )

            console.log(groupedByReason)

            const successCount = responses.filter(
                r => r.status === 'fulfilled',
            ).length

            const failedCount = rejectedResponses.length

            console.log(
                'Success count:',
                successCount,
                'Failed count:',
                failedCount,
            )

            const result = await request(app.getHttpServer())
                .get(`/point/${userId}`)
                .expect(HttpStatus.OK)

            expect(result.body.id).toEqual(userId)
        },
        tenSecond,
    )
})
