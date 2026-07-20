"use client";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useState } from "react";

interface Props {
  onScan: (data: string) => void;
}

export default function QRScanner({ onScan }: Props) {
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    // اضافه کردن آرگومان سوم (verbose: false) برای رفع خطای 2554
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false,
    );

    const onSuccess = (decodedText: string) => {
      scanner.clear();
      setScanResult(decodedText);
      onScan(decodedText);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    const onFailure = (err: any) => {
      /* خطاها را نادیده بگیر */
    };

    scanner.render(onSuccess, onFailure);

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden">
      {scanResult ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-green-50 text-green-700 p-4 text-center">
          <span className="text-2xl mb-2">✅</span>
          <p className="font-bold">اسکن شد!</p>
          <p className="text-sm break-all">شناسه: {scanResult}</p>
        </div>
      ) : (
        <div id="qr-reader" className="w-full h-full"></div>
      )}
    </div>
  );
}
