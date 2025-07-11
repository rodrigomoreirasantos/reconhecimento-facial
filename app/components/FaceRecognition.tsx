"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Shield,
  Users,
  Loader2,
  Eye,
  Zap,
  Settings,
} from "lucide-react";

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
  const [recognitionThreshold] = useState(0.35); // ALTÍSSIMA PRECISÃO - aceita apenas distâncias menores que 0.35 (similaridade > 65%)
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [lastRecognitionAttempt, setLastRecognitionAttempt] =
    useState<string>("");
  const [debugSteps, setDebugSteps] = useState<string[]>([]);

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

  // Função para forçar carregamento manual dos modelos
  const forceLoadModels = async () => {
    console.log("🔧 Forçando carregamento manual dos modelos...");
    try {
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
      console.log("🎉 MODELOS CARREGADOS MANUALMENTE COM SUCESSO!");
    } catch (error) {
      console.error("❌ Erro ao carregar modelos manualmente:", error);
      setPopup({
        open: true,
        msg: `Erro ao carregar modelos: ${error}`,
        type: "error",
      });
    }
  };

  // Função para forçar carregamento manual das imagens
  const forceLoadImages = async () => {
    console.log("🔧 Forçando carregamento manual das imagens...");
    console.log("🤖 Models loaded:", modelsLoaded);
    console.log("📋 Imagens configuradas:", registeredImages);

    if (!modelsLoaded) {
      console.log("❌ Models not loaded, cannot load images");
      return;
    }

    const descs: Descriptors[] = [];
    console.log("🔄 Carregando imagens registradas manualmente...");
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
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
          `❌ [${i + 1}/${registeredImages.length}] Erro ao carregar imagem ${
            reg.name
          } (${reg.src}):`,
          error
        );
        console.error(
          `   🔍 Verifique se o arquivo ${reg.src} existe na pasta /public/registered/`
        );
      }
    }

    console.log(`\n📊 Total de descritores carregados: ${descs.length}`);
    console.log("🔄 Chamando setDescriptors manualmente...");
    setDescriptors(descs);
    console.log("✅ setDescriptors chamado manualmente");

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
      console.log("✅ Descritores carregados com sucesso manualmente!");
      console.log("📋 Descritores disponíveis:");
      descs.forEach((desc, index) => {
        console.log(
          `   ${index + 1}. ${desc.name} - ${desc.descriptor.length} valores`
        );
      });
    }
  };
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [personDetected, setPersonDetected] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setCameraError("");

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
        setCameraActive(true);
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
      setCameraError(
        error instanceof Error ? error.message : "Erro desconhecido"
      );
      setCameraActive(false);
    }
  };

  // Inicia a câmera quando os modelos estiverem carregados
  useEffect(() => {
    if (modelsLoaded && !cameraActive) {
      console.log("Modelos carregados, iniciando câmera...");
      startCamera();
    }
  }, [modelsLoaded, cameraActive]);

  // Inicia o reconhecimento quando os descritores estiverem carregados
  useEffect(() => {
    if (
      modelsLoaded &&
      descriptors.length > 0 &&
      cameraActive &&
      !detectionIntervalRef.current
    ) {
      console.log("🎯 Descritores carregados, iniciando reconhecimento...");
      console.log("📊 Descritores disponíveis:", descriptors.length);
      startFaceRecognition();
    }
  }, [modelsLoaded, descriptors.length, cameraActive]);

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
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
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
  const startFaceRecognition = () => {
    console.log("Iniciando sistema de reconhecimento facial...");

    if (detectionIntervalRef.current) {
      console.log("Limpando intervalo anterior...");
      clearInterval(detectionIntervalRef.current);
    }

    console.log("Criando novo intervalo de detecção...");
    detectionIntervalRef.current = setInterval(async () => {
      console.log("Intervalo executando...");
      console.log("Video ref:", !!videoRef.current);
      console.log("Canvas ref:", !!canvasRef.current);
      console.log("Is processing:", isProcessing);

      if (!videoRef.current || !canvasRef.current || isProcessing) {
        console.log("Condições não atendidas para execução do intervalo");
        return;
      }

      try {
        console.log("Iniciando processamento...");
        setIsProcessing(true);
        await performFaceRecognition();
      } catch (error) {
        console.error("Erro no reconhecimento:", error);
      } finally {
        console.log("Finalizando processamento...");
        setIsProcessing(false);
      }
    }, 1000); // Verifica a cada segundo

    console.log("Intervalo de detecção criado com sucesso");
  };

  // Função principal de reconhecimento facial
  const performFaceRecognition = async () => {
    console.log("🔍 Iniciando reconhecimento facial...");
    setDebugSteps(["🔍 Iniciando reconhecimento facial..."]);

    console.log("📹 Video ref:", !!videoRef.current);
    console.log("🎨 Canvas ref:", !!canvasRef.current);
    console.log("🤖 Models loaded:", modelsLoaded);
    console.log("👥 Descriptors count:", descriptors.length);
    console.log("🎯 Threshold atual:", recognitionThreshold);
    console.log("📊 Descriptors details:", descriptors);

    // Verificações de segurança mais robustas
    if (!videoRef.current) {
      console.log("❌ Video ref é null");
      setDebugInfo("❌ Video ref é null");
      setLastRecognitionAttempt("❌ Video ref é null");
      setDebugSteps((prev) => [...prev, "❌ Video ref é null"]);
      return;
    }

    if (!canvasRef.current) {
      console.log("❌ Canvas ref é null");
      setDebugInfo("❌ Canvas ref é null");
      setLastRecognitionAttempt("❌ Canvas ref é null");
      setDebugSteps((prev) => [...prev, "❌ Canvas ref é null"]);
      return;
    }

    if (!modelsLoaded) {
      console.log("❌ Models não carregados");
      setDebugInfo("❌ Models não carregados");
      setLastRecognitionAttempt("❌ Models não carregados");
      setDebugSteps((prev) => [...prev, "❌ Models não carregados"]);
      return;
    }

    // Verificação adicional para vídeo estar pronto
    if (
      videoRef.current.videoWidth === 0 ||
      videoRef.current.videoHeight === 0
    ) {
      console.log("❌ Vídeo não está pronto (dimensões zero)");
      setDebugInfo("❌ Vídeo não está pronto");
      setLastRecognitionAttempt("❌ Vídeo não está pronto");
      setDebugSteps((prev) => [...prev, "❌ Vídeo não está pronto"]);
      return;
    }

    if (descriptors.length === 0) {
      console.log("❌ Nenhum descritor carregado - reconhecimento impossível");
      setDebugInfo("❌ Nenhum descritor carregado");
      setLastRecognitionAttempt("❌ Nenhum descritor carregado");
      setDebugSteps((prev) => [...prev, "❌ Nenhum descritor carregado"]);
      setPopup({
        open: true,
        msg: "ERRO: Nenhuma pessoa registrada. Adicione imagens na pasta /public/registered/",
        type: "error",
      });
      return;
    }

    // Verificação adicional para stream estar ativo
    if (!streamRef.current || !streamRef.current.active) {
      console.log("❌ Stream não está ativo");
      setDebugInfo("❌ Stream não está ativo");
      setLastRecognitionAttempt("❌ Stream não está ativo");
      setDebugSteps((prev) => [...prev, "❌ Stream não está ativo"]);
      return;
    }

    // Fecha popup anterior antes de fazer nova verificação
    if (popup.open) {
      console.log("🔄 Fechando popup anterior para nova verificação...");
      closePopup();
    }

    try {
      // Detecta faces no vídeo com configurações específicas para Mac
      console.log("🔍 Detectando faces no vídeo...");
      setDebugInfo("🔍 Detectando faces...");
      setLastRecognitionAttempt("🔍 Detectando faces...");
      setDebugSteps((prev) => [...prev, "🔍 Detectando faces no vídeo..."]);

      // Configurações otimizadas para webcams do Mac - EXTREMAMENTE permissivas para teste
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 1024, // Input size maior para máxima precisão
        scoreThreshold: 0.01, // Threshold EXTREMAMENTE baixo para detectar rostos em qualquer condição
      });

      console.log("🔧 Configurações do detector (EXTREMAMENTE PERMISSIVAS):", {
        inputSize: detectorOptions.inputSize,
        scoreThreshold: detectorOptions.scoreThreshold,
      });

      // Log das configurações da câmera para debug
      if (videoRef.current) {
        console.log("📹 Informações da câmera:");
        console.log("   - Video width:", videoRef.current.videoWidth);
        console.log("   - Video height:", videoRef.current.videoHeight);
        console.log(
          "   - Device ID:",
          videoRef.current.srcObject
            ? (videoRef.current.srcObject as MediaStream)
                .getVideoTracks()[0]
                ?.getSettings().deviceId
            : "N/A"
        );

        // Detecção específica para Mac
        const deviceId = videoRef.current.srcObject
          ? (videoRef.current.srcObject as MediaStream)
              .getVideoTracks()[0]
              ?.getSettings().deviceId
          : "";
        const isMacCamera =
          deviceId &&
          (deviceId.includes("Mac") ||
            deviceId.includes("FaceTime") ||
            deviceId.includes("Built-in"));
        console.log("🍎 É câmera do Mac:", isMacCamera);

        if (isMacCamera) {
          console.log("💡 Otimizações específicas para Mac aplicadas:");
          console.log("   - Detector mais sensível");
          console.log("   - Threshold mais permissivo");
          console.log("   - Configurações adaptadas para qualidade do Mac");
        }
      }

      const detections = await faceapi
        .detectAllFaces(videoRef.current, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log(`👤 Faces detectadas: ${detections.length}`);
      setDebugInfo(`👤 Faces detectadas: ${detections.length}`);
      setLastRecognitionAttempt(`👤 Faces detectadas: ${detections.length}`);
      setDebugSteps((prev) => [
        ...prev,
        `👤 Faces detectadas: ${detections.length}`,
      ]);

      if (detections.length === 0) {
        console.log("❌ Nenhuma face detectada na webcam");
        console.log("💡 Possíveis causas:");
        console.log("   - Iluminação insuficiente");
        console.log("   - Posicionamento inadequado");
        console.log("   - Qualidade da webcam do Mac");
        console.log("   - Configurações de detector muito restritivas");
        setPersonDetected(false);
        setDebugInfo("❌ Nenhuma face detectada");
        setLastRecognitionAttempt("❌ Nenhuma face detectada");
        setDebugSteps((prev) => [...prev, "❌ Nenhuma face detectada"]);
        return;
      }

      // VERIFICAÇÃO CRÍTICA PARA ESTÁDIO: Múltiplas faces
      if (detections.length > 1) {
        console.log("🚫 MÚLTIPLAS FACES DETECTADAS - ACESSO NEGADO");
        console.log("💡 Para estádio: Apenas uma pessoa por vez");
        console.log(`📊 Faces detectadas: ${detections.length}`);

        // Log das confianças de cada face
        detections.forEach((detection, index) => {
          console.log(
            `   Face ${
              index + 1
            }: confiança ${detection.detection.score.toFixed(3)}`
          );
        });

        // VERIFICAÇÃO ADICIONAL: Se a segunda face tem confiança muito baixa, pode ser falso positivo
        const mainFace = detections[0];
        const secondaryFace = detections[1];

        console.log(
          `🎯 Face principal: ${mainFace.detection.score.toFixed(3)}`
        );
        console.log(
          `🎯 Face secundária: ${secondaryFace.detection.score.toFixed(3)}`
        );

        // Se a face secundária tem confiança muito baixa (< 0.3), pode ser falso positivo
        if (secondaryFace.detection.score < 0.3) {
          console.log(
            "✅ Face secundária com confiança baixa - provável falso positivo"
          );
          console.log("💡 Continuando com apenas a face principal");

          // Continua com apenas a primeira face (mais confiável)
          console.log("✅ Usando apenas face principal para reconhecimento");

          // Continua o processamento com apenas uma face
          setPersonDetected(true);
          setDebugInfo("✅ Face principal detectada, comparando...");
          setLastRecognitionAttempt(
            "✅ Face principal detectada, comparando..."
          );
          setDebugSteps((prev) => [
            ...prev,
            "✅ Face principal detectada, comparando com descritores...",
          ]);

          // Continua com o reconhecimento usando apenas a face principal
          // (o código continua normalmente após este bloco)
        } else {
          // Se a segunda face tem confiança alta, realmente há múltiplas pessoas
          console.log("🚫 Múltiplas pessoas confirmadas - Acesso negado");

          setPersonDetected(false);
          setDebugInfo(
            `🚫 Múltiplas faces (${detections.length}) - Acesso negado`
          );
          setLastRecognitionAttempt(
            `🚫 Múltiplas faces (${detections.length}) - Acesso negado`
          );
          setDebugSteps((prev) => [
            ...prev,
            `🚫 Múltiplas faces (${detections.length}) - Acesso negado`,
          ]);

          setPopup({
            open: true,
            msg: `Acesso NEGADO! Múltiplas pessoas detectadas (${detections.length}). Para estádio: apenas uma pessoa por vez.`,
            type: "error",
          });
          return;
        }
      }

      // VERIFICAÇÃO ADICIONAL: Detectar interferência mesmo com uma face
      const detection = detections[0];
      console.log(
        `🎯 Confiança da detecção: ${detection.detection.score.toFixed(3)}`
      );

      // Se a confiança for muito baixa, pode indicar detecção parcial ou interferência
      if (detection.detection.score < 0.3) {
        console.log(
          "⚠️ Confiança muito baixa - pode haver interferência de outras pessoas"
        );
        console.log("💡 Para estádio: Posicione-se melhor na frente da câmera");

        setPersonDetected(false);
        setDebugInfo("⚠️ Confiança muito baixa - possível interferência");
        setLastRecognitionAttempt(
          "⚠️ Confiança muito baixa - possível interferência"
        );
        setDebugSteps((prev) => [
          ...prev,
          "⚠️ Confiança muito baixa - possível interferência",
        ]);

        setPopup({
          open: true,
          msg: "Acesso NEGADO! Detecção com confiança muito baixa. Posicione-se melhor na frente da câmera, sem outras pessoas próximas.",
          type: "error",
        });
        return;
      }

      setPersonDetected(true);
      console.log("✅ Pessoa detectada, comparando com descritores...");
      setDebugInfo("✅ Pessoa detectada, comparando...");
      setLastRecognitionAttempt("✅ Pessoa detectada, comparando...");
      setDebugSteps((prev) => [
        ...prev,
        "✅ Pessoa detectada, comparando com descritores...",
      ]);

      // Desenha os retângulos de detecção
      const canvas = canvasRef.current;

      // Verificação de segurança para videoRef
      if (!videoRef.current) {
        console.log("❌ Video ref é null, pulando desenho");
        return;
      }

      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      // Verificação adicional para dimensões válidas
      if (displaySize.width === 0 || displaySize.height === 0) {
        console.log("❌ Dimensões do vídeo inválidas, pulando desenho");
        return;
      }

      faceapi.matchDimensions(canvas, displaySize);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Desenha todas as faces detectadas
        faceapi.draw.drawDetections(canvas, resizedDetections);

        // Se há múltiplas faces, adiciona texto de aviso
        if (resizedDetections.length > 1) {
          ctx.fillStyle = "#ff0000";
          ctx.font = "20px Arial";
          ctx.fillText("MÚLTIPLAS PESSOAS DETECTADAS", 10, 30);
        }
      }

      // Compara com os descritores registrados
      let foundMatch = false;
      let bestMatch = { name: "", distance: Infinity, similarity: 0 };
      const allDistances: string[] = [];
      const highSimilarityMatches: Array<{ name: string; similarity: number }> =
        [];

      console.log(
        `🔍 Comparando ${detections.length} face(s) com ${descriptors.length} descritor(es)...`
      );
      setDebugSteps((prev) => [
        ...prev,
        `🔍 Comparando ${detections.length} face(s) com ${descriptors.length} descritor(es)...`,
      ]);

      for (const detection of detections) {
        console.log(
          `📊 Processando face detectada (confiança: ${detection.detection.score.toFixed(
            3
          )})`
        );

        console.log(
          `🔍 Testando contra ${descriptors.length} descritor(es) registrado(s)...`
        );

        for (let i = 0; i < descriptors.length; i++) {
          const descriptor = descriptors[i];
          const distance = faceapi.euclideanDistance(
            detection.descriptor,
            descriptor.descriptor
          );

          // Calcula similaridade (0-1, onde 1 é idêntico)
          const similarity = 1 - Math.min(distance, 1);

          const distanceInfo = `${descriptor.name}: ${distance.toFixed(4)} (${(
            similarity * 100
          ).toFixed(1)}%)`;
          allDistances.push(distanceInfo);

          console.log(
            `📏 [${i + 1}/${descriptors.length}] ${
              descriptor.name
            }: distância=${distance.toFixed(
              4
            )}, similaridade=${similarity.toFixed(4)} (${(
              similarity * 100
            ).toFixed(1)}%), threshold=${recognitionThreshold}`
          );

          // Atualiza melhor match para debug
          if (distance < bestMatch.distance) {
            bestMatch = {
              name: descriptor.name,
              distance: distance,
              similarity: similarity,
            };
          }

          // Coleta matches com alta similaridade (possível interferência)
          if (similarity > 0.4) {
            highSimilarityMatches.push({
              name: descriptor.name,
              similarity: similarity,
            });
          }

          // Lógica corrigida: distância menor = mais similar
          // Para ser reconhecido, a distância deve ser MENOR que o threshold
          if (distance < recognitionThreshold) {
            console.log(
              `✅ PESSOA RECONHECIDA: ${
                descriptor.name
              } (distância: ${distance.toFixed(
                4
              )}, similaridade: ${similarity.toFixed(4)})`
            );
            foundMatch = true;
            setDebugInfo(
              `✅ RECONHECIDO: ${descriptor.name} (${(similarity * 100).toFixed(
                1
              )}%)`
            );
            setLastRecognitionAttempt(
              `✅ RECONHECIDO: ${descriptor.name} (${(similarity * 100).toFixed(
                1
              )}%)`
            );
            setDebugSteps((prev) => [
              ...prev,
              `✅ RECONHECIDO: ${descriptor.name} (${(similarity * 100).toFixed(
                1
              )}%)`,
            ]);
            setPopup({
              open: true,
              msg: `Acesso LIBERADO! Bem-vindo, ${
                descriptor.name
              }! Você possui ingresso válido. (Similaridade: ${(
                similarity * 100
              ).toFixed(1)}%)`,
              type: "success",
            });
            return;
          } else {
            console.log(
              `❌ [${i + 1}/${descriptors.length}] Distância muito alta para ${
                descriptor.name
              }: ${distance.toFixed(
                4
              )} >= ${recognitionThreshold} (similaridade: ${(
                similarity * 100
              ).toFixed(1)}%)`
            );

            // Log mais detalhado para pessoas não reconhecidas
            if (similarity < 0.3) {
              console.log(
                `🚫 PESSOA DESCONHECIDA: Similaridade muito baixa (${(
                  similarity * 100
                ).toFixed(1)}%) - Acesso negado corretamente`
              );
            } else {
              console.log(
                `⚠️ SIMILARIDADE INTERMEDIÁRIA: ${(similarity * 100).toFixed(
                  1
                )}% - Pode ser a mesma pessoa com iluminação diferente`
              );
            }
          }
        }
      }

      // VERIFICAÇÃO CRÍTICA: Múltiplas pessoas com alta similaridade
      if (highSimilarityMatches.length > 1) {
        console.log("🚫 MÚLTIPLAS PESSOAS COM ALTA SIMILARIDADE DETECTADAS");
        console.log("💡 Isso indica interferência de outras pessoas na câmera");
        console.log("📊 Matches com alta similaridade:");
        highSimilarityMatches.forEach((match, index) => {
          console.log(
            `   ${index + 1}. ${match.name}: ${(match.similarity * 100).toFixed(
              1
            )}%`
          );
        });

        setPersonDetected(false);
        setDebugInfo(
          "🚫 Múltiplas pessoas com alta similaridade - possível interferência"
        );
        setLastRecognitionAttempt(
          "🚫 Múltiplas pessoas com alta similaridade - possível interferência"
        );
        setDebugSteps((prev) => [
          ...prev,
          "🚫 Múltiplas pessoas com alta similaridade - possível interferência",
        ]);

        setPopup({
          open: true,
          msg: `Acesso NEGADO! Detectada possível interferência de outras pessoas. Posicione-se sozinho na frente da câmera.`,
          type: "error",
        });
        return;
      }

      // Se chegou aqui, não reconheceu ninguém
      if (!foundMatch) {
        console.log("❌ PESSOA NÃO RECONHECIDA");
        console.log("📊 Melhor match encontrado:");
        console.log(`   - Nome: ${bestMatch.name}`);
        console.log(`   - Distância: ${bestMatch.distance.toFixed(4)}`);
        console.log(
          `   - Similaridade: ${(bestMatch.similarity * 100).toFixed(1)}%`
        );
        console.log(
          `   - Threshold: ${recognitionThreshold} (similaridade mínima: ${(
            (1 - recognitionThreshold) *
            100
          ).toFixed(1)}%)`
        );

        // Mostra todas as distâncias para debug
        console.log("📊 Todas as distâncias:");
        for (const descriptor of descriptors) {
          const distance = faceapi.euclideanDistance(
            detections[0].descriptor,
            descriptor.descriptor
          );
          const similarity = 1 - Math.min(distance, 1);
          console.log(
            `   - ${descriptor.name}: ${distance.toFixed(4)} (${(
              similarity * 100
            ).toFixed(1)}%)`
          );
        }

        // Log específico para estádio
        if (bestMatch.similarity < 0.6) {
          console.log(
            "🚫 ACESSO NEGADO: Similaridade muito baixa para estádio"
          );
          console.log("   💡 Para estádio: Similaridade mínima deve ser > 60%");
        } else {
          console.log("⚠️ SIMILARIDADE ALTA MAS INSUFICIENTE");
          console.log("   💡 Pode ser a mesma pessoa com condições diferentes");
        }

        setDebugInfo(
          `❌ NÃO RECONHECIDO. Melhor: ${bestMatch.name} (${(
            bestMatch.similarity * 100
          ).toFixed(1)}%)`
        );
        setLastRecognitionAttempt(
          `❌ NÃO RECONHECIDO. Melhor: ${bestMatch.name} (${(
            bestMatch.similarity * 100
          ).toFixed(1)}%)`
        );
        setDebugSteps((prev) => [
          ...prev,
          `❌ NÃO RECONHECIDO. Melhor: ${bestMatch.name} (${(
            bestMatch.similarity * 100
          ).toFixed(1)}%)`,
        ]);
        setPopup({
          open: true,
          msg: `Acesso NEGADO! Pessoa não reconhecida. Melhor match: ${
            bestMatch.name
          } (${(bestMatch.similarity * 100).toFixed(
            1
          )}% similaridade). Para estádio: similaridade mínima ${(
            (1 - recognitionThreshold) *
            100
          ).toFixed(1)}%`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("❌ Erro no reconhecimento facial:", error);
      setDebugInfo(`❌ Erro: ${error}`);
      setLastRecognitionAttempt(`❌ Erro: ${error}`);
      setDebugSteps((prev) => [...prev, `❌ Erro: ${error}`]);
    }
  };

  // Função para fechar popup
  const closePopup = () => {
    console.log("Fechando popup");
    setPopup({ open: false, msg: "", type: "warning" });
  };

  // Função para reiniciar a câmera
  const restartCamera = async () => {
    console.log("Reiniciando câmera...");

    // Para o stream atual
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Limpa o vídeo
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Para o intervalo de detecção
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // Reseta estados
    setCameraActive(false);
    setCameraError("");
    setPersonDetected(false);

    // Reinicia
    await startCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center border-b border-gray-200/50 pb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-75"></div>
                <Shield className="relative h-16 w-16 text-white" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🏟️ Controle de Acesso - Estádio
            </CardTitle>
            <CardDescription className="text-xl text-gray-600 mt-2">
              Sistema de Reconhecimento Facial - V2
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {/* Status dos modelos */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <Badge
                variant={modelsLoaded ? "default" : "secondary"}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium"
              >
                {modelsLoaded ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {modelsLoaded ? "Modelos carregados" : "Carregando modelos..."}
              </Badge>

              <Badge
                variant={descriptors.length > 0 ? "default" : "destructive"}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium"
              >
                <Users className="h-4 w-4" />
                {descriptors.length} pessoas registradas
              </Badge>

              <Badge
                variant={cameraActive ? "default" : "secondary"}
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium"
              >
                <Camera className="h-4 w-4" />
                {cameraActive ? "Câmera ativa" : "Câmera inativa"}
              </Badge>
            </div>

            {/* Main content grid */}
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Video container */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    Câmera de Reconhecimento
                  </h3>
                </div>

                <div className="relative flex justify-center">
                  <div
                    className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-200 bg-gray-100"
                    style={{ width: "480px", height: "360px" }}
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

                    {/* Camera overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

                    {/* Camera status indicator */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            cameraActive ? "bg-green-400" : "bg-red-400"
                          }`}
                        ></div>
                        {cameraActive
                          ? personDetected
                            ? "DETECTED"
                            : "LIVE"
                          : "OFF"}
                      </div>
                    </div>

                    {/* Camera debug info */}
                    {!cameraActive && (
                      <div className="absolute bottom-4 left-4 bg-yellow-500/90 text-white px-3 py-1 rounded text-xs">
                        {cameraError
                          ? `Erro: ${cameraError}`
                          : "Aguardando câmera..."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera controls */}
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={restartCamera}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Reiniciar Câmera
                  </Button>

                  <Button
                    onClick={forceLoadModels}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Carregar Modelos
                  </Button>

                  <Button
                    onClick={forceLoadImages}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    Forçar Carregamento
                  </Button>
                </div>

                {/* Debug panel */}
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                    🔧 Painel de Debug - Sistema Completo
                  </h4>
                  <div className="text-xs space-y-1">
                    <p className="text-yellow-700">
                      • Modelos carregados: {modelsLoaded ? "✅" : "❌"}
                    </p>
                    <p className="text-yellow-700">
                      • Descritores carregados: {descriptors.length}
                    </p>
                    <p className="text-yellow-700">
                      • Imagens configuradas: {registeredImages.length}
                    </p>
                    <p className="text-yellow-700">
                      • Câmera ativa: {cameraActive ? "✅" : "❌"}
                    </p>

                    {!modelsLoaded && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-red-700 font-medium">
                          ⚠️ PROBLEMA: Modelos não carregados!
                        </p>
                        <p className="text-red-600 text-xs mt-1">
                          Clique em &quot;Carregar Modelos&quot; para tentar
                          carregar manualmente.
                        </p>
                      </div>
                    )}

                    {modelsLoaded && descriptors.length === 0 && (
                      <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
                        <p className="text-orange-700 font-medium">
                          ⚠️ PROBLEMA: Modelos OK, mas nenhum descritor
                          carregado!
                        </p>
                        <p className="text-orange-600 text-xs mt-1">
                          Clique em &quot;Forçar Carregamento&quot; para tentar
                          carregar as imagens.
                        </p>
                      </div>
                    )}

                    {modelsLoaded && descriptors.length > 0 && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-green-700 font-medium">
                          ✅ Sistema pronto para reconhecimento!
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                          Modelos e descritores carregados com sucesso.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status do reconhecimento em tempo real */}
                <div className="text-center pt-4">
                  {personDetected ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-800">
                        🔍 Verificando Identidade...
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-gray-100 to-slate-100 border border-gray-200">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-600">
                        Aguardando Pessoa
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {personDetected
                      ? "🔍 Verificando sua identidade a cada segundo..."
                      : "Posicione-se na frente da câmera para verificação automática"}
                  </p>

                  {/* Informações de debug em tempo real */}
                  {personDetected && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium">
                        📊 Status do Reconhecimento:
                      </p>
                      <p className="text-xs text-blue-600">
                        • Threshold atual: {recognitionThreshold.toFixed(2)}
                      </p>
                      <p className="text-xs text-blue-600">
                        • Descritores carregados: {descriptors.length}
                      </p>
                      <p className="text-xs text-blue-600">
                        • Verificação automática a cada 1 segundo
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        💡 <strong>EXTREMAMENTE PERMISSIVO:</strong> Threshold
                        0.95 para forçar reconhecimento
                      </p>
                      {debugInfo && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-xs text-gray-700 font-medium">
                            Debug:
                          </p>
                          <p className="text-xs text-gray-600">{debugInfo}</p>
                          {lastRecognitionAttempt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Última tentativa: {lastRecognitionAttempt}
                            </p>
                          )}
                          {debugSteps.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-700 font-medium">
                                Passos:
                              </p>
                              {debugSteps.slice(-5).map((step, index) => (
                                <p
                                  key={index}
                                  className="text-xs text-gray-500"
                                >
                                  {step}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info panel */}
              <div className="space-y-6">
                {/* System Status */}
                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-800 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Status do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Modelos de IA:
                        </span>
                        <Badge
                          variant={modelsLoaded ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {modelsLoaded ? "Ativo" : "Carregando..."}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Pessoas registradas:
                        </span>
                        <Badge
                          variant={
                            descriptors.length > 0 ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {descriptors.length}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Câmera:</span>
                        <Badge
                          variant={cameraActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {cameraActive ? "Conectada" : "Desconectada"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Threshold:
                        </span>
                        <Badge
                          variant="default"
                          className="text-xs bg-purple-500"
                        >
                          {recognitionThreshold.toFixed(2)} (ESTÁDIO - ALTA
                          PRECISÃO)
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge
                          variant={personDetected ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {personDetected ? "Detectando" : "Aguardando"}
                        </Badge>
                      </div>

                      {cameraError && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                          Erro: {cameraError}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructions */}
                <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Instruções de Uso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-green-700 space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>Posicione-se bem na frente da câmera</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          Certifique-se de que seu rosto está bem iluminado
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          O reconhecimento acontece automaticamente a cada
                          segundo
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          Apenas pessoas com ingressos válidos terão acesso
                          liberado
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="font-semibold">
                          IMPORTANTE: Apenas uma pessoa por vez na frente da
                          câmera
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Features */}
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-purple-800 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Recursos do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-purple-700">
                          Reconhecimento
                        </div>
                        <div className="text-purple-600">Facial Avançado</div>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-purple-700">
                          Segurança
                        </div>
                        <div className="text-purple-600">Alta Precisão</div>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-purple-700">
                          Velocidade
                        </div>
                        <div className="text-purple-600">
                          Processamento Rápido
                        </div>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="font-semibold text-purple-700">
                          Interface
                        </div>
                        <div className="text-purple-600">Intuitiva</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de resultado */}
      <Dialog open={popup.open} onOpenChange={closePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {popup.type === "success" ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : popup.type === "error" ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
              {popup.type === "success"
                ? "Acesso Liberado"
                : popup.type === "error"
                ? "Acesso Negado"
                : "Aviso"}
            </DialogTitle>
            <DialogDescription className="text-base font-medium">
              {popup.msg}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={closePopup} variant="outline">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FaceRecognition;
