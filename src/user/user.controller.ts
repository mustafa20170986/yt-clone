import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('createuser')
  createuser(@Body() body: { name: string; email: string }) {
    return this.userService.createuser(body.name, body.email);
  }
}
