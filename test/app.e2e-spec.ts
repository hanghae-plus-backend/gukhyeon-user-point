import { Test, TestingModule } from '@nestjs/testing'
import { HttpStatus, INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from './../src/app.module'
import { PointModule } from '../src/point/point.module'

describe('AppController (e2e)', () => {
    let app: INestApplication

    const userId = 1
    const max = 10
    const amount = 100
    const tenSecond = 100000

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule, PointModule],
        }).compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    it('/ (PATCH) point charge is response BAD_REQUEST cause invalid amount', async () => {
        const userId = 1
        const amount = -100

        const result = await request(app.getHttpServer())
            .patch(`/point/${userId}/charge`)
            .send({ amount })

        expect(result.status).toBe(HttpStatus.BAD_REQUEST)
    })

    it(
        '/ (PATCH) point charge is response OK',
        async () => {
            const requests = Array(max)
                .fill(null)
                .map(async () => {
                    await request(app.getHttpServer())
                        .patch(`/point/${userId}/charge`)
                        .send({ amount })
                        .expect(HttpStatus.OK)
                })

            await Promise.all(requests)

            const result = await request(app.getHttpServer())
                .get(`/point/${userId}/histories`)
                .expect(HttpStatus.OK)

            expect(result.body.length).toEqual(max)
        },
        tenSecond,
    )

    it('/(POST) point use is response BAD_REQUEST cause exceed amount', async () => {
        await request(app.getHttpServer())
            .patch(`/point/${userId}/charge`)
            .send({ amount })
            .expect(HttpStatus.OK)

        await request(app.getHttpServer())
            .patch(`/point/${userId}/use`)
            .send({ amount: 10000 })
            .expect(HttpStatus.BAD_REQUEST)
    })

    it(
        '/(POST) point use is response OK',
        async () => {
            await request(app.getHttpServer())
                .patch(`/point/${userId}/charge`)
                .send({ amount: 1000 })
                .expect(HttpStatus.OK)

            const requests = Array(max)
                .fill(null)
                .map(async () => {
                    await request(app.getHttpServer())
                        .patch(`/point/${userId}/use`)
                        .send({ amount })
                        .expect(HttpStatus.OK)
                })

            await Promise.all(requests)

            const result = await request(app.getHttpServer())
                .get(`/point/${userId}`)
                .expect(HttpStatus.OK)

            expect(result.body.id).toEqual(userId)
        },
        tenSecond,
    )
})
