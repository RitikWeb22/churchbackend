// controller/paymentController.js
const Payment = require("../models/Payment");
const { Book } = require("../models/bookModels");
const { sendPurchaseEmail } = require("../services/emailService");

exports.createPayment = async (req, res) => {
    try {
        console.log("[createPayment] Received req.body:", req.body);

        // Copy all fields from req.body
        const paymentData = { ...req.body };

        // Attach screenshot URL if file was uploaded (via Cloudinary)
        if (req.file) {
            paymentData.screenshot = req.file.path;
        }

        // Normalize paymentMethod to lowercase for consistency
        if (paymentData.paymentMethod) {
            paymentData.paymentMethod = paymentData.paymentMethod.toLowerCase();
        }

        // Parse numeric fields
        paymentData.price = parseFloat(paymentData.price) || 0;
        paymentData.quantity = parseInt(paymentData.quantity) || 1;

        // Validate required fields (added "email")
        const requiredFields = [
            "bookName",
            "userName",
            "contactNumber",
            "language",
            "paymentMethod",
            "email",
        ];
        for (const field of requiredFields) {
            if (!paymentData[field]) {
                return res.status(400).json({ message: `Missing required field: ${field}` });
            }
        }

        // For cash or online payments, generate an invoice number
        if (
            paymentData.paymentMethod === "cash" ||
            paymentData.paymentMethod === "online" ||
            paymentData.paymentMethod === "borrow"

        ) {
            paymentData.invoiceNumber = "INV-" + Date.now();
        }

        // Create the payment record
        const payment = await Payment.create(paymentData);
        console.log("[createPayment] Payment created:", payment);

        // Update book stock if bookId is provided
        let bookCategory = "";
        if (paymentData.bookId) {
            const book = await Book.findById(paymentData.bookId);
            if (!book) {
                return res.status(404).json({ message: "Book not found" });
            }

            // Capture the book's category (e.g., "library" or "morning revival")
            bookCategory = (book.category || "").toLowerCase();

            if (paymentData.paymentMethod === "borrow") {
                book.stock = 0;
            } else {
                const purchasedQuantity = paymentData.quantity;
                if (book.stock < purchasedQuantity) {
                    return res
                        .status(400)
                        .json({ message: "Insufficient stock" });
                }
                book.stock -= purchasedQuantity;
            }
            await book.save();
        }

        // Send confirmation email if email is provided
        if (paymentData.email) {
            // Pass along the category so the email service knows if it's library vs. something else
            const emailData = {
                customerName: paymentData.userName,
                email: paymentData.email,
                bookTitle: paymentData.bookName,
                quantity: paymentData.quantity,
                price: paymentData.price,
                invoiceNumber: paymentData.invoiceNumber || "",
                category: bookCategory, // e.g. "library", "morning revival", etc.
            };

            try {
                await sendPurchaseEmail(emailData);
                console.log(
                    "[createPayment] Confirmation email sent to",
                    paymentData.email
                );
            } catch (emailError) {
                console.error("[createPayment] Email sending failed:", emailError);
            }
        }

        return res.status(201).json(payment);
    } catch (error) {
        console.error("[createPayment] Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const { paymentMethod } = req.query;
        let filter = {};

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod.toLowerCase();
        }

        const payments = await Payment.find(filter).sort({ purchaseDate: -1 });
        return res.status(200).json(payments);
    } catch (error) {
        console.error("[getPayments] Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPayment = await Payment.findByIdAndDelete(id);

        if (!deletedPayment) {
            return res.status(404).json({ message: "Payment not found" });
        }
        return res.status(200).json({ message: "Payment deleted successfully" });
    } catch (error) {
        console.error("[deletePayment] Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
