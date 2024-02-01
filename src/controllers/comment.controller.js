import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const allComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId), // When matching the raw Video id to video id in Database
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit, 10),
    },
  ]);
  return res.status(200).json(new ApiResponse(200, { allComments }, "Success"));
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;

  const userID = req.user._id;
  const { videoId } = req.params;
  if (!content) throw new ApiError(404, "Comment Required");
  const addComments = Comment.create({
    content: content,
    owner: new mongoose.Types.ObjectId(userID),
    video: new mongoose.Types.ObjectId(videoId),
  });
  if (!addComments) throw new ApiError(500, "Something went wrong");
  return res
    .status(200)
    .json(new ApiResponse(200, { addComments: addComments }, "Success"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId?.trim() || !isValidObjectId(commentId)) {
    throw new ApiError(400, "commentId is required or invalid");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );
  if (!comment) {
    throw new ApiError(500, "Something went wrong while updating comment");
  }

  res.status(200).json(new ApiResponse(200, comment, "Comment update success"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const updateComment = await Comment.deleteOne({
    _id: commentId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { updateComment }, "success"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
