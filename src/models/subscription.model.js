import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      //one who is subscribing
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    channel: {
      //one whom the subscriber is subscribing
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const subscription = mongoose.model("Subscription", subscriptionSchema);
