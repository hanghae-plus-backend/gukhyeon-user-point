import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, ValidationPipe } from "@nestjs/common";
import { PointHistory, TransactionType, UserPoint } from "./point.model";
import { UserPointTable } from "src/database/userpoint.table";
import { PointHistoryTable } from "src/database/pointhistory.table";
import { PointBody as PointDto } from "./point.dto";

@Controller('/point')
export class PointController {
    taskQueues: Map<number, Promise<any>> = new Map();

    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    enqueueTask(userId: number, task: () => Promise<void>): Promise<void> {
        const previousTask = this.taskQueues.get(userId) || Promise.resolve();
        const nextTask = async () => {
            try {
                await previousTask;
            } catch (error) {
                // Previous task failed; we're catching the error to not break the chain.
                console.error("Previous task failed", error);
            }
            return task();
        };
    
        const taskPromise = nextTask();
        this.taskQueues.set(userId, taskPromise);
    
        // Ensures the task is removed from the queue once it's completed or failed.
        taskPromise.then(
            () => this.taskQueues.delete(userId),
            () => this.taskQueues.delete(userId)
        );
    
        return taskPromise;
    }

    /**
     * TODO - 특정 유저의 포인트를 조회하는 기능을 작성해주세요.
     */
    @Get(':id')
    async point(@Param('id') id): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        return {id: userId, point: (await this.userDb.selectById(userId)).point, updateMillis: Date.now()} 
    }

    /**
     * TODO - 특정 유저의 포인트 충전/이용 내역을 조회하는 기능을 작성해주세요.
     */
    @Get(':id/histories')
    async history(@Param('id') id): Promise<PointHistory[]> {
        const userId = Number.parseInt(id)
        return await this.historyDb.selectAllByUserId(userId);
    }

    /**
     * TODO - 특정 유저의 포인트를 충전하는 기능을 작성해주세요.
     */
    @Patch(':id/charge')
    async charge(
        @Param('id') id,
        @Body(ValidationPipe) pointDto: PointDto,
    ): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        const amount = pointDto.amount

        //포인트 충전할때 유의해야할것
        //(1) 충전하려는 포인트가 마이너스(예외의 값)인가
        //(2) 충전하려는 포인트가 너무 크진 않은가
        if(amount < 0 || amount > 100000) throw new BadRequestException('올바르지 않은 포인트 입니다.');

        await this.enqueueTask(userId, async () => {
            const currentUserPoint = await this.userDb.selectById(userId);
            await this.modifyUserPoint(currentUserPoint,amount,TransactionType.CHARGE);
        });


        const updatedPoint = await this.userDb.selectById(userId);
        return {id: updatedPoint.id, point: updatedPoint.point, updateMillis: Date.now()}
    }

    /**
     * TODO - 특정 유저의 포인트를 사용하는 기능을 작성해주세요.
     */
    @Patch(':id/use')
    async use(
        @Param('id') id,
        @Body(ValidationPipe) pointDto: PointDto,
    ): Promise<UserPoint> {
        const userId = Number.parseInt(id)
        const amount = pointDto.amount

        //포인트 사용할때 유의해야할것
        //(1) 사용하려는 포인트가 마이너스(예외의 값)인가
        //(2) 사용하려는 포인트가 너무 크진 않은가
        //(3) 사용하려는 포인트가 유저가 가지고 있는 포인트보다 큰가
        if(amount < 0 || amount > 100000) throw new BadRequestException('올바르지 않은 포인트 입니다.');

        await this.enqueueTask(userId, async () => {
            // 사용자의 포인트 조회
            const currentUserPoint = await this.userDb.selectById(userId);
            if(currentUserPoint.point < amount) throw new BadRequestException('사용하려는 포인트가 보유 포인트보다 큽니다.');

            await this.modifyUserPoint(currentUserPoint,-amount,TransactionType.USE)
        });
        
        const updatedPoint = await this.userDb.selectById(userId);
        return {id: updatedPoint.id, point: updatedPoint.point, updateMillis: Date.now()} 
    }

    async modifyUserPoint(currentUserPoint: UserPoint,amount:number,type:TransactionType):Promise<UserPoint>{
        // 사용자 포인트 적용
        const updatedPoint = currentUserPoint.point + amount;

        // 사용자 포인트 갱신
        const updatedUserPoint = await this.userDb.insertOrUpdate(currentUserPoint.id, updatedPoint);

        // 로그 남기기
        await this.historyDb.insert(currentUserPoint.id,amount,type,Date.now())

        return { id: currentUserPoint.id, point: updatedUserPoint.point, updateMillis: Date.now() }
    }
}