"use client";

import dynamic from "next/dynamic";

const FaceRecognition = dynamic(() => import("./FaceRecognition"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
        <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-lg p-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-75"></div>
                <div className="relative h-16 w-16 bg-white rounded-full flex items-center justify-center">
                  <div className="text-4xl">🏟️</div>
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🏟️ Controle de Acesso
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Sistema de Reconhecimento Facial - V2
            </p>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
            <p className="mt-6 text-gray-600 text-lg">Carregando sistema...</p>
          </div>
        </div>
      </div>
    </div>
  ),
});

export default function ClientFaceRecognition() {
  return <FaceRecognition />;
}
