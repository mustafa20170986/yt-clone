import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { likeModel } from 'src/schema/like.schema';
import { videoModel } from 'src/schema/video.schema';

@Injectable()
export class UrslkcmntService {
  constructor(
    @InjectModel(videoModel.name)
    private readonly vidoeModel: Model<videoModel>,
    @InjectModel(likeModel.name) private readonly likeModel: Model<likeModel>,
  ) {}
  //toggle like fucntion
  async togglelike(postId: string, userId: string) {
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
      return addlike;
    }
    //otherwise unliek
    const unlike = await this.likeModel.findOneAndDelete({ postId, userId });
    return unlike;
  }
}
