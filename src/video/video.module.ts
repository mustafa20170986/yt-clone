import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { MongooseModule } from '@nestjs/mongoose';
import { videoModel, videoSchema } from 'src/schema/video.schema';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
//const queue_name = 'user_notiifcation';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: videoModel.name, schema: videoSchema }]),
  ],
  controllers: [VideoController],
  providers: [
    VideoService,
    {
      provide: 'RMQ_RAW',
      useFactory: async (ConfigService: ConfigService) => {
        const cloudamqp =
          ConfigService.get<string>('CLOUDAMQP_URL') || 'amqp://localhost:5672';
        const connect = await amqp.connect(cloudamqp);
        const channel = await connect.createChannel();
        const exchangename = 'video_upload';
        await channel.assertExchange(exchangename, 'fanout', { durable: true });
        return channel;
      },
      inject: [ConfigService],
    },
  ],
  exports: [VideoService],
})
export class VideoModule {}
