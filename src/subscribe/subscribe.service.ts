import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { subscribeModel } from 'src/schema/subscribe.schema';
import { userModel } from 'src/schema/user.schema';
import * as amqp from 'amqplib';
import * as crypto from 'crypto';
@Injectable()
export class SubscribeService {
  constructor(
    @InjectModel(subscribeModel.name)
    private readonly subscribeModel: Model<subscribeModel>,
    @InjectModel(userModel.name) private readonly userModel: Model<userModel>,
    //inject the token
    @Inject('SUBSCRIBE_NOTIFY') private readonly amqpchannel: amqp.Channel,
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
      //generate uuid for business id  and the event id
      // that for idemopotency
      const eventuuid = crypto.randomUUID();
      const businessuuid = crypto.randomUUID();

      //payload for channel for subscriber alert
      const subscribed_payload = {
        eventId: eventuuid,
        businessuuid: businessuuid,
        channelId: channelId,
        name: findname?.name,
        // messgae: `${findname?.name} subscribed your channel `,
      };
      //now define exchange name and routoing key
      const exchnage = 'SUBSCRIBED';
      const routingKey = 'sbrn';
      //now publish the message
      this.amqpchannel.publish(
        exchnage,
        routingKey,
        Buffer.from(JSON.stringify(subscribed_payload)),
        {
          //set rabbit mqs meta data to tarck the uuid

          messageId: eventuuid,
        },
      );
      return { message: 'subscribed!' };
    }
    //consumer is channel module and channel service
  }
}
