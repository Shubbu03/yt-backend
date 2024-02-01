import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!name) throw new ApiError(404, "Name is Required field");
  const createPlaylist = await Playlist.create({
    name,
    description,
    videos: videoId,
    owner: userId,
  });
  if (!createPlaylist) throw new ApiError(500, "Unable to create playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, { createPlaylist }, "Success"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const allPlaylists = await Playlist.find({
    owner: new mongoose.Types.ObjectId(userId),
  });
  if (!allPlaylists) throw new ApiError(401, "No Playlists found");
  return res
    .status(200)
    .json(new ApiResponse(200, { allPlaylists }, "Success"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const allPlaylistsbyid = await Playlist.find({
    _id: new mongoose.Types.ObjectId(playlistId),
  });
  if (!allPlaylistsbyid) throw new ApiError(401, "No Playlists found");
  return res
    .status(200)
    .json(new ApiResponse(200, { allPlaylistsbyid }, "Success"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const addtoPlaylist = await Playlist.updateOne(
    { _id: new mongoose.Types.ObjectId(playlistId) },
    { $push: { videos: videoId } }
  );
  if (!addtoPlaylist) throw new ApiError(500, "Unable to update playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, { addtoPlaylist }, "Success"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  const removeVideoFromPlaylistRequest = await Playlist.updateOne(
    {
      _id: new mongoose.Types.ObjectId(playlistId),
    },
    { $pull: { videos: new mongoose.Types.ObjectId(videoId) } }
  );
  if (!removeVideoFromPlaylistRequest)
    throw new ApiError(500, "Unable to update playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, { removeVideoFromPlaylistRequest }, "Success"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const deletePlaylistRequest = await Playlist.findByIdAndDelete(
    new mongoose.Types.ObjectId(playlistId)
  );
  if (!deletePlaylistRequest)
    throw new ApiError(500, "Unbale to deleted playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, { deletePlaylistRequest }, "Success"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!name) throw new ApiError(404, "Name is required");
  const updatePlaylist = await Playlist.updateOne(
    {
      _id: new mongoose.Types.ObjectId(playlistId),
    },
    { $set: { name: name, description: description } }
  );
  if (!updatePlaylist) throw new ApiError(500, "some error occurred");
  return res
    .status(200)
    .json(new ApiResponse(200, { updatePlaylist }, "success"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
