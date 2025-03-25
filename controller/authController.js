const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const nodemailer = require("nodemailer");

// Helper function to normalize phone numbers (trim and remove spaces)
const normalizePhone = (phone) => phone.trim();
const getDummyEmail = (phone) =>
    `${normalizePhone(phone)}@example.com`.toLowerCase();

// Create a Nodemailer transporter using SMTP credentials
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true", // false for port 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
});

// ------------------------------------------
// 1) Send OTP
// ------------------------------------------
exports.sendOTP = async (req, res) => {
    try {
        const { phone, email } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required." });
        }
        const normalizedPhone = normalizePhone(phone);
        const user = await User.findOne({ phone: normalizedPhone });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // Set OTP expiry to 5 minutes
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        // Optionally send OTP via email
        const recipient = email || user.email;
        if (recipient && recipient !== getDummyEmail(normalizedPhone)) {
            const mailOptions = {
                from: process.env.SMTP_FROM,
                to: recipient,
                subject: "Your OTP for Verification",
                text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error sending OTP email:", error);
                } else {
                    console.log("OTP email sent:", info.response);
                }
            });
        } else {
            console.log("No valid recipient email found. Skipping email send.");
        }

        // For development, returning OTP in response (remove in production)
        res.status(200).json({ message: "OTP sent successfully.", otp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 2) Verify OTP
// ------------------------------------------
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res
                .status(400)
                .json({ message: "Phone number and OTP are required." });
        }
        const normalizedPhone = normalizePhone(phone);
        const user = await User.findOne({ phone: normalizedPhone });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if OTP matches and not expired
        if (!user.otp || user.otp !== otp || !user.otpExpires) {
            return res.status(400).json({ message: "Invalid or expired OTP." });
        }
        if (new Date(user.otpExpires).getTime() < Date.now()) {
            return res.status(400).json({ message: "OTP has expired." });
        }

        // Clear OTP fields after verification
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: "OTP verified successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 3) Reset Password (Simple Phone + Password)
// ------------------------------------------
exports.resetPassword = async (req, res) => {
    try {
        // Frontend sends { phone, password } or { phone, newPassword }
        const { phone, password, newPassword } = req.body;
        const finalNewPassword = password || newPassword; // handle either key

        if (!phone || !finalNewPassword) {
            return res
                .status(400)
                .json({ message: "Phone and new password are required." });
        }

        const user = await User.findOne({ phone: normalizePhone(phone) });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Update user password (will be hashed in pre-save hook)
        user.password = finalNewPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 4) Add Phone Number (Pre‑Registration)
// ------------------------------------------
exports.addPhoneNumber = async (req, res) => {
    try {
        let { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required." });
        }
        phone = normalizePhone(phone);

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: "Phone number already exists." });
        }

        // Create a new user record with dummy defaults
        const dummyFullName = "Pre-Registered User";
        const dummyEmail = getDummyEmail(phone);
        const dummyPassword = "defaultPassword123";

        const newUser = new User({
            fullName: dummyFullName,
            email: dummyEmail,
            password: dummyPassword,
            phone,
            role: "user",
        });
        await newUser.save();
        res
            .status(201)
            .json({ message: "Phone number added successfully.", user: newUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 5) Register User (Complete Registration)
// ------------------------------------------
exports.registerUser = async (req, res) => {
    try {
        let { fullName, email, password, phone } = req.body;
        phone = normalizePhone(phone);

        // Look up the user by phone (pre-added)
        const existingUser = await User.findOne({ phone });
        if (!existingUser) {
            return res
                .status(400)
                .json({ message: "Phone number not recognized. Please contact admin." });
        }

        const dummyEmail = getDummyEmail(phone);

        // If record has a different email than the dummy, user is already registered
        if (
            existingUser.email &&
            existingUser.email.trim().toLowerCase() !== dummyEmail
        ) {
            return res
                .status(400)
                .json({ message: "User already registered with this phone." });
        }

        // Update with final registration details
        existingUser.fullName = fullName;
        existingUser.email = email.toLowerCase();
        existingUser.password = password;
        await existingUser.save();

        res.status(200).json({ message: "User registered successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 6) Check Phone Number Availability
// ------------------------------------------
exports.checkPhoneNumber = async (req, res) => {
    try {
        let { phone } = req.body;
        phone = normalizePhone(phone);
        const user = await User.findOne({ phone });
        const dummyEmail = getDummyEmail(phone);

        if (!user) {
            return res
                .status(200)
                .json({ status: "not_found", message: "Phone number not recognized." });
        }

        if (user.email && user.email.trim().toLowerCase() !== dummyEmail) {
            return res
                .status(200)
                .json({ status: "already_registered", message: "Already registered." });
        }

        res
            .status(200)
            .json({ status: "pre_registered", message: "Available for registration." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 7) Login User (phone-based)
// ------------------------------------------
exports.loginUser = async (req, res) => {
    try {
        let { phoneNumber, password } = req.body;
        phoneNumber = normalizePhone(phoneNumber);

        const user = await User.findOne({ phone: phoneNumber });
        if (!user) {
            return res.status(401).json({ message: "Invalid phone or password." });
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(
            password + process.env.PEPPER,
            user.password
        );
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid phone or password." });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("Missing JWT_SECRET in environment variables.");
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Set token in an HTTP‑only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ message: "Logged in successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 8) Forgot Password (Token-based, optional)
// ------------------------------------------
exports.forgotPassword = async (req, res) => {
    try {
        // If not using token-based reset, you can remove this method
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required." });
        }
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        const hashedToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // For dev: return token in response
        res.json({
            message: "Password reset token generated.",
            resetToken,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 9) Verify Phone Number
// ------------------------------------------
exports.verifyPhoneNumber = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res
                .status(400)
                .json({ message: "Phone number is required." });
        }
        const user = await User.findOne({ phone });
        if (!user) {
            return res
                .status(404)
                .json({ message: "Phone number not found. Please contact admin." });
        }
        res.status(200).json({ message: "Phone number verified." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 10) Create a User (Admin-Only)
// ------------------------------------------
exports.createUser = async (req, res) => {
    try {
        const { fullName, email, phone, password, role } = req.body;

        const existingUser = await User.findOne({ phone });
        if (!existingUser) {
            return res
                .status(400)
                .json({ message: "Phone number not recognized. Please add first." });
        }

        if (existingUser.email && existingUser.email.trim() !== "") {
            return res
                .status(400)
                .json({ message: "User with this phone is already registered." });
        }

        existingUser.fullName = fullName;
        existingUser.email = email.toLowerCase();
        existingUser.password = password;
        existingUser.role = role || "user";
        await existingUser.save();

        res
            .status(200)
            .json({ message: "User registered successfully.", user: existingUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 11) Update a User's Basic Info
// ------------------------------------------
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (fullName) user.fullName = fullName;
        if (email) user.email = email.toLowerCase();
        if (phone) user.phone = phone;

        await user.save();
        res.json({ message: "User updated successfully.", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 12) Update a User's Role
// ------------------------------------------
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.role = role;
        await user.save();
        res.json({ message: "User role updated.", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 13) Delete a User
// ------------------------------------------
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found or already deleted." });
        }

        res.json({ message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ------------------------------------------
// 14) Import Users from Excel (Admin-Only)
// ------------------------------------------
exports.importUsersHandler = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No Excel file uploaded." });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        for (const row of rows) {
            const fullName = row["Full Name"] || "No Name";
            const emailLower = (row["Email"] || "").toLowerCase().trim();
            const phone = (row["Contact Number"] || "").trim();

            if (!emailLower) continue;

            let existingUser = await User.findOne({ email: emailLower });
            if (!existingUser) {
                const newUser = new User({
                    fullName,
                    email: emailLower,
                    phone,
                    password: "secret123", // default password
                    role: "user",
                });
                await newUser.save();
            } else {
                existingUser.fullName = fullName;
                existingUser.phone = phone;
                await existingUser.save();
            }
        }

        res.json({ message: "Users imported successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ------------------------------------------
// 15) Two-Factor Authentication (2FA) - Optional
// ------------------------------------------
exports.enableTwoFactorAuth = async (req, res) => {
    try {
        const user = req.user; // from protect middleware
        const secret = speakeasy.generateSecret({
            name: `YourAppName (${user.email})`,
        });
        user.twoFactorSecret = secret.base32;
        await user.save();

        res.json({
            message: "2FA secret generated.",
            secret: secret.base32,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyTwoFactorToken = async (req, res) => {
    try {
        const { token } = req.body;
        const user = req.user;
        if (!user.twoFactorSecret) {
            return res
                .status(400)
                .json({ message: "2FA is not enabled for this account." });
        }
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: "base32",
            token,
            window: 1,
        });
        if (!verified) {
            return res.status(400).json({ message: "Invalid 2FA token." });
        }
        res.json({ message: "2FA token verified successfully." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
