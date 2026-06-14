import { Module } from '@nestjs/common';
import { SubscribeController } from './subscribe.controller';
import { SubscribeService } from './subscribe.service';
import { MongooseModule } from '@nestjs/mongoose';
import { subscribeModel, subscribeSchema } from 'src/schema/subscribe.schema';
import { userModel, userShcmea } from 'src/schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: subscribeModel.name, schema: subscribeSchema },
      { name: userModel.name, schema: userShcmea },
    ]),
  ],
  controllers: [SubscribeController],
  providers: [SubscribeService],
  exports: [SubscribeService],
})
export class SubscribeModule {}
