import { Module } from '@nestjs/common';
import { UrslkcmntService } from './urslkcmnt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { videoModel, videoSchema } from 'src/schema/video.schema';
import { likeModel, likeSchema } from 'src/schema/like.schema';
import { UrslkcmntController } from './urslkcmnt.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: videoModel.name, schema: videoSchema },
      { name: likeModel.name, schema: likeSchema },
    ]),
  ],
  controllers: [UrslkcmntController],
  providers: [UrslkcmntService],
  exports: [UrslkcmntService],
})
export class UrslkcmntModule {}
