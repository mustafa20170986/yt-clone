import { Inject, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { channelModel, channelSchema } from 'src/schema/channel.schema';
import { ChannelController } from './channel.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { sbsModel, sbsSchema } from 'src/schema/subscribe.notify.schema';
import { eventidModel, ProcessedEventSchema } from 'src/schema/eventid.schema';
import { Model } from 'mongoose';

const queuename = 'rn';
const topicqueue = 'user_action';
const dlxfanout = 'rnx';
const dlxtopic = 'dlx_user_action';
const MAX_RETRY = 5;

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: channelModel.name, schema: channelSchema },
      { name: sbsModel.name, schema: sbsSchema },
      { name: eventidModel.name, schema: ProcessedEventSchema },
    ]),
    ConfigModule,
  ],
  controllers: [ChannelController],
  providers: [
    ChannelService,
    // Direct Message (Subscriptions)
    {
      provide: 'SUBSCRIBE_NOTIFY_CONSUMER',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5642';
        const connect = await amqp.connect(cloudamqp);
        const channel = await connect.createChannel();
        const exchange = 'SUBSCRIBED';
        const dlxexchange = 'ernx';

        await channel.assertExchange(dlxexchange, 'fanout', { durable: true });
        await channel.assertQueue(dlxfanout, { durable: true });
        await channel.bindQueue(dlxfanout, dlxexchange, '');

        await channel.assertExchange(exchange, 'direct', { durable: true });
        await channel.assertQueue(queuename, {
          durable: true,
          arguments: { 'x-dead-letter-exchange': dlxexchange },
        });

        await channel.bindQueue(queuename, exchange, 'sbrn');
        return channel;
      },
      inject: [ConfigService],
    },
    // Topic Message (Likes, Comments)
    {
      provide: 'LKCMNTOPS',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5642';
        const connect = await amqp.connect(cloudamqp);
        const channel = await connect.createChannel();
        const exchange = 'LIKE_COMMENT';
        const dlxotopicexchange = 'dlq_like_cmnt';

        await channel.assertExchange(dlxotopicexchange, 'fanout', {
          durable: true,
        });
        await channel.assertQueue(dlxtopic, { durable: true });
        await channel.bindQueue(dlxtopic, dlxotopicexchange, '');

        await channel.assertExchange(exchange, 'topic', { durable: true });

        await channel.assertQueue(topicqueue, {
          durable: true,
          arguments: { 'x-dead-letter-exchange': dlxotopicexchange },
        });

        await channel.bindQueue(topicqueue, exchange, 'user.*');
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [ChannelService],
})
export class ChannelModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject('SUBSCRIBE_NOTIFY_CONSUMER')
    private readonly amqpchannel: amqp.Channel,

    @Inject('LKCMNTOPS')
    private readonly topicchannel: amqp.Channel,

    private readonly channelService: ChannelService,

    @InjectModel(eventidModel.name)
    private readonly eventidModel: Model<eventidModel>,
  ) {}

  async onModuleInit() {
    // ==================== DIRECT QUEUE CONSUMER ====================
    await this.amqpchannel.consume(queuename, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        console.log('[Direct Received]:', payload);

        const { eventId, businessuuid, channelId, name } = payload;

        if (!eventId || !businessuuid) {
          console.log('eventid or business id is missing');
          this.amqpchannel.ack(msg);
          return;
        }

        // Check for duplicate event
        const existeventid = await this.eventidModel.exists({ eventId });
        if (existeventid) {
          console.log('Duplicate event, skipping');
          this.amqpchannel.ack(msg);
          return;
        }

        // Process the business logic
        await this.channelService.notifychannelonsubscribe(channelId, name);

        // Save event for idempotency
        await this.eventidModel.create({ eventId, businessuuid });

        this.amqpchannel.ack(msg);
      } catch (error: any) {
        console.error('[Direct Consumer Error]:', error.message);

        const headers = msg.properties.headers || {};
        let currentretry =
          typeof headers['x-retry-count'] === 'number'
            ? headers['x-retry-count']
            : parseInt(headers['x-retry-count'] || '0', 10);

        if (currentretry < MAX_RETRY) {
          const nxtretrycount = currentretry + 1;
          console.log(`Retrying direct queue: ${nxtretrycount}`);

          const contentbuffer = msg.content;
          const currheaders = msg.properties.headers || {};

          setTimeout(() => {
            this.amqpchannel.sendToQueue(queuename, contentbuffer, {
              headers: {
                ...currheaders,
                'x-retry-count': nxtretrycount,
              },
            });
          }, 3000);

          this.amqpchannel.ack(msg);
        } else {
          console.log(`Max retries reached. Sending to DLQ.`);
          this.amqpchannel.nack(msg, false, false);
        }
      }
    });

    // ==================== TOPIC QUEUE CONSUMER ====================
    await this.topicchannel.consume(topicqueue, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        console.log('[Topic Received]:', payload);

        // Add your like/comment business logic here

        this.topicchannel.ack(msg);
      } catch (error: any) {
        console.error('[Topic Consumer Error]:', error.message);

        const headers = msg.properties.headers || {};
        let currentretry =
          typeof headers['x-retry-count'] === 'number'
            ? headers['x-retry-count']
            : parseInt(headers['x-retry-count'] || '0', 10);

        if (currentretry < MAX_RETRY) {
          const nxtretry = currentretry + 1;
          console.log(`Retrying topic queue: ${nxtretry}`);

          const buffercontent = msg.content;
          const currhead = msg.properties.headers || {};

          setTimeout(() => {
            this.topicchannel.sendToQueue(topicqueue, buffercontent, {
              headers: {
                ...currhead,
                'x-retry-count': nxtretry,
              },
            });
          }, 3000);

          this.topicchannel.ack(msg);
        } else {
          console.error('Max retries reached for topic. Sending to DLQ.');
          this.topicchannel.nack(msg, false, false);
        }
      }
    });
  }

  async onModuleDestroy() {
    try {
      console.log('[RabbitMQ] Closing consumer channels...');
      await this.amqpchannel.close();
      await this.topicchannel.close();
    } catch (error: any) {
      console.error('[RabbitMQ] Error while closing channels:', error.message);
    }
  }
}
