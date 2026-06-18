import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { MongooseModule } from '@nestjs/mongoose';
import { channelModel, channelSchema } from 'src/schema/channel.schema';
import { ChannelController } from './channel.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  subscribernotifyModel,
  subscribernotifySchema,
} from 'src/schema/subscribernotify.schema';
import { stringify } from 'querystring';
import { sbsModel, sbsSchema } from 'src/schema/subscribe.notify.schema';
//defining the queue name
//queue works as like mailbox for this
const queuename = 'rn';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: channelModel.name, schema: channelSchema },
      { name: sbsModel.name, schema: sbsSchema },
    ]),
    ConfigModule,
  ],
  controllers: [ChannelController],
  providers: [
    ChannelService,
    {
      //custom token for consumer
      provide: 'SUBSCRIBE_NOTIFY_CONSUMER',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5642';
        const connect = await amqp.connect(cloudamqp);
        const channel = await connect.createChannel();
        const exchange = 'SUBSCRIBED';
        await channel.assertExchange(exchange, 'direct', { durable: true });
        //here wew are cretaing queue for stroing messages
        await channel.assertQueue(queuename, { durable: true });
        await channel.bindQueue(queuename, exchange, 'sbrn');
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [ChannelService],
})
export class ChannelModule implements OnModuleInit {
  //this will executed when the module starts
  // we willl get a live connection for rabbit mq (consumer)
  constructor(
    //inject the consuemr token
    @Inject('SUBSCRIBE_NOTIFY_CONSUMER')
    private readonly amqpchannel: amqp.Channel,
    private readonly channelService: ChannelService,
  ) {}
  //run the function which will listen for message
  async onModuleInit() {
    //listen for the messages on the queue
    await this.amqpchannel.consume(queuename, async (msg) => {
      if (msg !== null) {
        try {
          //decode the data (in the paylaod it is inthe binaryfrom)
          const decod_payload = JSON.parse(msg.content.toString());
          console.log(decod_payload);
          await this.channelService.notifychannelonsubscribe(
            decod_payload.channelId,
            decod_payload.name,
          );
          this.amqpchannel.ack(msg);
        } catch (error) {
          console.log(error);
        }
      }
    });
  }
  async onModuleDestroy() {
    try {
      console.log('[RabbitMQ] Closing consumer channel cleanly...');
      await this.amqpchannel.close();
    } catch (error) {
      console.error('[RabbitMQ] Error while closing channel:', error.message);
    }
  }
}
//export class ChannelModule {}
