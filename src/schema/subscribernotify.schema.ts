import { Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { userModel } from './user.schema';

export class subscribernotifyModel extends Document {
  @Prop({ type: mongoose.Schema.ObjectId, ref: 'userModel', required: true })
  userId!: userModel | string;
  @Prop({ required: true })
  channelId!: string;
  @Prop({ required: true })
  message!: string;
}
export const subscribernotifySchema = SchemaFactory.createForClass(
  subscribernotifyModel,
);
