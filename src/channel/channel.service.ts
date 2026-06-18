import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { channelModel } from 'src/schema/channel.schema';
import { sbsModel } from 'src/schema/subscribe.notify.schema';

@Injectable()
export class ChannelService {
  constructor(
    @InjectModel(channelModel.name)
    private readonly channelModel: Model<channelModel>,
    @InjectModel(sbsModel.name)
    private readonly sbsModel: Model<sbsModel>,
  ) {}
  //create yt channel
  async createchannel(name: string) {
    return this.channelModel.create({
      name: name,
    });
  }
  //create notififcation on subcribe
  async notifychannelonsubscribe(channelId: string, name: string) {
    console.log(name, channelId);
    return this.sbsModel.create({
      channelId: channelId,
      message: `${name} is just subscribed your channel `,
    });
  }
  //get notifications
  async getnotifications(channelId: string) {
    return this.sbsModel.findById({ channelId }).select('message');
  }
}
