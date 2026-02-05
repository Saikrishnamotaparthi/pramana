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
        console.log(`Email sent successfully to user.`);
    } catch (error: any) {
        console.error("Error sending email:", error.message || "Unknown error");
        // Don't throw, just log. We don't want to revert payment if email fails.
    }
}

export async function sendCulturalApprovalEmail(to: string, userName: string, competitionName: string, category: string) {
    try {
        await transporter.sendMail({
            from: `"Gitam Event Team" <${process.env.EMAIL_USER}>`,
            to,
            subject: `Registration Approved: ${competitionName} - ${category}`,
            html: `
                <div style="font-family: 'Playfair Display', serif; max-width: 600px; margin: 0 auto; background-color: #000; color: #f5f5f5; padding: 40px;">
                    <h1 style="color: #FFD700; text-align: center; margin-bottom: 30px; font-size: 28px;">Registration Approved</h1>
                    
                    <div style="background-color: #111; padding: 30px; border: 1px solid #333; border-radius: 8px;">
                        <p style="font-size: 16px; line-height: 1.6;">Hello <b style="color: #FFD700;">${userName}</b>,</p>
                        
                        <p style="font-size: 16px; line-height: 1.6;">We are pleased to inform you that your registration for <b>${competitionName}</b> in the <b>${category}</b> category has been verified and approved.</p>
                        
                        <div style="margin: 30px 0; padding: 20px; background-color: #000; border-left: 4px solid #FFD700;">
                            <p style="margin: 0; color: #aaa; font-size: 14px;">Event</p>
                            <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold;">${competitionName}</p>
                            
                            <p style="margin: 0; color: #aaa; font-size: 14px;">Category</p>
                            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: bold;">${category}</p>
                        </div>

                        <p style="font-size: 16px; line-height: 1.6;">Get ready to showcase your talent! We look forward to seeing you at the event.</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
                        <p>© 2024 Pramana. All rights reserved.</p>
                    </div>
                </div>
            `
        });
        console.log(`Approval email sent to ${to}`);
    } catch (error: any) {
        console.error("Error sending approval email:", error.message || "Unknown error");
    }
}
