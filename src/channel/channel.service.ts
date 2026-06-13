import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { channelModel } from 'src/schema/channel.schema';

@Injectable()
export class ChannelService {
  constructor(
    @InjectModel(channelModel.name)
    private readonly channelModel: Model<channelModel>,
  ) {}
  //create yt channel
  async createchannel(name: string) {
    return this.channelModel.create({
      name: name,
    });
  }
}
