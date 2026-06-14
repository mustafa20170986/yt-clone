import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { MongooseModule } from '@nestjs/mongoose';
import { videoModel, videoSchema } from 'src/schema/video.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: videoModel.name, schema: videoSchema }]),
  ],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
