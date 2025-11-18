import { X } from 'lucide-react';

interface QRCodeModalProps {
  qrCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({ qrCode, isOpen, onClose }: QRCodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Conectar WhatsApp</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          {qrCode ? (
            <>
              <div className="bg-white p-4 rounded-lg shadow-md mb-4">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-gray-700 font-medium">Escaneie o código QR</p>
                <ol className="text-sm text-gray-600 text-left space-y-1">
                  <li>1. Abra o WhatsApp no seu celular</li>
                  <li>2. Toque em Menu ou Configurações</li>
                  <li>3. Toque em Aparelhos conectados</li>
                  <li>4. Toque em Conectar um aparelho</li>
                  <li>5. Aponte seu celular para esta tela</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-gray-600">Gerando código QR...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
