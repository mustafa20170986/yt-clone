import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { userModel } from './user.schema';
@Schema({ timestamps: true })
export class likeModel extends Document {
  @Prop({ type: mongoose.Schema.ObjectId, ref: 'userModel', required: true })
  userId!: userModel | string;
  @Prop({ required: true })
  postId!: string;
}
export const likeSchema = SchemaFactory.createForClass(likeModel);
