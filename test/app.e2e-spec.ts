import { Test, TestingModule } from '@nestjs/testing'
import { HttpStatus, INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from './../src/app.module'
import { PointModule } from '../src/point/point.module'

describe('AppController (e2e)', () => {
    let app: INestApplication

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

    it('/ (PATCH) point charge is success', async () => {
        const userId = 1
        const max = 10
        const amount = 100

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
    })

    // it('/(POST) point use is response BAD_REQUEST cause exceed amount', async () => {
    //     const userId = 1
    //     const charge = 100
    //     const use = 2000

    //     await request(app.getHttpServer())
    //         .patch(`/point/${userId}/charge`)
    //         .send({ amount: charge })
    //         .expect(200)

    //     const result = await request(app.getHttpServer())
    //         .patch(`/point/${userId}/use`)
    //         .send({ amount: use })

    //     expect(result.status).toBe(HttpStatus.BAD_REQUEST)
    // })
})
