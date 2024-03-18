import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
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

    it('/ (PATCH) point charge', async () => {
        const userId = 1

        for (let i = 0; i < 10000; ++i) {
            await request(app.getHttpServer())
                .patch(`/point/${userId}/charge`)
                .send({ amount: 100 })
                .expect(200)
        }

        const result = await request(app.getHttpServer())
            .patch(`/point/${userId}/charge`)
            .send({ amount: 100 })
            .expect(200)

        expect(result.body.id).toBe(userId)
    })
})
