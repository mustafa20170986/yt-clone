import { Module } from '@nestjs/common';
import { SubscribeController } from './subscribe.controller';
import { SubscribeService } from './subscribe.service';
import { MongooseModule } from '@nestjs/mongoose';
import { subscribeModel, subscribeSchema } from 'src/schema/subscribe.schema';
import { userModel, userShcmea } from 'src/schema/user.schema';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: subscribeModel.name, schema: subscribeSchema },
      { name: userModel.name, schema: userShcmea },
    ]),
  ],
  controllers: [SubscribeController],
  providers: [
    SubscribeService,
    {
      //using  custom provider for rmq token
      // bcz we need an active connection
      provide: 'SUBSCRIBE_NOTIFY',
      useFactory: async (ConfigService: ConfigService) => {
        // cloud amqp url
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5642';
        //connect using the url
        const connect = await amqp.connect(cloudamqp);
        //establsih a channel
        //its basically a virtual network inside TCP connection
        const channel = await connect.createChannel();
        //define the exchange name
        const exchange = 'SUBSCRIBED';
        //assert the excahnge
        //it means check for the excahnge name ..
        //if channel does not exist create it with configuration
        await channel.assertExchange(exchange, 'direct', {
          durable: true,
        });
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [SubscribeService],
})
//consuemr is channel module and channel servie
export class SubscribeModule {}
