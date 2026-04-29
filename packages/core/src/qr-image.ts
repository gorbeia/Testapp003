import QRCode from "qrcode";

export async function generateQrImage(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6
  });
}
