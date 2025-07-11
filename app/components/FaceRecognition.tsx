"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface Descriptors {
  name: string;
  descriptor: Float32Array;
}

interface PopupState {
  open: boolean;
  msg: string;
  type: "success" | "error" | "warning";
}

const registeredImages = [
  { name: "Rodrigo Moreira Santos", src: "/registered/rodrigo.jpg" },
  { name: "Rodrigo Moreira Santos", src: "/registered/rodrigo1.jpg" },
  { name: "Rodrigo Moreira Santos", src: "/registered/rodrigo3.jpg" },
];

const FaceRecognition = () => {
  console.log("🚀 FaceRecognition component mounted");
  console.log("📋 Imagens configuradas:", registeredImages);
  console.log("📊 Número de imagens:", registeredImages.length);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [descriptors, setDescriptors] = useState<Descriptors[]>([]);
  const [popup, setPopup] = useState<PopupState>({
    open: false,
    msg: "",
    type: "warning",
  });
  // Remover variáveis de debug não utilizadas
  // const [debugInfo, setDebugInfo] = useState<string>("");
  // const [lastRecognitionAttempt, setLastRecognitionAttempt] = useState<string>("");
  // const [debugSteps, setDebugSteps] = useState<string[]>([]);
  // const [isProcessing, setIsProcessing] = useState(false);
  // Remover variáveis de debug não utilizadas
  // const [debugInfo, setDebugInfo] = useState<string>("");
  // const [lastRecognitionAttempt, setLastRecognitionAttempt] = useState<string>("");
  // const [debugSteps, setDebugSteps] = useState<string[]>([]);
  // const [isProcessing, setIsProcessing] = useState(false);

  // Monitora mudanças no popup para debug
  useEffect(() => {
    console.log("Estado do popup mudou:", popup);
  }, [popup]);

  // Monitora mudanças nos descritores para debug
  useEffect(() => {
    console.log("🔄 Descriptors state changed:", descriptors.length);
    console.log("📊 Descriptors details:", descriptors);

    if (descriptors.length > 0) {
      console.log("✅ Descritores carregados com sucesso!");
      console.log("📋 Detalhes dos descritores:");
      descriptors.forEach((desc, index) => {
        console.log(
          `   ${index + 1}. ${desc.name} - ${desc.descriptor.length} valores`
        );
      });
    }
  }, [descriptors]);

  // Log quando modelsLoaded muda
  useEffect(() => {
    console.log("🔄 Models loaded state changed:", modelsLoaded);
  }, [modelsLoaded]);

  // Carrega os modelos do face-api.js
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("🔧 Iniciando carregamento dos modelos...");
        console.log("📁 Verificando se os modelos existem...");

        // Testa se os arquivos dos modelos existem
        const modelFiles = [
          "/models/tiny_face_detector_model-weights_manifest.json",
          "/models/face_landmark_68_model-weights_manifest.json",
          "/models/face_recognition_model-weights_manifest.json",
        ];

        for (const file of modelFiles) {
          try {
            const response = await fetch(file);
            console.log(
              `📡 ${file}: ${response.status} ${response.statusText}`
            );
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
          } catch (fileError) {
            console.error(`❌ Erro ao verificar ${file}:`, fileError);
            throw fileError;
          }
        }

        console.log("✅ Todos os arquivos de modelo existem, carregando...");

        console.log("🔄 Carregando tinyFaceDetector...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        console.log("✅ tinyFaceDetector carregado");

        console.log("🔄 Carregando faceLandmark68Net...");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        console.log("✅ faceLandmark68Net carregado");

        console.log("🔄 Carregando faceRecognitionNet...");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        console.log("✅ faceRecognitionNet carregado");

        setModelsLoaded(true);
        console.log("🎉 TODOS OS MODELOS CARREGADOS COM SUCESSO!");
      } catch (error) {
        console.error("❌ Erro ao carregar modelos:", error);
        setPopup({
          open: true,
          msg: `Erro ao carregar modelos de IA: ${error}. Verifique se os arquivos estão na pasta /public/models`,
          type: "error",
        });
      }
    };
    loadModels();
  }, []);

  // Função para iniciar a câmera
  const startCamera = async () => {
    try {
      console.log("Solicitando acesso à câmera...");
      // setCameraError(""); // Removido

      // Para qualquer stream existente
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Configurações otimizadas para webcams do Mac - Máxima qualidade
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 }, // Resolução Full HD ou maior
          height: { ideal: 1080, min: 720 },
          facingMode: "user",
          // Configurações específicas para Mac
          frameRate: { ideal: 30, min: 15 },
          // Força o uso da câmera frontal
          deviceId: undefined, // Será selecionada automaticamente
          // Configurações específicas para webcams do Mac
          aspectRatio: { ideal: 16 / 9 },
          // Qualidade máxima para reconhecimento facial
          resizeMode: "crop-and-scale",
        },
        audio: false,
      };

      console.log("🔧 Configurações da câmera para Mac:", constraints);
      console.log("💡 Diferenças entre webcams:");
      console.log("   - Webcam pessoal: Geralmente melhor qualidade");
      console.log("   - Webcam do Mac: Pode ter resolução menor");
      console.log("   - Configurações otimizadas para Mac aplicadas");

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      console.log(
        "Stream obtido:",
        mediaStream.getVideoTracks().length,
        "tracks de vídeo"
      );

      // Log das configurações reais da câmera
      const videoTrack = mediaStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("📹 Configurações reais da câmera:", settings);
      console.log("📐 Resolução:", settings.width, "x", settings.height);
      console.log("🎬 Frame rate:", settings.frameRate);
      console.log("📷 Device ID:", settings.deviceId);
      console.log(
        "🔍 Tipo de câmera:",
        settings.deviceId?.includes("Mac") ? "Webcam do Mac" : "Webcam externa"
      );

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        // setCameraActive(true); // Removido
        console.log("Câmera ativada com sucesso!");

        // Aguarda o vídeo estar pronto
        videoRef.current.onloadedmetadata = () => {
          console.log("Vídeo carregado e pronto");
          console.log(
            "📹 Dimensões do vídeo:",
            videoRef.current?.videoWidth,
            "x",
            videoRef.current?.videoHeight
          );
          videoRef.current?.play().catch(console.error);

          // O reconhecimento será iniciado automaticamente quando os descritores estiverem prontos
          console.log("Vídeo pronto, aguardando descritores...");
        };
      }
    } catch (error) {
      console.error("Erro ao acessar webcam:", error);
      // setCameraError( // Removido
      //   error instanceof Error ? error.message : "Erro desconhecido"
      // );
      // setCameraActive(false); // Removido
    }
  };

  // Inicia a câmera quando os modelos estiverem carregados
  useEffect(() => {
    if (modelsLoaded) {
      // Removido cameraActive
      console.log("Modelos carregados, iniciando câmera...");
      startCamera();
    }
  }, [modelsLoaded]); // Removido cameraActive

  // Inicia o reconhecimento quando os descritores estiverem carregados
  useEffect(() => {
    if (
      modelsLoaded &&
      descriptors.length > 0 &&
      streamRef.current // Removido cameraActive
      // Removido isProcessing
    ) {
      console.log("🎯 Descritores carregados, iniciando reconhecimento...");
      console.log("📊 Descritores disponíveis:", descriptors.length);
      startFaceRecognition();
    }
  }, [modelsLoaded, descriptors.length, streamRef.current]);

  // Cleanup function
  useEffect(() => {
    return () => {
      console.log("Cleanup: parando stream e intervalos");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log("Parando track:", track.kind);
          track.stop();
        });
        streamRef.current = null;
      }
      // if (detectionIntervalRef.current) { // Removido
      //   clearInterval(detectionIntervalRef.current); // Removido
      //   detectionIntervalRef.current = null; // Removido
      // } // Removido
    };
  }, []);

  // Carrega descritores das imagens registradas
  useEffect(() => {
    console.log("🔄 useEffect loadImages triggered");
    console.log("🤖 Models loaded:", modelsLoaded);

    if (!modelsLoaded) {
      console.log("❌ Models not loaded yet, skipping image loading");
      return;
    }

    const loadImages = async () => {
      try {
        const descs: Descriptors[] = [];
        console.log("🔄 Carregando imagens registradas...");
        console.log("📋 Imagens configuradas:", registeredImages);
        console.log("📊 Número de imagens:", registeredImages.length);

        for (let i = 0; i < registeredImages.length; i++) {
          const reg = registeredImages[i];
          try {
            console.log(
              `\n🖼️ [${i + 1}/${registeredImages.length}] Tentando carregar: ${
                reg.src
              }`
            );

            // Testa se a imagem existe primeiro
            console.log(`🔍 Verificando se ${reg.src} existe...`);
            const response = await fetch(reg.src);
            console.log(
              `📡 Response status: ${response.status} ${response.statusText}`
            );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }
            console.log(
              `✅ [${i + 1}/${
                registeredImages.length
              }] Imagem existe no servidor: ${reg.src}`
            );

            console.log(`🖼️ Carregando imagem ${reg.src}...`);
            const img = await faceapi.fetchImage(reg.src);
            console.log(
              `✅ [${i + 1}/${
                registeredImages.length
              }] Imagem carregada do servidor: ${reg.src}`
            );
            console.log(
              `📐 [${i + 1}/${registeredImages.length}] Dimensões da imagem: ${
                img.width
              }x${img.height}`
            );

            // Tenta detectar face com diferentes configurações
            let detection = null;

            // Primeira tentativa: configuração padrão
            console.log(`🔍 Tentando detectar face em ${reg.src}...`);
            try {
              detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();
              console.log(
                `✅ [${i + 1}/${
                  registeredImages.length
                }] Detecção bem-sucedida com configuração padrão`
              );
            } catch (detectionError) {
              console.warn(
                `⚠️ [${i + 1}/${
                  registeredImages.length
                }] Falha na detecção padrão:`,
                detectionError
              );
              console.warn(
                `⚠️ [${i + 1}/${
                  registeredImages.length
                }] Tentando configuração alternativa...`
              );

              // Segunda tentativa: configuração mais permissiva
              try {
                detection = await faceapi
                  .detectSingleFace(
                    img,
                    new faceapi.TinyFaceDetectorOptions({
                      inputSize: 512,
                      scoreThreshold: 0.3,
                    })
                  )
                  .withFaceLandmarks()
                  .withFaceDescriptor();
                console.log(
                  `✅ [${i + 1}/${
                    registeredImages.length
                  }] Detecção bem-sucedida com configuração alternativa`
                );
              } catch (altError) {
                console.error(
                  `❌ [${i + 1}/${
                    registeredImages.length
                  }] Falha em ambas as tentativas de detecção:`,
                  altError
                );
                throw altError;
              }
            }

            // Terceira tentativa: configuração específica para Mac (muito permissiva)
            if (!detection) {
              console.warn(
                `⚠️ [${i + 1}/${
                  registeredImages.length
                }] Tentando configuração específica para Mac...`
              );
              try {
                detection = await faceapi
                  .detectSingleFace(
                    img,
                    new faceapi.TinyFaceDetectorOptions({
                      inputSize: 1024,
                      scoreThreshold: 0.01, // Muito permissivo para Mac
                    })
                  )
                  .withFaceLandmarks()
                  .withFaceDescriptor();
                console.log(
                  `✅ [${i + 1}/${
                    registeredImages.length
                  }] Detecção bem-sucedida com configuração específica para Mac`
                );
              } catch (macError) {
                console.error(
                  `❌ [${i + 1}/${
                    registeredImages.length
                  }] Falha em todas as tentativas de detecção:`,
                  macError
                );
                throw macError;
              }
            }

            if (detection) {
              descs.push({
                name: reg.name,
                descriptor: detection.descriptor,
              });
              console.log(
                `✅ [${i + 1}/${
                  registeredImages.length
                }] Imagem carregada com sucesso: ${reg.name} (${reg.src})`
              );
              console.log(
                `   📊 Descritor criado com ${detection.descriptor.length} valores`
              );
              console.log(
                `   🎯 Confiança da detecção: ${detection.detection.score.toFixed(
                  4
                )}`
              );
            } else {
              console.warn(
                `❌ [${i + 1}/${
                  registeredImages.length
                }] Nenhum rosto detectado em: ${reg.name} (${reg.src})`
              );
              console.warn(
                `   💡 Verifique se a imagem ${reg.src} contém um rosto claro e bem iluminado`
              );
            }
          } catch (error) {
            console.error(
              `❌ [${i + 1}/${
                registeredImages.length
              }] Erro ao carregar imagem ${reg.name} (${reg.src}):`,
              error
            );
            console.error(
              `   🔍 Verifique se o arquivo ${reg.src} existe na pasta /public/registered/`
            );
          }
        }

        console.log(`\n📊 Total de descritores carregados: ${descs.length}`);
        console.log("🔄 Chamando setDescriptors...");
        setDescriptors(descs);
        console.log("✅ setDescriptors chamado");

        if (descs.length === 0) {
          console.error(
            "⚠️ NENHUM DESCRITOR CARREGADO! O reconhecimento não funcionará."
          );
          setPopup({
            open: true,
            msg: "ERRO: Nenhuma imagem registrada foi carregada. Verifique se as imagens estão na pasta /public/registered/ e contêm rostos claros.",
            type: "error",
          });
        } else {
          console.log("✅ Descritores carregados com sucesso!");
          console.log("📋 Descritores disponíveis:");
          descs.forEach((desc, index) => {
            console.log(
              `   ${index + 1}. ${desc.name} - ${
                desc.descriptor.length
              } valores`
            );
          });
        }
      } catch (error) {
        console.error("Erro ao carregar imagens:", error);
      }
    };

    loadImages();
  }, [modelsLoaded]);

  // Função para iniciar o reconhecimento facial
  const startFaceRecognition = async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !modelsLoaded ||
      descriptors.length === 0
    )
      return;
    // Detecta faces no vídeo
    const detections = await faceapi
      .detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 512,
          scoreThreshold: 0.2,
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptors();
    if (detections.length === 0) return;
    // Compara com descritores registrados
    let found = false;
    for (const detection of detections) {
      for (const desc of descriptors) {
        const distance = faceapi.euclideanDistance(
          detection.descriptor,
          desc.descriptor
        );
        if (distance < 0.35) {
          // threshold alto para estádio
          console.log(
            "[setPopup] Sucesso: acesso liberado",
            new Date().toISOString()
          );
          setPopup({ open: true, type: "success", msg: "" });
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      console.log("[setPopup] Erro: acesso negado", new Date().toISOString());
      setPopup({ open: true, type: "error", msg: "" });
    }
  };

  // Reconhecimento automático a cada 1s
  useEffect(() => {
    if (!modelsLoaded || descriptors.length === 0) return;
    const interval = setInterval(() => {
      startFaceRecognition();
    }, 1000);
    return () => clearInterval(interval);
  }, [modelsLoaded, descriptors]);

  // Painel de feedback some automaticamente após 5 segundos
  useEffect(() => {
    if (popup.open) {
      const timer = setTimeout(() => {
        setPopup({ open: false, msg: "", type: "warning" });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [popup.open]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>
      </div>
      {/* Feedback de acesso abaixo do vídeo */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 mt-8">
        {/* Coluna da câmera */}
        <div className="flex flex-col items-center">
          <h2 className="text-3xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg">
            Reconhecimento Facial
          </h2>
          <div
            className={`relative rounded-3xl overflow-hidden shadow-2xl border-4 transition-all duration-500 ${
              popup.open
                ? popup.type === "success"
                  ? "border-green-400"
                  : "border-red-400"
                : "border-blue-400"
            } bg-black mb-6`}
            style={{ width: 480, height: 360 }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
            {/* Overlay animado de status */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-2 rounded-full bg-black/60 backdrop-blur-md shadow-lg animate-fadein-slow">
              <span className="w-3 h-3 rounded-full animate-pulse bg-blue-400"></span>
              <span className="text-white text-base font-semibold tracking-wide">
                Aguardando pessoa...
              </span>
            </div>
          </div>
          {/* Painel de feedback de acesso abaixo da câmera, centralizado */}
          {popup.open && (
            <div className="w-full flex justify-center">
              <div
                className={`mt-4 w-[90vw] max-w-[420px] flex flex-col items-center justify-center rounded-2xl shadow-2xl border-2 ${
                  popup.type === "success"
                    ? "bg-green-500/95 border-green-600"
                    : "bg-red-500/95 border-red-600"
                } py-6 animate-fadein-slow`}
                style={{ minHeight: 110 }}
              >
                <div className="mb-2">
                  {popup.type === "success" ? (
                    <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="#22c55e"
                        opacity="0.15"
                      />
                      <path
                        d="M7 13l3 3 7-7"
                        stroke="#22c55e"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="#ef4444"
                        opacity="0.15"
                      />
                      <path
                        d="M15 9l-6 6M9 9l6 6"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div
                  className={`text-lg font-extrabold mb-1 ${
                    popup.type === "success" ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {popup.type === "success"
                    ? "ACESSO LIBERADO"
                    : "ACESSO NEGADO"}
                </div>
                <div className="text-base text-white font-medium text-center max-w-xs mb-1">
                  {popup.type === "success"
                    ? "Bem-vindo ao estádio! Aproveite o jogo!"
                    : "Não foi possível liberar o acesso. Procure um atendente."}
                </div>
              </div>
            </div>
          )}
          {/* Nenhum botão técnico */}
        </div>
        {/* Coluna lateral: status e instruções */}
        <div className="flex flex-col gap-8">
          {/* Instruções */}
          <div className="bg-white/10 rounded-2xl p-6 text-white shadow-xl animate-fadein-slow">
            <h3 className="font-extrabold text-xl mb-4 tracking-wide flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
              Instruções
            </h3>
            <ul className="list-disc ml-6 text-lg space-y-2">
              <li>Posicione-se bem na frente da câmera</li>
              <li>Certifique-se de que seu rosto está bem iluminado</li>
              <li>
                Apenas{" "}
                <span className="font-bold text-yellow-300">uma pessoa</span>{" "}
                por vez
              </li>
              <li>
                O reconhecimento é{" "}
                <span className="font-bold text-blue-300">automático</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* Animations CSS */}
      <style>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fadein-slow { animation: fadeInScale 0.8s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
    </div>
  );
};

export default FaceRecognition;
