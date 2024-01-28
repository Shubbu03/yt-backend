import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFile } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const sortOptions = {};

  if (sortBy) {
    sortOptions[sortBy] = sortType == "desc" ? -1 : 1;
  }

  let basequery = {};

  if (query) {
    basequery.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  const result = await Video.aggregate([
    {
      $match: {
        ...basequery,
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: sortOptions,
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  console.log(result);

  return res.status(200).json(new ApiResponse(200, { result }, "Success"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const userID = req.user._id;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required!!");
  }

  const localVideoPath = req.files?.video[0]?.path;

  if (!localVideoPath) {
    throw new ApiError(400, "Video not uploaded correctly!!");
  }

  const localThumbnailPath = req.files?.thumbnail[0]?.path;

  if (!localThumbnailPath) {
    throw new ApiError(400, "Thumbnail not uploaded correctly!!");
  }

  const vid = uploadOnCloudinary(localVideoPath);

  const thumb = uploadOnCloudinary(localThumbnailPath);

  if (!(vid || thumb)) {
    throw new ApiError(400, "Error uploading video or thumbnail!!");
  }

  const video = await Video.create({
    videoFile: vid,
    thumbnail: thumb,
    owner: userID,
    title: title,
    description: description,
    duration: uploadOnCloudinary.duration,
  });

  if (!video) {
    throw new ApiError(500, "Error while uploading video, please try again!!");
  }

  return res.status(200).json(new ApiResponse(200, video, "Success"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required!!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found with given ID!!");
  }

  return res.status(200).json(new ApiResponse(200, video, "Video Found"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const localFilePathofthumbnail = req.file.path;

  if (!localFilePathofthumbnail) {
    throw new ApiError(404, "File not found");
  }

  const uploadCloud = await uploadOnCloudinary(localFilePathofthumbnail);

  if (!uploadCloud.url) {
    throw new ApiError(500, "Unable to upload to cloud");
  }
  const public_id_video = await Video.findById(videoId);

  const uploadfileonServer = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: uploadCloud.url,
        title: title,
        description: description,
      },
    },
    { new: true }
  );
  if (!uploadfileonServer)
    throw new ApiError(500, "Unable to update video on server");
  return res
    .status(200)
    .json(new ApiResponse(200, { uploadfileonServer }, "Success"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const public_id_video = await Video.findById(
    new mongoose.Types.ObjectId(videoId)
  );

  if (!public_id_video) {
    throw new ApiError(404, "Video not found");
  }

  const uploadfileonServer = await Video.findByIdAndDelete(videoId);

  if (!uploadfileonServer) {
    throw new ApiError(500, "Unable to delete video on server");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { uploadfileonServer }, "Success"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const toggel = await Video.findOneAndUpdate({ _id: videoId }, [
    { $set: { isPublished: { $not: "$isPublished" } } },
  ]);
  return res.status(200).json(new ApiResponse(200, { toggel }, "Updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
