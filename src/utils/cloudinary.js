import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'  // file-system manager from node.js apply operations on file to read, write, unlink, copy, etc.
import { ApiError } from './apiError.js';


cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFile = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const uploadResult = await cloudinary.uploader.upload(localFilePath,{
            resource_type : 'auto'
        });
        
        fs.unlinkSync(localFilePath); // File has been successfully uploaded on . Remove it locally
        return uploadResult;

    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

const deleteFile = async (oldAsset) => {
    
    if(!oldAsset) return ;
    const regex = /\/(image|video|raw)\/upload\/(?:v\d+\/)?([^\/]+)\./;
    const match = oldAsset.match(regex);
    
    const resource_type = match ? match[1] : null;
    const public_id = match ? match[2] : null;
    if (public_id && resource_type) {
        try {
            await cloudinary.uploader.destroy(public_id, {resource_type});
            return true
        } 
        catch (error) {
            throw new ApiError(501, `System failed to delete media from Vendor !!`);
        }
    }
    return  false;
}

export { uploadFile, deleteFile }

/* 
    (async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    // Upload an image
     const uploadResult = await cloudinary.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
       .catch((error) => {
           console.log(error);
       });
    
    console.log(uploadResult);
    
    // Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = cloudinary.url('shoes', {
        fetch_format: 'auto',
        quality: 'auto'
    });
    
    console.log(optimizeUrl);
    
    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = cloudinary.url('shoes', {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
    
    console.log(autoCropUrl);    
})();
*/