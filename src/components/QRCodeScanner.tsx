"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface Props {
    onScan: (decodedText: string) => void;
}

export default function QRCodeScanner({ onScan }: Props) {
    const [scanResult, setScanResult] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // "reader" is the ID of the div
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        scannerRef.current.render((decodedText) => {
            // Avoid duplicate scans if needed, or pass every scan
            setScanResult(decodedText);
            onScan(decodedText);
            // Optionally pause or clear?
            scannerRef.current?.clear();
        }, (error) => {
            // console.warn(error);
        });

        return () => {
            scannerRef.current?.clear().catch(err => console.error(err));
        };
    }, [onScan]);

    return (
        <div className="w-full max-w-sm mx-auto">
            <div id="reader" style={{ width: '100%' }}></div>
            {scanResult && <p className="text-center mt-2 text-green-600 font-bold">Scanned: {scanResult}</p>}
        </div>
    );
}
