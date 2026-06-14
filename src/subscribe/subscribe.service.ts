import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { subscribeModel } from 'src/schema/subscribe.schema';
import { userModel } from 'src/schema/user.schema';

@Injectable()
export class SubscribeService {
  constructor(
    @InjectModel(subscribeModel.name)
    private readonly subscribeModel: Model<subscribeModel>,
    @InjectModel(userModel.name) private readonly userModel: Model<userModel>,
  ) {}
  //toggle subscribe
  async togglesubscribe(subscriberId: string, channelId: string) {
    //find the name
    const findname = await this.userModel.findById(subscriberId).select('name');
    //find if subscribed
    const findsubscription = await this.subscribeModel.findOne({
      subscriber: subscriberId,
    });
    //if not the subscribe
    if (!findsubscription) {
      console.log(subscriberId, channelId);
      return this.subscribeModel.create({
        subscriber: subscriberId,
        name: findname?.name,
        channels: [channelId],
      });
    }
    const indexofchannel = findsubscription.channels.indexOf(channelId);
    if (indexofchannel > -1) {
      findsubscription.channels.splice(indexofchannel, 1);
      await findsubscription.save();
      return { message: 'unsubscribed' };
    } else {
      findsubscription.channels.push(channelId);
      await findsubscription.save();
      return { message: 'subscribed!' };
    }
  }
}
