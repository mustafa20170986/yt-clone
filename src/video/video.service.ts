import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { videoModel } from 'src/schema/video.schema';

@Injectable()
export class VideoService {
  constructor(
    @InjectModel(videoModel.name)
    private readonly videoModel: Model<videoModel>,
  ) {}
  //upload video
  async uploadvdo(channelId: string, title: string, content: string) {
    return this.videoModel.create({
      channelId,
      title,
      content,
    });
  }
}
