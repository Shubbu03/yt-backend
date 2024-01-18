import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { response } from "express";

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

export { registerUser };
