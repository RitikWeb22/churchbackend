// services/emailService.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., "smtp.gmail.com"
  port: Number(process.env.SMTP_PORT), // e.g., 587
  secure: process.env.SMTP_SECURE === "true", // false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  requireTLS: true, // Force TLS
  tls: {
    // This option helps bypass certain SSL issues (use with caution)
    rejectUnauthorized: false,
  },
});

const sendPurchaseEmail = async (purchaseData) => {
  const {
    customerName,
    email,
    bookTitle,
    quantity,
    price,
    invoiceNumber,
    category = "", // e.g., "library", "morning revival", "other"
  } = purchaseData;

  // Determine if this is a "library" borrow transaction
  const isLibrary = category.toLowerCase() === "library";

  // Subject and text changes
  const subjectText = isLibrary
    ? `Borrow Confirmation: ${bookTitle}`
    : `Purchase Confirmation: ${bookTitle}`;
  const actionText = isLibrary ? "borrowing" : "purchasing";

  // If not library, compute total price
  const totalPrice = isLibrary ? 0 : quantity * price;

  // Conditionally display price info only if NOT library
  const priceInfoHtml = isLibrary
    ? "" // No price lines for library
    : `
      <li style="margin-bottom: 5px;"><strong>Price:</strong> ₹${price}</li>
      <li style="margin-bottom: 5px;"><strong>Total:</strong> ₹${totalPrice}</li>
    `;

  // Build the HTML with a more modern, slightly more stylized approach
  const mailOptions = {
    from: `"Church Life Munirka" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subjectText,
    html: `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #f2f2f2; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <div style="background: #5D9CEC; padding: 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">Thank You!</h1>
        </div>
        <div style="padding: 20px; color: #333;">
          <p style="margin-bottom: 15px; font-size: 16px;">
            Dear <strong>${customerName}</strong>,
          </p>
          <p style="margin-bottom: 15px; font-size: 16px;">
            Thank you for <strong>${actionText} ${bookTitle}</strong>.
          </p>
          <h3 style="margin-bottom: 10px; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
            Order Details
          </h3>
          <ul style="list-style-type: none; padding-left: 0; margin-bottom: 20px; font-size: 15px;">
            <li style="margin-bottom: 5px;"><strong>Invoice:</strong> ${invoiceNumber || "N/A"}</li>
            <li style="margin-bottom: 5px;"><strong>Quantity:</strong> ${quantity}</li>
            ${priceInfoHtml}
          </ul>
          <p style="margin-bottom: 15px; font-size: 16px;">
            Your order will be processed shortly. If you have any questions, please contact our support team.
          </p>
          <p style="margin-bottom: 0; font-size: 16px;">
            Best Regards,<br/>
            <strong>Church life team</strong>
          </p>
        </div>
        <div style="background: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666;">
          © ${new Date().getFullYear()} Church life Munirka. All rights reserved.
        </div>
      </div>
    </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendPurchaseEmail };
