import { Body, Controller, Param, Post } from '@nestjs/common';
import { UrslkcmntService } from './urslkcmnt.service';

@Controller('like')
export class UrslkcmntController {
  constructor(private readonly urslkcmntService: UrslkcmntService) {}
  @Post('dolike/:postId')
  togglelike(@Param('postId') postId: string, @Body('userId') userId: string) {
    return this.urslkcmntService.togglelike(postId, userId);
  }
}
