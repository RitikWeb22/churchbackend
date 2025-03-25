// homeRoutes.js
const express = require("express");
const router = express.Router();
const homeController = require("../controller/homeController");
const { eventCalendarPdfUpload } = require("../config/cloudinaryConfig");

// GET home configuration
router.get("/", homeController.getHomeConfig);

const handleFileUploadErrors = (err, req, res, next) => {
    if (err) {
        return res.status(err.statusCode || 500).json({
            message: "File upload failed",
            error: err.message,
            details: err.name === "MulterError" ? err.code : undefined
        });
    }
    next();
};


// PUT update home configuration (only eventCalendarPdf file upload)
router.put(
    "/",
    eventCalendarPdfUpload.single("eventCalendarPdf"),
    handleFileUploadErrors,
    homeController.updateHomeConfig
);

// PATCH update text-only fields (no files)
router.patch("/text", homeController.updateHomeText);

module.exports = router;
