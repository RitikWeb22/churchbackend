const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinaryConfig");
const Announcement = require("../models/Announcement");

// CREATE (POST /api/announcements)
router.post("/", upload.single("image"), async (req, res) => {
    try {
        const { title, description, link, date } = req.body;
        let imageUrl = "";
        if (req.file) {
            imageUrl = req.file.path;
        }
        const announcement = await Announcement.create({
            title,
            description,
            date,
            link: link || "",
            image: imageUrl,
        });
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// READ ALL (GET /api/announcements)
router.get("/", async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// READ ONE (GET /api/announcements/:id)
router.get("/:id", async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        res.json(announcement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE (PUT /api/announcements/:id)
router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const { title, description, date, link } = req.body;
        const existing = await Announcement.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        if (req.file) {
            existing.image = req.file.path;
        }
        if (title) existing.title = title;
        if (description) existing.description = description;
        if (date) existing.date = date;
        existing.link = typeof link !== "undefined" ? link : existing.link;
        await existing.save();
        res.json(existing);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE (DELETE /api/announcements/:id)
router.delete("/:id", async (req, res) => {
    try {
        const deleted = await Announcement.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
