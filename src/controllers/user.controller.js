import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { response } from "express";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userID) => {
  try {
    const user = await User.findById(userID);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken,
      refreshToken,
    };
  } catch {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //MY ATTEMPT=>
  //show ui to user
  // take details
  //send post request
  //store in db

  //PROPER CORRECT STEPS =>
  //1.take user data
  //2.validation - should not be empty
  //3.check if already exist
  //4.check for images ,avatar
  //5.upload them to cloudnary,avatar
  //6.create user object - create entry in db
  //7.remove password and refresh token field from response
  //8.check for user creation response
  //9.return response

  //1 ->
  const { fullname, email, username, password } = req.body;

  // console.log("email:", email);

  // if(fullname === ""){
  //   throw new ApiError(400,"FullName is required!!")
  // }

  //2->
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!!");
  }

  //3->
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists!!");
  }

  //4->
  const avatarlocalPath = req.files?.avatar[0]?.path;
  // const coverImgLocalPath = req.files?.coverImage[0]?.path;

  let coverImgLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImgLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarlocalPath) {
    throw new ApiError(400, "Avatar is required!!");
  }

  //5->
  const avatar = await uploadOnCloudinary(avatarlocalPath);
  const coverImg = await uploadOnCloudinary(coverImgLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required!!");
  }

  //6->

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImg?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //7->

  const newUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //8->
  if (!newUser) {
    throw new ApiError(500, "Something went wrong while registering the token");
  }

  //9->
  return res
    .status(201)
    .json(new ApiResponse(200, newUser, "User created successfully!!"));
});

const loginUser = asyncHandler(async (req, res) => {
  //MY ATTEMPT =>
  //1. Show form for user to enter details
  //2. Check the details with that stored in database
  //3. Check for accessToken
  //4. If correct reroute to desired page

  //PROPER CORRECT STEPS =>
  //1. req body -> data
  //2. username or email
  //3. find user
  //4. password check
  //5. access and refresh token generate and send
  //6. send cookie

  //1 ->
  const { email, username, password } = req.body;

  //2 ->
  if (!username && !email) {
    throw new ApiError(400, "Email or Username is required!!");
  }

  //3 ->
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found!!");
  }

  //4 ->
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect!!");
  }

  //5->
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  //6 ->
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully!!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw new ApiError(401, "Unauthorised request");
  }

  try {
    const verifiedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(verifiedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (token !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used!!");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "AccessToken refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPassCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPassCorrect) {
    throw new ApiError(400, "Invalid Password!!");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current User fetched Successfully!");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Details Updated Successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarlocalPath = req.file?.path;

  if (!avatarlocalPath) {
    throw new ApiError(400, "File not found!!");
  }

  const avatar = await uploadOnCloudinary(avatarlocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar on cloudinary!!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(400, "User not found!!");
  }

  //TODO: delete old avatar after uploading new one by creating a function

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!!"));
});

const updateCoverImg = asyncHandler(async (req, res) => {
  const coverImglocalPath = req.file?.path;

  if (!coverImglocalPath) {
    throw new ApiError(400, "File not found!!");
  }

  const coverImg = await uploadOnCloudinary(coverImglocalPath);

  if (!coverImg.url) {
    throw new ApiError(400, "Error while uploading CoverImage on cloudinary!!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImg.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(400, "User not found!!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully!!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username.trim()) {
    throw new ApiError(400, "Username not found!!");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  console.log("CHANNEL DATA IS:", channel);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists!!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel retrieved successfully!!"));
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    avatar: 1,
                    username: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History Fetched Successfully!"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImg,
  getUserChannelProfile,
  getUserWatchHistory,
};
