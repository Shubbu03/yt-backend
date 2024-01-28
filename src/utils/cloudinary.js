import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }

    //upload on cloudinary

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file is uploaded successfully

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temp file as the upload operation got failed

    return null;
  }
};

const deleteFile = async (localID) => {
  try {
    if (!localID) {
      throw new ApiError(400, "File path not found!!");
    }
    const deletresponse = await cloudinary.uploader.destroy(publicid, {
      resource_type: "video",
    });
    return deletresponse;
  } catch (error) {
    return error.message;
  }
};

export { uploadOnCloudinary, deleteFile };
