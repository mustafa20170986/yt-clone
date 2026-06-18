import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { userModel, userShcmea } from 'src/schema/user.schema';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  subscribernotifyModel,
  subscribernotifySchema,
} from 'src/schema/subscribernotify.schema';
import { subscribeModel, subscribeSchema } from 'src/schema/subscribe.schema';
const queuename = 'user_notification_queue';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: userModel.name, schema: userShcmea },
      { name: subscribernotifyModel.name, schema: subscribernotifySchema },
      { name: subscribeModel.name, schema: subscribeSchema },
    ]),
    ConfigModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'RMQ_RAW_CONSUMER',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5672';

        const connection = await amqp.connect(cloudamqp);
        const channel = await connection.createChannel();
        const exchangename = 'video_upload';
        await channel.assertExchange(exchangename, 'fanout', { durable: true });
        await channel.assertQueue(queuename, { durable: true });

        //create a dedicated queue for this

        //now bind it
        await channel.bindQueue(queuename, exchangename, '');
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [UserService],
})
export class UserModule implements OnModuleInit {
  constructor(
    @Inject('RMQ_RAW_CONSUMER') private readonly amqpChannel: amqp.Channel,
    private readonly userService: UserService,
  ) {}
  async onModuleInit() {
    await this.amqpChannel.consume(queuename, async (msg) => {
      if (msg !== null) {
        try {
          const vid_data = JSON.parse(msg.content.toString());
          //forward this into userservice
          await this.userService.handlevideo(vid_data);
          this.amqpChannel.ack(msg);
        } catch (error) {
          console.log(error);
        }
      }
    });
  }
}
//export class UserModule {}
