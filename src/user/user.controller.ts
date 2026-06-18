import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { UserService } from './user.service';
import * as amqp from 'amqplib';

const queuename = 'user_notification_queue';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject('RMQ_RAW_CONSUMER') private readonly amqpChannel: amqp.Channel,
  ) {
    this.listenToVideoUploads();
  }

  @Post('createuser')
  createuser(@Body() body: { name: string; email: string }) {
    return this.userService.createuser(body.name, body.email);
  }

  // 🟢 NEW HTTP GET ROUTE: Fetch notifications for a user ID
  @Get('notifications/:userId')
  getNotifications(@Param('userId') userId: string) {
    return this.userService.getUserNotifications(userId);
  }

  private async listenToVideoUploads() {
    await this.amqpChannel.consume(queuename, async (msg) => {
      if (msg !== null) {
        try {
          const vid_data = JSON.parse(msg.content.toString());
          await this.userService.handlevideo(vid_data);
          this.amqpChannel.ack(msg);
        } catch (error) {
          console.error(error);
          this.amqpChannel.nack(msg, false, true);
        }
      }
    });
  }
}
