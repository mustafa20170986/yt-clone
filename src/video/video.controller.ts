import { Body, Controller, Param, Post } from '@nestjs/common';
import { VideoService } from './video.service';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}
  @Post('upload/:channelId')
  uploadvdo(
    @Param('channelId') channelId: string,
    @Body() body: { title: string; content: string },
  ) {
    return this.videoService.uploadvdo(channelId, body.title, body.content);
  }
}
