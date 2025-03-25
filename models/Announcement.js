// models/Announcement.js
const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String },
        date: { type: Date },
        image: { type: String }, // Cloudinary URL stored here
        link: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Announcement", AnnouncementSchema);
