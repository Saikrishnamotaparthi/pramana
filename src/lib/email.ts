import nodemailer from "nodemailer";
import QRCode from "qrcode";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function sendPassEmail(to: string, userName: string, passName: string, qrData: string, orderId: string) {
    try {
        const qrImage = await QRCode.toDataURL(qrData);

        await transporter.sendMail({
            from: `"Gitam Event Team" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Your Event Pass: ${passName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563EB;">Event Pass Confirmed</h1>
                    <p>Hello <b>${userName}</b>,</p>
                    <p>Your booking for <b>${passName}</b> is successful.</p>
                    <p>Please present the QR code below at the entry gate.</p>
                    <div style="margin: 20px 0; text-align: center;">
                        <img src="${qrImage}" alt="Pass QR" style="width: 200px; height: 200px; border: 1px solid #ddd; padding: 10px;"/>
                    </div>

                    <p>See you at the event!</p>
                </div>
            `,
            attachments: [
                {
                    filename: 'pass-qr.png',
                    content: qrImage.split("base64,")[1],
                    encoding: 'base64'
                }
            ]
        });
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error("Error sending email:", error);
        // Don't throw, just log. We don't want to revert payment if email fails.
    }
}
