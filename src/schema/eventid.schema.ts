import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type ProcessedEventDocument = HydratedDocument<eventidModel>;
@Schema({ timestamps: true })
export class eventidModel {
  @Prop({ type: String, required: true, key: true, unique: true })
  eventId!: string;
  @Prop({ type: String, requird: true, unique: true, key: true })
  businessuuid!: string;
  @Prop({
    type: Date,
    default: Date.now,
    expires: 86400, // Time in seconds (86400 seconds = 24 hours)
  })
  createdAt!: Date;
}
export const ProcessedEventSchema = SchemaFactory.createForClass(eventidModel);
