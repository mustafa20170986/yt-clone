import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { channelModel } from './channel.schema';
@Schema({ timestamps: true })
export class videoModel extends Document {
  @Prop({
    type: mongoose.Schema.ObjectId,
    ref: 'channelModel',
    required: true,
  })
  channelId!: channelModel | string;
  @Prop({ required: true })
  title!: string;
  @Prop({ required: true })
  content!: string;
}
export const videoSchema = SchemaFactory.createForClass(videoModel);
