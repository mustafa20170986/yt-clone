import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChannelService } from './channel.service';

@Controller('channel')
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}
  @Post('createchannel')
  createchannel(@Body('name') name: string) {
    return this.channelService.createchannel(name);
  }
  @Get('notify/:channelId')
  getnotification(@Param('channelId') channelId: string) {
    return this.channelService.getnotifications(channelId);
  }
}
