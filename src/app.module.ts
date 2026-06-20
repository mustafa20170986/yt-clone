import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChannelController } from './channel/channel.controller';
import { ChannelModule } from './channel/channel.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { SubscribeModule } from './subscribe/subscribe.module';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { VideoModule } from './video/video.module';
import { UrslkcmntController } from './urslkcmnt/urslkcmnt.controller';
import { UrslkcmntModule } from './urslkcmnt/urslkcmnt.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Removed UsersController from here (it's not a module)
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),

      inject: [ConfigService],
    }),
    ChannelModule,
    SubscribeModule,
    UserModule,
    VideoModule,
    UrslkcmntModule,
  ],

  controllers: [
    AppController,
    UrslkcmntController,
    //ChannelController, UserController
  ],
  providers: [AppService],
})
export class AppModule {}
