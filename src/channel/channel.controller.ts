import { Body, Controller, Post } from '@nestjs/common';
import { ChannelService } from './channel.service';

@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}
  @Post('createchannel')
  createchannel(@Body('name') name: string) {
    return this.channelService.createchannel(name);
  }
}
