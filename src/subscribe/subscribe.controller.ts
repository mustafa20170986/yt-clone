import { Body, Controller, Param, Post } from '@nestjs/common';
import { SubscribeService } from './subscribe.service';

@Controller('subscribe')
export class SubscribeController {
  constructor(private readonly subscribeService: SubscribeService) {}
  @Post('sbs/:subscriberId')
  toggelsubscribe(
    @Param('subscriberId') subscriberId: string,
    @Body('channelId') channelId: string,
  ) {
    return this.subscribeService.togglesubscribe(subscriberId, channelId);
  }
}
