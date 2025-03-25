// homeController.js
const HomeConfig = require("../models/HomeConfig");

exports.getHomeConfig = async (req, res) => {
    try {
        let config = await HomeConfig.findOne();
        if (!config) {
            config = new HomeConfig();
            await config.save();
        }
        res.json(config);
    } catch (err) {
        console.error("Error in getHomeConfig:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.updateHomeConfig = async (req, res) => {
    try {
        console.log("PUT Request body:", req.body);
        console.log("PUT File received:", req.file);

        let config = (await HomeConfig.findOne()) || new HomeConfig();

        // Update text fields
        if (req.body.mainText) config.mainText = req.body.mainText;
        if (req.body.bannerTitle) config.bannerTitle = req.body.bannerTitle;

        // Process sections with safe JSON parsing
        if (req.body.sections) {
            try {
                config.sections =
                    typeof req.body.sections === "string"
                        ? JSON.parse(req.body.sections)
                        : req.body.sections;
            } catch (err) {
                console.error("Sections parsing error:", err);
                return res.status(400).json({
                    message: "Invalid sections format",
                    error: err.message,
                });
            }
        }

        // Process latestUpdates with safe JSON parsing
        if (req.body.latestUpdates) {
            try {
                config.latestUpdates =
                    typeof req.body.latestUpdates === "string"
                        ? JSON.parse(req.body.latestUpdates)
                        : req.body.latestUpdates;
            } catch (err) {
                // If JSON parsing fails, split by commas
                config.latestUpdates = req.body.latestUpdates
                    .split(",")
                    .map((item) => item.trim());
            }
        }

        // Process eventCalendar if a file is uploaded
        if (req.file) {
            let pdfUrl = req.file.path;
            if (!pdfUrl) {
                throw new Error("Cloudinary response missing file path");
            }
            if (!pdfUrl.includes("/raw/upload/")) {
                pdfUrl = pdfUrl.replace("/image/upload/", "/raw/upload/");
            }
            if (!pdfUrl.match(/\/v\d+\//)) {
                const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
                pdfUrl = pdfUrl.replace(
                    `https://res.cloudinary.com/${cloudName}/raw/upload/`,
                    `https://res.cloudinary.com/${cloudName}/raw/upload/v${Math.floor(
                        Date.now() / 1000
                    )}/`
                );
            }
            if (!config.eventCalendar) config.eventCalendar = {};
            config.eventCalendar.pdf = pdfUrl;
        }

        await config.save();
        res.json({
            message: "Home configuration updated successfully",
            config: {
                ...config.toObject(),
                eventCalendar: {
                    pdf: config.eventCalendar ? config.eventCalendar.pdf : "",
                },
            },
        });
    } catch (err) {
        console.error("Error in updateHomeConfig:", err.message);
        res.status(500).json({
            message: "Server error",
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }
};

exports.updateHomeText = async (req, res) => {
    try {
        const { mainText, sections, bannerTitle, latestUpdates } = req.body;
        let config = await HomeConfig.findOne();
        if (!config) {
            config = new HomeConfig();
        }
        if (mainText !== undefined) config.mainText = mainText;
        if (sections !== undefined) {
            if (typeof sections === "string") {
                try {
                    config.sections = JSON.parse(sections);
                } catch (e) {
                    config.sections = sections;
                }
            } else {
                config.sections = sections;
            }
        }
        if (bannerTitle !== undefined) config.bannerTitle = bannerTitle;
        if (latestUpdates !== undefined) {
            if (typeof latestUpdates === "string") {
                try {
                    config.latestUpdates = JSON.parse(latestUpdates);
                } catch (e) {
                    config.latestUpdates = latestUpdates.split(",").map((item) => item.trim());
                }
            } else {
                config.latestUpdates = latestUpdates;
            }
        }
        await config.save();
        res.json({ message: "Home text updated successfully", config });
    } catch (err) {
        console.error("Error in updateHomeText:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
