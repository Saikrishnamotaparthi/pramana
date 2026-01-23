/* eslint-disable @typescript-eslint/no-explicit-any */
import html2canvas from 'html2canvas';

// Types needed for the function
interface WrapperProps {
    pass: {
        passName: string;
        bookingId: string;
        entryLogs?: string[];
    };
    user: {
        displayName?: string | null;
    };
    qrCodeUrl: string;
    bannerUrl?: string | null;
}

const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Failed to convert image to base64", error);
        return "";
    }
};

export const downloadTicket = async ({ pass, user, qrCodeUrl }: WrapperProps) => {
    console.log("Generating Ticket v7.0 - Diamond Design");

    // 0. Prepare Assets
    const logo1Url = "/gitam-logo.png";
    const logo2Url = "/pramana-logo.png";
    const logo3Url = "/student-life-logo.png";

    const [logo1Base64, logo2Base64, logo3Base64] = await Promise.all([
        urlToBase64(logo1Url),
        urlToBase64(logo2Url),
        urlToBase64(logo3Url)
    ]);

    // 1. Create a container for the ticket
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '-9999';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);

    // 2. Define the HTML content 
    const ticketHtml = `
        <div style="
            width: 450px;
            height: 750px; 
            background-color: #000000;
            background-image: linear-gradient(180deg, #0a0a0a 0%, #000000 100%);
            color: #d4af37;
            font-family: 'Times New Roman', serif;
            border: 2px solid #d4af37;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            overflow: hidden;
        ">
            <!-- Decorative borders -->
            <div style="position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px; border: 1px solid rgba(212,175,55,0.4); pointer-events: none;"></div>
            
            <!-- Corner Accents -->
            <div style="position: absolute; top: 12px; left: 12px; width: 24px; height: 24px; border-top: 3px solid #d4af37; border-left: 3px solid #d4af37;"></div>
            <div style="position: absolute; top: 12px; right: 12px; width: 24px; height: 24px; border-top: 3px solid #d4af37; border-right: 3px solid #d4af37;"></div>
            <div style="position: absolute; bottom: 12px; left: 12px; width: 24px; height: 24px; border-bottom: 3px solid #d4af37; border-left: 3px solid #d4af37;"></div>
            <div style="position: absolute; bottom: 12px; right: 12px; width: 24px; height: 24px; border-bottom: 3px solid #d4af37; border-right: 3px solid #d4af37;"></div>

            <!-- Header Logos -->
            <div style="
                width: 100%;
                padding: 48px 40px 24px 40px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                box-sizing: border-box;
            ">
                 <!-- GITAM Logo (Left) -->
                 ${logo1Base64 ? `<img src="${logo1Base64}" style="height: 40px; object-fit: contain;" />` : `<div style="width:40px"></div>`}
                 
                 <!-- Pramana Logo (Center) -->
                 ${logo2Base64 ? `<img src="${logo2Base64}" style="height: 64px; object-fit: contain; filter: drop-shadow(0 0 12px rgba(212,175,55,0.5));" />` : `<div style="width:64px"></div>`}
                 
                 <!-- Student Life Logo (Right) -->
                 ${logo3Base64 ? `<img src="${logo3Base64}" style="height: 40px; object-fit: contain;" />` : `<div style="width:40px"></div>`}
            </div>

            <!-- Title Section -->
            <div style="text-align: center; margin-bottom: 30px; width: 100%; z-index: 10;">
                <h1 style="
                    font-size: 42px;
                    margin: 0;
                    color: #d4af37;
                    text-transform: uppercase;
                    letter-spacing: 12px;
                    font-weight: 400;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.8);
                    font-family: serif; 
                    line-height: 1.1;
                ">PRAMANA</h1>
                <h2 style="
                    font-size: 14px;
                    margin: 12px 0 0 0;
                    color: rgba(255,255,255,0.6);
                    font-family: sans-serif;
                    letter-spacing: 6px;
                    text-transform: uppercase;
                ">2026 Edition</h2>
            </div>

            <!-- Ornate Separator (Design Line) -->
            <div style="
                display: flex; 
                align-items: center; 
                justify-content: center; 
                gap: 15px; 
                margin-bottom: 50px; 
                width: 100%;
                opacity: 0.8;
            ">
                <div style="width: 60px; height: 1px; background: linear-gradient(90deg, transparent, #d4af37);"></div>
                <div style="width: 8px; height: 8px; transform: rotate(45deg); border: 1px solid #d4af37; background: #000;"></div>
                <div style="width: 60px; height: 1px; background: linear-gradient(90deg, #d4af37, transparent);"></div>
            </div>

            <!-- Pass Details -->
            <div style="
                width: 100%;
                text-align: center;
                margin-bottom: 40px;
                position: relative;
                z-index: 10;
            ">
                <p style="
                    margin: 0 0 16px 0;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    color: #d4af37;
                ">Official Entry Pass Issued To</p>
                
                <h2 style="
                    font-size: 28px;
                    color: white;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-weight: 700;
                    text-shadow: 0 0 20px rgba(212,175,55,0.3);
                    padding: 0 32px;
                    line-height: 1.3;
                    font-family: serif;
                    word-wrap: break-word; /* Ensure clear wrapping */
                ">
                    ${user.displayName || "Guest"}
                </h2>
                <!-- BOOKING ID EXPLICITLY REMOVED -->
            </div>

            <!-- QR Code -->
            <div style="
                background: white;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: auto;
                box-shadow: 0 0 40px rgba(212,175,55,0.1);
            ">
                ${qrCodeUrl ?
            `<img src="${qrCodeUrl}" style="width: 170px; height: 170px; display: block;" />`
            : '<div style="width: 170px; height: 170px; background: #eee;"></div>'
        }
            </div>

            <!-- Footer -->
            <div style="
                width: 100%;
                padding-bottom: 40px;
                text-align: center;
            ">
                <div style="
                    display: inline-block;
                    padding-top: 15px;
                    border-top: 1px solid rgba(212,175,55,0.2);
                    min-width: 240px;
                ">
                    <p style="
                        color: rgba(255,255,255,0.4);
                        font-size: 8px;
                        text-transform: uppercase;
                        letter-spacing: 4px;
                        margin: 0 0 6px 0;
                    ">Authorized By</p>
                    <div style="
                        color: #d4af37;
                        font-size: 14px;
                        text-transform: uppercase;
                        letter-spacing: 3px;
                        font-weight: bold;
                        font-family: serif; 
                        text-shadow: 0 0 10px rgba(212,175,55,0.2);
                    ">
                        TEAM PRAMANA 26
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = ticketHtml;

    try {
        const images = Array.from(container.querySelectorAll('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));

        await new Promise(resolve => setTimeout(resolve, 300));

        const canvas = await html2canvas(container.children[0] as HTMLElement, {
            useCORS: true,
            scale: 2,
            backgroundColor: '#000000',
            logging: false,
            allowTaint: true,
            width: 450,
            windowWidth: 1200,
        });

        const link = document.createElement('a');
        link.download = `Pramana26-Pass-${pass.passName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

    } catch (err) {
        console.error("Failed to generate ticket", err);
        alert("Failed to generate ticket.");
    } finally {
        document.body.removeChild(container);
    }
};
