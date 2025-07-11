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
  { name: "Rodrigo Moreira Santos", src: "/registered/rodrigo1.jpg" },
  { name: "Rodrigo Moreira Santos", src: "/registered/rodrigo.png" },
];

const FaceRecognition = () => {
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
  const [recognitionThreshold, setRecognitionThreshold] = useState(0.6); // Reduzido de 0.7 para 0.6

  // Monitora mudanças no popup para debug
  useEffect(() => {
    console.log("Estado do popup mudou:", popup);
  }, [popup]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [personDetected, setPersonDetected] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega os modelos do face-api.js
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Iniciando carregamento dos modelos...");
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
        console.log("Modelos carregados com sucesso!");
      } catch (error) {
        console.error("Erro ao carregar modelos:", error);
        setPopup({
          open: true,
          msg: "Erro ao carregar modelos de IA. Verifique se os arquivos estão na pasta /public/models",
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

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      console.log(
        "Stream obtido:",
        mediaStream.getVideoTracks().length,
        "tracks de vídeo"
      );

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        setCameraActive(true);
        console.log("Câmera ativada com sucesso!");

        // Aguarda o vídeo estar pronto
        videoRef.current.onloadedmetadata = () => {
          console.log("Vídeo carregado e pronto");
          videoRef.current?.play().catch(console.error);

          // Inicia o reconhecimento facial após o vídeo estar pronto
          console.log("Iniciando reconhecimento facial após vídeo pronto...");
          startFaceRecognition();
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
    if (!modelsLoaded) return;

    const loadImages = async () => {
      try {
        const descs: Descriptors[] = [];
        console.log("🔄 Carregando imagens registradas...");
        console.log("📋 Imagens configuradas:", registeredImages);

        for (let i = 0; i < registeredImages.length; i++) {
          const reg = registeredImages[i];
          try {
            console.log(
              `\n🖼️ [${i + 1}/${registeredImages.length}] Tentando carregar: ${
                reg.src
              }`
            );

            // Testa se a imagem existe primeiro
            const response = await fetch(reg.src);
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
            } catch {
              console.warn(
                `⚠️ [${i + 1}/${
                  registeredImages.length
                }] Falha na detecção padrão, tentando configuração alternativa...`
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
                  }] Falha em ambas as tentativas de detecção`
                );
                throw altError;
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

        setDescriptors(descs);
        console.log(`\n📊 Total de descritores carregados: ${descs.length}`);

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
    console.log("📹 Video ref:", !!videoRef.current);
    console.log("🎨 Canvas ref:", !!canvasRef.current);
    console.log("🤖 Models loaded:", modelsLoaded);
    console.log("👥 Descriptors count:", descriptors.length);
    console.log("🎯 Threshold atual:", recognitionThreshold);

    if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
      console.log("❌ Condições não atendidas para reconhecimento");
      return;
    }

    if (descriptors.length === 0) {
      console.log("❌ Nenhum descritor carregado - reconhecimento impossível");
      setPopup({
        open: true,
        msg: "ERRO: Nenhuma pessoa registrada. Adicione imagens na pasta /public/registered/",
        type: "error",
      });
      return;
    }

    // Fecha popup anterior antes de fazer nova verificação
    if (popup.open) {
      console.log("🔄 Fechando popup anterior para nova verificação...");
      closePopup();
    }

    try {
      // Detecta faces no vídeo
      console.log("🔍 Detectando faces no vídeo...");
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      console.log(`👤 Faces detectadas: ${detections.length}`);

      if (detections.length === 0) {
        console.log("❌ Nenhuma face detectada na webcam");
        setPersonDetected(false);
        return;
      }

      setPersonDetected(true);
      console.log("✅ Pessoa detectada, comparando com descritores...");

      // Desenha os retângulos de detecção
      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current!.videoWidth,
        height: videoRef.current!.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
      }

      // Compara com os descritores registrados
      let foundMatch = false;
      let bestMatch = { name: "", distance: Infinity, similarity: 0 };

      console.log(
        `🔍 Comparando ${detections.length} face(s) com ${descriptors.length} descritor(es)...`
      );

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

          console.log(
            `📏 [${i + 1}/${descriptors.length}] ${
              descriptor.name
            }: distância=${distance.toFixed(
              4
            )}, similaridade=${similarity.toFixed(
              4
            )}, threshold=${recognitionThreshold}`
          );

          // Atualiza melhor match para debug
          if (distance < bestMatch.distance) {
            bestMatch = {
              name: descriptor.name,
              distance: distance,
              similarity: similarity,
            };
          }

          // Lógica corrigida: distância menor = mais similar
          if (distance < recognitionThreshold) {
            console.log(
              `✅ PESSOA RECONHECIDA: ${
                descriptor.name
              } (distância: ${distance.toFixed(
                4
              )}, similaridade: ${similarity.toFixed(4)})`
            );
            foundMatch = true;
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
              }: ${distance.toFixed(4)} >= ${recognitionThreshold}`
            );
          }
        }
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
        console.log(`   - Threshold: ${recognitionThreshold}`);

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

        setPopup({
          open: true,
          msg: `Acesso NEGADO! Pessoa não reconhecida. Melhor match: ${
            bestMatch.name
          } (${(bestMatch.similarity * 100).toFixed(1)}% similaridade)`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("❌ Erro no reconhecimento facial:", error);
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
                    onClick={() => {
                      console.log("Testando popup...");
                      setPopup({
                        open: true,
                        msg: "Teste de popup - Se você vê esta mensagem, o popup está funcionando!",
                        type: "warning",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Testar Popup
                  </Button>

                  <Button
                    onClick={() => {
                      console.log("Forçando reconhecimento...");
                      performFaceRecognition();
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Forçar Reconhecimento
                  </Button>

                  <Button
                    onClick={() => {
                      const newThreshold = recognitionThreshold + 0.05;
                      setRecognitionThreshold(newThreshold);
                      console.log(`Threshold aumentado para: ${newThreshold}`);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Aumentar Threshold ({recognitionThreshold.toFixed(2)})
                  </Button>

                  <Button
                    onClick={() => {
                      const newThreshold = Math.max(
                        0.1,
                        recognitionThreshold - 0.05
                      );
                      setRecognitionThreshold(newThreshold);
                      console.log(`Threshold diminuído para: ${newThreshold}`);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Diminuir Threshold ({recognitionThreshold.toFixed(2)})
                  </Button>

                  <Button
                    onClick={() => {
                      console.log("🔍 Verificando descritores carregados...");
                      console.log(
                        "📊 Total de descritores:",
                        descriptors.length
                      );
                      console.log("📋 Imagens configuradas:");
                      registeredImages.forEach((img, index) => {
                        console.log(
                          `   ${index + 1}. ${img.name} - ${img.src}`
                        );
                      });
                      console.log("📋 Descritores carregados:");
                      descriptors.forEach((desc, index) => {
                        console.log(
                          `   ${index + 1}. ${desc.name} - ${
                            desc.descriptor.length
                          } valores`
                        );
                      });
                      if (descriptors.length === 0) {
                        console.log("⚠️ NENHUM DESCRITOR CARREGADO!");
                        console.log(
                          "   Verifique se as imagens existem e contêm rostos"
                        );
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Verificar Descritores
                  </Button>

                  <Button
                    onClick={async () => {
                      console.log(
                        "🧪 Testando reconhecimento com diferentes thresholds..."
                      );
                      const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
                      const originalThreshold = recognitionThreshold;

                      for (const threshold of thresholds) {
                        setRecognitionThreshold(threshold);
                        console.log(
                          `\n🔍 Testando com threshold: ${threshold}`
                        );
                        await new Promise((resolve) =>
                          setTimeout(resolve, 100)
                        );
                        await performFaceRecognition();
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500)
                        );
                      }

                      setRecognitionThreshold(originalThreshold);
                      console.log(
                        `\n✅ Teste concluído. Threshold restaurado para: ${originalThreshold}`
                      );
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Testar Thresholds
                  </Button>

                  <Button
                    onClick={async () => {
                      console.log("🔬 Teste de reconhecimento simples...");

                      if (!videoRef.current || descriptors.length === 0) {
                        console.log("❌ Câmera ou descritores não disponíveis");
                        return;
                      }

                      try {
                        // Detecta face no vídeo
                        const detection = await faceapi
                          .detectSingleFace(
                            videoRef.current,
                            new faceapi.TinyFaceDetectorOptions()
                          )
                          .withFaceLandmarks()
                          .withFaceDescriptor();

                        if (!detection) {
                          console.log("❌ Nenhuma face detectada na webcam");
                          return;
                        }

                        console.log("✅ Face detectada na webcam");
                        console.log(
                          `📊 Confiança: ${detection.detection.score.toFixed(
                            4
                          )}`
                        );

                        // Compara com cada descritor
                        console.log(
                          `\n🔍 Testando contra ${descriptors.length} descritor(es) registrado(s)...`
                        );

                        for (let i = 0; i < descriptors.length; i++) {
                          const descriptor = descriptors[i];
                          const distance = faceapi.euclideanDistance(
                            detection.descriptor,
                            descriptor.descriptor
                          );
                          const similarity = 1 - Math.min(distance, 1);

                          console.log(
                            `\n📏 [${i + 1}/${descriptors.length}] ${
                              descriptor.name
                            }:`
                          );
                          console.log(`   Distância: ${distance.toFixed(4)}`);
                          console.log(
                            `   Similaridade: ${(similarity * 100).toFixed(1)}%`
                          );
                          console.log(
                            `   Threshold atual: ${recognitionThreshold}`
                          );
                          console.log(
                            `   Resultado: ${
                              distance < recognitionThreshold
                                ? "✅ APROVADO"
                                : "❌ NEGADO"
                            }`
                          );
                        }
                      } catch (error) {
                        console.error("❌ Erro no teste simples:", error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Teste Simples
                  </Button>
                </div>

                {/* Status do reconhecimento em tempo real */}
                <div className="text-center pt-4">
                  {personDetected ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-800">
                        Verificando Identidade...
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
                      ? "Verificando sua identidade..."
                      : "Posicione-se na frente da câmera para verificação automática"}
                  </p>
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
                        <Badge variant="default" className="text-xs">
                          {recognitionThreshold.toFixed(2)}
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
