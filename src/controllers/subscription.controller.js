import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;

  const conditions = { subscriber: userId, channel: channelId };
  const subscribed = await Subscription.findOne(conditions);
  if (!subscribed) {
    const createSubscription = await Subscription.create(conditions);
    return res
      .status(200)
      .json(new ApiResponse(200, { createSubscription }, "subscribed"));
  } else {
    const deleteSubscription = await Subscription.findOneAndDelete(conditions);
    return res
      .status(200)
      .json(new ApiResponse(200, { deleteSubscription }, "subscribed"));
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const subscribber = await Subscription.find({
    channel: new mongoose.Types.ObjectId(subscriberId),
  });
  return res.status(200).json(new ApiResponse(200, { subscribber }, "Success"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const subscribber = await Subscription.find({
    subscriber: new mongoose.Types.ObjectId(channelId),
  });
  return res.status(200).json(new ApiResponse(200, { subscribber }, "Success"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
