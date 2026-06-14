import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { userModel } from './user.schema';
@Schema({ timestamps: true })
export class subscribeModel extends Document {
  @Prop({ type: mongoose.Schema.ObjectId, ref: 'userModel', required: true })
  subscriber!: userModel | string;
  @Prop({ required: true })
  name!: string;
  @Prop({ type: [String] })
  channels!: string[];
}
export const subscribeSchema = SchemaFactory.createForClass(subscribeModel);
