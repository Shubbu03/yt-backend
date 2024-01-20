import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { response } from "express";

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
      $set: {
        refreshToken: undefined,
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
