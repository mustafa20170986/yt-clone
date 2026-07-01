import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { subscribeModel } from './subscribe.schema';
import { Document } from 'mongoose';
@Schema({ timestamps: true })
export class sbsModel extends Document {
  @Prop({
    type: String,
    required: true,
  })
  channelId!: string;
  @Prop({ required: true })
  message!: string;
}
export const sbsSchema = SchemaFactory.createForClass(sbsModel);
