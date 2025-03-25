// config/cloudinaryConfig.js
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary with your credentials from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer
// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "banners", // Cloudinary folder name for uploads
        allowed_formats: ["jpg", "jpeg", "png"],
    },
});

// Create the Multer upload instance for banner uploads
const bannerUpload = multer({ storage: storage });
// 1) Storage for contact banners
const contactBannerStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "contactBanners",
        resource_type: "auto", // Allows images/PDF/other
        allowed_formats: ["jpg", "jpeg", "png"], // Only accept these formats
    },
});
const contactBannerUpload = multer({ storage: contactBannerStorage });


// 3) Storage for calendar images
const calendarStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "calendars",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png"],
    },
});
const calendarUpload = multer({ storage: calendarStorage });

// 4) Default storage for generic uploads (e.g., announcements, books, etc.)
const defaultStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "default",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png"],
    },
});
const upload = multer({ storage: defaultStorage });

// 5) Storage for Event Calendar PDF files
// 5) Storage for Event Calendar PDF files
const eventCalendarPdfStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "eventCalendarPdfs",
        resource_type: "raw",
        allowed_formats: ["pdf"],
        type: "upload", // Ensure the file is uploaded for public access
        transformation: { quality: 100 },
        filename: function (req, file) {
            return `${Date.now()}-${file.originalname}`;
        }
    },
});
const eventCalendarPdfUpload = multer({
    storage: eventCalendarPdfStorage, limits: { fileSize: 5 * 1024 * 1024 }
});


// 6) Storage for Event Calendar Banner images
const eventCalendarBannerStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "eventCalendarBanners",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png"],
    },
});
const eventCalendarBannerUpload = multer({ storage: eventCalendarBannerStorage });

// Export all middlewares
module.exports = {
    bannerUpload,
    calendarUpload,
    upload,
    contactBannerUpload,
    eventCalendarPdfUpload,
    eventCalendarBannerUpload,
};
