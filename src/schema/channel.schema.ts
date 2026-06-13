import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';
@Schema({ timestamps: true })
export class channelModel extends Document {
  @Prop({ required: true })
  name!: string;
  @Prop({ default: 0 })
  subscriber!: number;
}
export const channelSchema = SchemaFactory.createForClass(channelModel);
