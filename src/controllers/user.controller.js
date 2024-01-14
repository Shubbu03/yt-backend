import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  //MY ATTEMPT=>
  //show ui to user
  // take details
  //send post request
  //store in db

  //PROPER CORRECT STEPS =>
  //take user data
  //validation - should not be empty
  //check if already exist
  //check for images ,avatar
  //upload them to cloudnary,avatar
  //create user object - create entry in db
  //remove password and refresh token field from response
  //check for user creation response
  //return response

  const { fullname, email, username, password } = req.body;

  console.log("email:",email)
});

export { registerUser };
