import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { videoModel } from 'src/schema/video.schema';
import * as amqp from 'amqplib';

@Injectable()
export class VideoService {
  constructor(
    @InjectModel(videoModel.name)
    private readonly videoModel: Model<videoModel>,
    @Inject('RMQ_RAW') private readonly amqpChannel: amqp.Channel,
  ) {}
  //upload video
  async uploadvdo(channelId: string, title: string, content: string) {
    const video = await this.videoModel.create({
      channelId,
      title,
      content,
    });
    //notification payload
    const notification_payload = {
      videoId: video._id,
      channelId: video.channelId,
      videoTitle: video.title,
      videoContent: video.content,
      message: ` ${video.title}`,
    };
    //now publish it in a channel
    const exchangename = 'video_upload';

    //fanout ignores the routing key
    const routingkey = '';
    this.amqpChannel.publish(
      exchangename,
      routingkey,
      Buffer.from(JSON.stringify(notification_payload)),
    );
    return video;
  }
}
