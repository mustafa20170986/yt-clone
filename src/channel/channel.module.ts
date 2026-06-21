import { Inject, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { MongooseModule } from '@nestjs/mongoose';
import { channelModel, channelSchema } from 'src/schema/channel.schema';
import { ChannelController } from './channel.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { sbsModel, sbsSchema } from 'src/schema/subscribe.notify.schema';

const queuename = 'rn';
const topicqueue = 'user_action';
const dlxfanout = 'rnx';
const dlxtopic = 'dlx_user_action';

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
    // --- CONSUMER 1: Direct Message (Subscriptions) ---
    {
      provide: 'SUBSCRIBE_NOTIFY_CONSUMER',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5642';
        const connect = await amqp.connect(cloudamqp);
        const channel = await connect.createChannel();
        const exchange = 'SUBSCRIBED';
        const dlxexchange = 'ernx';

        // Configure Fanout DLX and DLQ
        await channel.assertExchange(dlxexchange, 'fanout', { durable: true });
        await channel.assertQueue(dlxfanout, { durable: true });
        await channel.bindQueue(dlxfanout, dlxexchange, '');

        // Main Queue with Dead Letter Exchange argument linked
        await channel.assertExchange(exchange, 'direct', { durable: true });
        await channel.assertQueue(queuename, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': dlxexchange,
          },
        });

        await channel.bindQueue(queuename, exchange, 'sbrn');
        return channel;
      },
      inject: [ConfigService],
    },
    // --- CONSUMER 2: Topic Message (Likes, Comments) ---
    {
      provide: 'LKCMNTOPS',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5642';
        const connect = await amqp.connect(cloudamqp);
        const channel = await connect.createChannel();
        const exchange = 'LIKE_COMMENT';
        const dlxotopicexchange = 'dlq_like_cmnt';

        // 1. Configure Fanout DLX exchange for topic dead letters
        await channel.assertExchange(dlxotopicexchange, 'fanout', {
          durable: true,
        });

        // 2. Configure the actual DLQ (Clean, no arguments inside itself)
        await channel.assertQueue(dlxtopic, { durable: true });

        // 3. Bind the DLQ to the Fanout DLX (routing key is empty '' for fanout)
        await channel.bindQueue(dlxtopic, dlxotopicexchange, '');

        // 4. Configure the main Topic Exchange
        await channel.assertExchange(exchange, 'topic', { durable: true });

        // 5. 🟢 FIXED: Create the main working queue and link it to the dead letter exchange!
        await channel.assertQueue(topicqueue, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': dlxotopicexchange,
          },
        });

        // 6. Bind the main queue to your routing wildcard
        await channel.bindQueue(topicqueue, exchange, 'user.*');
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [ChannelService],
})
export class ChannelModule implements OnModuleInit, OnModuleDestroy {
  // 🟢 Added OnModuleDestroy interface
  constructor(
    @Inject('SUBSCRIBE_NOTIFY_CONSUMER')
    private readonly amqpchannel: amqp.Channel,
    @Inject('LKCMNTOPS')
    private readonly topicchannel: amqp.Channel,
    private readonly channelService: ChannelService,
  ) {}

  async onModuleInit() {
    // 1. Direct Queue Consumer
    await this.amqpchannel.consume(queuename, async (msg) => {
      if (msg !== null) {
        try {
          const decod_payload = JSON.parse(msg.content.toString());
          if (decod_payload.testFail === true) {
            throw new Error('Intentional direct DLQ test trigger');
          }
          console.log('[Direct Received]:', decod_payload);
          await this.channelService.notifychannelonsubscribe(
            decod_payload.channelId,
            decod_payload.name,
          );
          this.amqpchannel.ack(msg);
        } catch (error) {
          console.error(
            '[Direct Error] Dead-lettering message:',
            error.message,
          );
          this.amqpchannel.nack(msg, false, false);
        }
      }
    });

    // 2. Topic Queue Consumer
    await this.topicchannel.consume(topicqueue, async (msg) => {
      if (msg !== null) {
        try {
          const get_like = JSON.parse(msg.content.toString());
          if (get_like.testFail === true) {
            throw new Error('Intentional topic DLQ test trigger');
          }
          console.log('[Topic Received]:', get_like);
          this.topicchannel.ack(msg);
        } catch (error) {
          console.error('[Topic Error] Dead-lettering message:', error.message);
          this.topicchannel.nack(msg, false, false);
        }
      }
    });
  }

  async onModuleDestroy() {
    try {
      console.log('[RabbitMQ] Closing consumer channels cleanly...');
      await this.amqpchannel.close();
      await this.topicchannel.close();
    } catch (error) {
      console.error('[RabbitMQ] Error while closing channels:', error.message);
    }
  }
}
