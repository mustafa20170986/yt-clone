import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { subscribeModel } from 'src/schema/subscribe.schema';
import { userModel } from 'src/schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(userModel.name) private readonly userMdoel: Model<userModel>,
    // @InjectModel(subscribeModel.name)
    //private readonly subscribernotifyModel: Model<subscribeModel>,
    @InjectModel(subscribeModel.name)
    private readonly subscribeModel: Model<subscribeModel>,
  ) {}
  //create user function
  async createuser(name: string, email: string) {
    //check if the email is already there
    const findinfo = await this.userMdoel.findOne({}).select('email name');
    if (findinfo?.email) {
      return { message: 'email already exist ' };
    }
    //else just pass the case
    return this.userMdoel.create({
      name,
      email,
    });
  }
  async handlevideo(videodata: {
    channelId: string;
    videoId: string;
    message: string;
  }) {
    const { channelId, message } = videodata;
    //get alll the subscriber who subscribe the channel
    const findsubscriber = await this.subscribeModel.find({
      channels: channelId,
    });
    //send notification to the subscriber of fthe channel
    const notifications = findsubscriber.map((sub) => {
      return this.subscribeModel.create({
        subscriber: sub.subscriber,
        channels: [channelId],
        name: `Notification ${message}`,
      });
    });
    const creaetnotification = await Promise.all(notifications);
    return creaetnotification;
  }
  async getUserNotifications(userId: string) {
    console.log(`[Database] Querying notifications for user: ${userId}`);

    // Finds documents where 'subscriber' matches the user's ID
    // and looks for names starting with "Notification"
    return this.subscribeModel
      .find({
        subscriber: userId,
        name: { $regex: /^Notification/ },
      })
      .sort({ _id: -1 }); // Sorts by newest first
  }
}
