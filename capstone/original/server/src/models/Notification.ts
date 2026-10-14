import { Schema, model, Document, Types } from 'mongoose';

// Spec §3.10 `notifications`. Note: §7 defines no REST routes for reading
// notifications — this model exists so other features (roadmap status ->
// 'live', billing webhook events) can write records now; a GET /notifications
// listing route can be added when the spec actually calls for one.
export type NotificationType = 'new_skill_live' | 'streak_reminder' | 'billing';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['new_skill_live', 'streak_reminder', 'billing'], required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Notification = model<INotification>('Notification', notificationSchema, 'notifications');
