// HomeConfig.js
const mongoose = require("mongoose");

const homeConfigSchema = new mongoose.Schema(
    {
        mainText: { type: String, default: "Welcome to the Church Life" },
        sections: { type: Array, default: [] },
        lightBg: { type: String, default: "" },
        darkBg: { type: String, default: "" },
        bannerTitle: { type: String, default: "" },
        banner: { type: String, default: "" },
        eventCalendar: {
            pdf: {
                type: String,
                default: "",
                validate: {
                    validator: function (v) {
                        return v.includes('/raw/upload/');
                    },
                    message: props => `PDF URL must contain '/raw/upload/' path`
                }
            },
            banner: { type: String, default: "" },
        },
        latestUpdates: { type: [String], default: [] },
    },
    { timestamps: true }
);

module.exports = mongoose.model("HomeConfig", homeConfigSchema);
