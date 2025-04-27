declare module 'react-barcode-reader' {
    interface BarcodeReaderProps {
      onScan: (data: string) => void;
      onError: (error: any) => void;
    }
  
    const BarcodeReader: React.FC<BarcodeReaderProps>;
    export default BarcodeReader;
  }
  