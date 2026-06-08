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
const MAX_RETRY = 5;
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
    //  Direct Message (Subscriptions)
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
          //if there is failure to sending message retry
          //retry is a property that lies inthe rmq message headers
          //by default the retry doesnt in the msg headers
          //so we are using a fallback so that if there is no retry count
          //in the message headers it wont crash just it will
          //use an {} instead of retry count
          //next when it failed and we have retired then
          //the retry took his place in the message heareds
          const headers = msg.properties.headers || {};

          //it figures out what current retry number is
          //no matter how weird the msg headers is
          let currentretry: number;
          //if current headers is number do nothing
          if (typeof headers['x-retry-count'] === 'number') {
            currentretry = headers['x-retry-count'];
          } else {
            //else fallback set '0' which is string
            //then clen it with numarical 10 base
            const fallback = headers['x-retry-count'] || '0';
            currentretry = parseInt(fallback, 10);
          }
          /*
          typeof headers['x-retry-count'] === 'number'
            ? headers['x-retry-count']
            : parseInt(headers['x-retry-count'] || '0', 10);
            */
          if (currentretry < MAX_RETRY) {
            const nxtretrycount = currentretry + 1;

            console.log(`retrying : ${nxtretrycount}`);

            //extracting the message content from buffer
            const contentbuffer = msg.content;

            //pinned headers
            const currheaders = msg.properties.headers || {};
            //publish back msg to queue set a delay for retry
            setTimeout(() => {
              this.amqpchannel.sendToQueue(queuename, contentbuffer, {
                headers: {
                  //u can use the below comment out line
                  //without the current headers but sometimes the
                  //message headers got undeeind and crash occour
                  //so we extract the message content and message headers
                  // ...msg.properties.headers,
                  ...currheaders,
                  'x-retry-count': nxtretrycount,
                },
              });
            }, 3000);

            this.amqpchannel.ack(msg);
          } else {
            console.log(`max retries: ${MAX_RETRY} sending to dlq`);
            this.amqpchannel.nack(msg, false, false);
          }
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
          //define the headers for retry count
          //initally they dont have .so will use a fallback
          const headers = msg.properties.headers || {};
          //extract the type of count must be number
          let currentretrycnt: number;
          //if headers is retry is already a number
          if (typeof headers['x-retry-count'] === 'number') {
            //do nothing
            currentretrycnt = headers['x-retry-count'];
          } else {
            //if not a number set 0 as a string (fallback)
            //finally convert it as base 10 numarical value
            const fallback = headers['x-retry-count'] || '0';
            currentretrycnt = parseInt(fallback, 10);
          }
          if (currentretrycnt < MAX_RETRY) {
            const nxtretry = currentretrycnt + 1;
            console.log(`retrying LIKE: ${nxtretry}`);

            //extract the message from buffer
            const buffercontent = msg.content;
            //pinned head
            const currhead = msg.properties.headers || {};

            //set time out for delay
            //and retry after a while
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
            console.error(
              '[Topic Error] Dead-lettering message:',
              error.message,
            );
            this.topicchannel.nack(msg, false, false);
          }
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
