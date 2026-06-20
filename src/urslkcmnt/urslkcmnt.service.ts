import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { likeModel } from 'src/schema/like.schema';
import { videoModel } from 'src/schema/video.schema';
import * as amqp from 'amqplib';
@Injectable()
export class UrslkcmntService {
  constructor(
    @InjectModel(videoModel.name)
    private readonly vidoeModel: Model<videoModel>,
    @InjectModel(likeModel.name) private readonly likeModel: Model<likeModel>,
    //inject the token and get the channel
    @Inject('LKCMNTOPS') private readonly aqmpChannel: amqp.Channel,
  ) {}
//topic messageing user* (wild card)
  //toggle like fucntion
  async togglelike(postId: string, userId: string) {
    //deifne th eexchange name here bcz  we gonna need this
    const exchange = 'LIKE_COMMENT';
    //find the post
    const findthepost = await this.vidoeModel.findById(postId);
    //if not find
    if (!findthepost) {
      throw new Error(' psot was not found ');
    }
    //check if liked previously
    const checklike = await this.likeModel.findOne({ postId, userId });
    if (!checklike) {
      //if not liked then liked
      const addlike = await this.likeModel.create({
        userId,
        postId,
      });
      //get ready the payload
      const like_payload = {
        userId,
        postId,
      };
      //routing key and exchange name
      //for transportation

      const routingKey = `user.like`;
      //now publishb the message
      this.aqmpChannel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(like_payload)),
      );
      return addlike;
    }
    //otherwise unliek
    const unlike = await this.likeModel.findOneAndDelete({ postId, userId });
    //get ready the payload
    const unlike_payload = {
      userId,
      postId,
    };
    //same as  like before
    //exchaneg name and routing key
    const routingKey = `user.unlike`;
    //publish message
    this.aqmpChannel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(unlike_payload)),
    );
    return unlike;
  }
}
