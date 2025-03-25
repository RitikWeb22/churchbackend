const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { protect, adminAuth } = require("../middleware/authMiddleware");
const {
    // OTP-based reset
    sendOTP,
    verifyOTP,
    resetPassword,
    // Registration & Login
    checkPhoneNumber,
    registerUser,
    loginUser,
    addPhoneNumber,
    // Token-based reset (optional)
    forgotPassword,
    // Admin + 2FA
    createUser,
    updateUser,
    updateUserRole,
    deleteUser,
    importUsersHandler,
    enableTwoFactorAuth,
    verifyTwoFactorToken,
    // Phone verification
    verifyPhoneNumber,
} = require("../controller/authController");

const User = require("../models/User");

// Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});

// Multer setup for Excel uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// ----- Public Routes -----

// For testing: list all users
router.get("/", async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1) Registration & Login
router.post("/check-phone", checkPhoneNumber);
router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/add-phone", addPhoneNumber);

// 2) OTP-based Password Reset
router.post("/send-otp", sendOTP); // Make sure sendOTP in authController.js uses Twilio
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// 3) Token-based Password Reset (Optional)
router.post("/forgot", forgotPassword);

// 4) Verify Phone
router.post("/verify-phone", verifyPhoneNumber);

// 5) Two-Factor Authentication
router.post("/enable-2fa", protect, enableTwoFactorAuth);
router.post("/verify-2fa", protect, verifyTwoFactorToken);

// 6) Admin-Only Routes
router.post("/create-user", protect, adminAuth, createUser);
router.put("/users/:id", protect, adminAuth, updateUser);
router.put("/users/:id/role", protect, adminAuth, updateUserRole);
router.delete("/users/:id", protect, adminAuth, deleteUser);
router.post(
    "/import-users",
    protect,
    adminAuth,
    upload.single("excel"),
    importUsersHandler
);

module.exports = router;
