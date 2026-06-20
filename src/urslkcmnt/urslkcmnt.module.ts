import { Module } from '@nestjs/common';
import { UrslkcmntService } from './urslkcmnt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { videoModel, videoSchema } from 'src/schema/video.schema';
import { likeModel, likeSchema } from 'src/schema/like.schema';
import { UrslkcmntController } from './urslkcmnt.controller';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: videoModel.name, schema: videoSchema },
      { name: likeModel.name, schema: likeSchema },
    ]),
  ],
  controllers: [UrslkcmntController],
  providers: [
    UrslkcmntService,
    {
      //custom token for rmq for communication
      provide: 'LKCMNTOPS',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhsot:5642';
        //connect with the url
        const connect = await amqp.connect(cloudamqp);
        //establish a channel
        const channel = await connect.createChannel();
        //define the exchaneg name
        const exchange = 'LIKE_COMMENT';
        //assert the exchaneg in the queue
        await channel.assertExchange(exchange, 'topic', { durable: true });
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [UrslkcmntService],
})
export class UrslkcmntModule {}
