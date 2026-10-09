
const nodemailer = require('nodemailer');
require('dotenv').config();

const isConfigured = Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

const transporter = isConfigured ? nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
}) : null;

const sendResetEmail = async (email, token, universityName) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/reset-password/${token}`;
  
  if (!transporter) {
    console.log(`✉️ [MAIL MOCK] Password reset dispatch simulated for ${email}. Token: ${token}`);
    return { mock: true, resetUrl };
  }

  const mailOptions = {
    from: `"${universityName || 'University'} Portal" <${process.env.EMAIL_FROM || 'noreply@university.edu'}>`,
    to: email,
    subject: 'Identity Key Recovery - Password Reset Request',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; text-transform: uppercase; letter-spacing: -0.025em; font-weight: 800;">Identity Recovery</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">You requested a password reset for the <strong>${universityName || 'University'} Guest House Portal</strong>. Use the link below to establish a new access key. This link is valid for 1 hour.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; border-top: 1px solid #f1f5f9; padding-top: 20px;">If you did not request this, please ignore this email. Institutional security protocols suggest updating your credentials if you suspect unauthorized access attempts.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendBookingDecisionEmail = async ({ to, guestName, slNo, roomNo, arrivalDateTime, departureDateTime, status, totalAmount, receiptNo, remarks, universityName }) => {
  if (!to) return;
  const isApproved = status === 'Approved';

  if (!transporter) {
    console.log(`✉️ [MAIL MOCK] Booking status email (${status}) simulated for ${guestName} <${to}> [Ref: ${slNo}, Room: ${roomNo}]`);
    return { mock: true, status, slNo };
  }

  const checkInStr = arrivalDateTime ? new Date(arrivalDateTime).toLocaleString() : 'N/A';
  const checkOutStr = departureDateTime ? new Date(departureDateTime).toLocaleString() : 'N/A';

  const mailOptions = {
    from: `"${universityName || 'University Guest House'}" <${process.env.EMAIL_FROM || 'noreply@university.edu'}>`,
    to,
    subject: `Guest House Stay Decision: ${status.toUpperCase()} - Ref: ${slNo} (Room ${roomNo})`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid ${isApproved ? '#10b981' : '#ef4444'}; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: ${isApproved ? '#047857' : '#b91c1c'}; font-size: 20px; text-transform: uppercase; letter-spacing: -0.025em;">
            ${isApproved ? '✅ Stay Request Approved' : '❌ Stay Request Declined'}
          </h2>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Official Registrar Peshi & Administration Notice</p>
        </div>

        <p style="color: #334155; font-size: 15px; margin: 0 0 16px 0;">Dear <strong>${guestName}</strong>,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Your room reservation request (Serial No: <strong>${slNo}</strong>) has been <strong>${status}</strong> for the requested dates.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Allotted Unit:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">Room ${roomNo} (AC Room)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Check-In Date:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${checkInStr}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Check-Out Date:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${checkOutStr}</td>
            </tr>
            ${receiptNo ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Official Receipt No:</strong></td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: bold; text-align: right;">${receiptNo}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Tariff / Payable:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: bold; text-align: right;">₹${totalAmount || 0}</td>
            </tr>
            ${remarks ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Official Remarks:</strong></td>
              <td style="padding: 6px 0; color: #334155; text-align: right;">${remarks}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; margin: 0;">
          Please retain this notice or your digital pass for presentation upon arrival at the Guest House reception. For queries, contact the Registrar Peshi.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

const sendOtpEmail = async (email, otp, universityName) => {
  if (!transporter) {
    console.log(`✉️ [MAIL MOCK] Verification OTP (${otp}) simulated for ${email}`);
    return { mock: true, otp };
  }

  const mailOptions = {
    from: `"${universityName || 'Guest House Management Portal'}" <${process.env.EMAIL_FROM || 'noreply@jntugv.edu.in'}>`,
    to: email,
    subject: `Verification Code: ${otp} - Guest House Management Portal`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <h2 style="color: #1E5CA8; font-size: 20px; font-weight: 800; margin-bottom: 8px; text-transform: uppercase;">Identity Verification Code</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">Use the one-time verification code below to verify your email address for the <strong>${universityName || 'JNTU-GV Guest House Management Portal'}</strong>.</p>
        <div style="margin: 24px 0; text-align: center; background: #F8FAFC; padding: 18px; border-radius: 12px; border: 1px dashed #CBD5E1;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #1E5CA8;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 12px;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail, sendBookingDecisionEmail, sendOtpEmail };
