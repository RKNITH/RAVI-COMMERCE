import cloudinary from "cloudinary";
import 'dotenv/config'

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file function using async/await
export const upload_file = async (file, folder = '') => {
    if (!file) {
        throw new Error("No file provided");
    }

    console.log("Uploading file:", file);

    try {
        const result = await cloudinary.v2.uploader.upload(file, {
            resource_type: "auto",
            folder: folder || '',
        });

        return {
            public_id: result.public_id,
            url: result.url,
        };
    } catch (error) {
        console.error("Upload Error:", error);
        throw new Error("Failed to upload file");
    }
};



// Delete file function using async/await
export const delete_file = async (file) => {
    if (!file) {
        throw new Error("No file provided to delete");
    }

    try {
        const res = await cloudinary.v2.uploader.destroy(file);
        if (res?.result === "ok") {
            return true;
        }
        throw new Error("Failed to delete file");
    } catch (error) {
        console.error("Delete Error:", error);
        throw new Error("Failed to delete file");
    }
};
