"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(0);
  const [detectionInterval, setDetectionInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [personDetected, setPersonDetected] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [popupCountdown, setPopupCountdown] = useState(3);

  // Monitora mudanças no popup para debug
  useEffect(() => {
    console.log("Estado do popup mudou:", popup);
  }, [popup]);

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

  // Ativa a webcam com requestAnimationFrame
  const startCamera = useCallback(async () => {
    try {
      console.log("Solicitando acesso à câmera...");
      setCameraError("");

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

        // Configura event listeners para detectar quando o vídeo para
        videoRef.current.onpause = () => {
          console.log("Vídeo pausado, retomando...");
          videoRef.current?.play();
        };

        videoRef.current.onended = () => {
          console.log("Vídeo terminou, reiniciando câmera...");
          setCameraActive(false);
          setCameraInitialized(false);
          startCamera();
        };

        setCameraActive(true);
        setCameraInitialized(true);
        console.log("Câmera ativada com sucesso!");

        // Sistema de keep alive usando requestAnimationFrame
        let animationId: number;

        const keepAlive = () => {
          if (videoRef.current && streamRef.current) {
            // Força o vídeo a continuar reproduzindo
            if (videoRef.current.paused) {
              console.log("Vídeo pausado, forçando retomada...");
              videoRef.current.play();
            }

            // Verifica se as tracks ainda estão ativas
            const tracks = streamRef.current.getVideoTracks();
            const activeTracks = tracks.filter(
              (track) => track.readyState === "live"
            );

            if (activeTracks.length === 0) {
              console.log("Câmera parou, reiniciando imediatamente...");
              if (animationId) {
                cancelAnimationFrame(animationId);
              }
              setCameraActive(false);
              setCameraInitialized(false);
              startCamera();
              return;
            }

            // Força a reprodução
            videoRef.current.play().catch(() => {
              console.log("Erro ao reproduzir, reiniciando câmera...");
              if (animationId) {
                cancelAnimationFrame(animationId);
              }
              setCameraActive(false);
              setCameraInitialized(false);
              startCamera();
              return;
            });

            // Continua o loop
            animationId = requestAnimationFrame(keepAlive);
          }
        };

        // Inicia o loop de keep alive
        animationId = requestAnimationFrame(keepAlive);

        // Armazena o animationId para limpeza
        if ((window as any).cameraAnimationId) {
          cancelAnimationFrame((window as any).cameraAnimationId);
        }
        (window as any).cameraAnimationId = animationId;
      }
    } catch (error) {
      console.error("Erro ao acessar webcam:", error);
      setCameraError(
        error instanceof Error ? error.message : "Erro desconhecido"
      );
    }
  }, []);

  // Inicia a câmera quando os modelos estiverem carregados
  useEffect(() => {
    if (modelsLoaded && !cameraActive && !cameraInitialized) {
      console.log("Modelos carregados, iniciando câmera...");
      startCamera();
    }
  }, [modelsLoaded, startCamera]);

  // Cleanup function melhorada
  useEffect(() => {
    return () => {
      console.log("Cleanup: parando stream e intervalos");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
          console.log("Parando track:", track.kind);
          track.stop();
        });
        streamRef.current = null;
      }
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
      if ((window as any).cameraKeepAliveInterval) {
        clearInterval((window as any).cameraKeepAliveInterval);
        (window as any).cameraKeepAliveInterval = null;
      }
      if ((window as any).cameraAnimationId) {
        cancelAnimationFrame((window as any).cameraAnimationId);
        (window as any).cameraAnimationId = null;
      }
    };
  }, [detectionInterval]);

  // Carrega descritores das imagens registradas
  useEffect(() => {
    if (!modelsLoaded) return;

    const loadImages = async () => {
      try {
        const descs: Descriptors[] = [];
        console.log("Carregando imagens registradas...");

        for (const reg of registeredImages) {
          try {
            const img = await faceapi.fetchImage(reg.src);
            const detection = await faceapi
              .detectSingleFace(
                img,
                new faceapi.TinyFaceDetectorOptions({
                  inputSize: 416,
                  scoreThreshold: 0.3,
                })
              )
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection) {
              descs.push({ name: reg.name, descriptor: detection.descriptor });
              console.log(`Imagem carregada: ${reg.name}`);
            } else {
              console.warn(`Nenhum rosto detectado em: ${reg.src}`);
            }
          } catch (error) {
            console.error(`Erro ao carregar imagem ${reg.src}:`, error);
          }
        }

        setDescriptors(descs);
        console.log(`Total de descritores carregados: ${descs.length}`);

        if (descs.length === 0) {
          setPopup({
            open: true,
            msg: "Nenhuma imagem registrada foi carregada. Verifique se as fotos estão na pasta /public/registered",
            type: "warning",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar imagens:", error);
        setPopup({
          open: true,
          msg: "Erro ao carregar imagens registradas.",
          type: "error",
        });
      }
    };

    loadImages();
  }, [modelsLoaded]);

  // Inicia o reconhecimento em tempo real quando tudo estiver carregado
  useEffect(() => {
    if (!modelsLoaded || descriptors.length === 0 || !cameraActive) return;

    console.log("Iniciando reconhecimento em tempo real...");

    // Limpa intervalo anterior se existir
    if (detectionInterval) {
      clearInterval(detectionInterval);
    }

    // Pequeno delay para garantir que a câmera esteja totalmente pronta
    const startDelay = setTimeout(() => {
      // Inicia verificação a cada 1 segundo (mais rápido para fluxo intenso)
      const interval = setInterval(() => {
        performFaceRecognition();
      }, 1000);

      setDetectionInterval(interval);
    }, 2000); // 2 segundos de delay inicial

    // Cleanup
    return () => {
      clearTimeout(startDelay);
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [modelsLoaded, descriptors.length, cameraActive]);

  // Função para verificar acesso em tempo real
  const performFaceRecognition = async () => {
    if (!videoRef.current || descriptors.length === 0 || isProcessing) {
      return;
    }

    // Evita verificações muito frequentes (mínimo 1 segundo entre verificações)
    const now = Date.now();
    if (now - lastDetectionTime < 1000) {
      return;
    }

    setIsProcessing(true);

    try {
      // Verifica se o vídeo está pronto antes de analisar
      if (
        videoRef.current.videoWidth === 0 ||
        videoRef.current.videoHeight === 0
      ) {
        console.log("Vídeo ainda não está pronto");
        return;
      }

      // Verifica se a câmera está tampada ou com imagem muito escura
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      try {
        ctx.drawImage(videoRef.current, 0, 0);
      } catch (error) {
        console.log("Erro ao desenhar imagem no canvas:", error);
        return;
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calcula o brilho médio da imagem
      let totalBrightness = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
      }
      const averageBrightness = totalBrightness / (data.length / 4);

      // Se a imagem está muito escura (câmera tampada), não processa
      if (averageBrightness < 30) {
        console.log(
          `Câmera tampada ou muito escura - brilho: ${averageBrightness.toFixed(
            1
          )}`
        );
        setPersonDetected(false);
        return;
      }

      // Verifica se há variação suficiente na imagem (evita imagens estáticas)
      let variance = 0;
      const mean = averageBrightness;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        variance += Math.pow(brightness - mean, 2);
      }
      variance = variance / (data.length / 4);

      // Se a variação é muito baixa (imagem muito uniforme), pode estar tampada
      if (variance < 100) {
        console.log(`Imagem muito uniforme - variação: ${variance.toFixed(1)}`);
        setPersonDetected(false);
        return;
      }

      // Detecta rosto na webcam com parâmetros otimizados para velocidade
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416, // Aumentado para melhor precisão
            scoreThreshold: 0.3, // Threshold mais baixo para detectar mais rostos
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        console.log("Nenhum rosto detectado");
        setPersonDetected(false);
        return;
      }

      // Verifica se o rosto detectado tem qualidade mínima (menos restritivo)
      if (detection.detection.score < 0.3) {
        console.log(
          `Rosto detectado com baixa confiança: ${detection.detection.score.toFixed(
            3
          )}`
        );
        setPersonDetected(false);
        return;
      }

      console.log(
        `Rosto detectado com confiança: ${detection.detection.score.toFixed(3)}`
      );
      setPersonDetected(true);
      console.log("Iniciando comparação com descritores registrados...");

      // Compara com os descritores registrados
      let minDist = 1;
      let foundName = "";

      for (const desc of descriptors) {
        const dist = faceapi.euclideanDistance(
          detection.descriptor,
          desc.descriptor
        );
        if (dist < minDist) {
          minDist = dist;
          foundName = desc.name;
        }
      }

      console.log(`Distância mínima: ${minDist.toFixed(4)}`);

      // Threshold otimizado para alta precisão e velocidade
      if (minDist < 0.5) {
        setLastDetectionTime(now);
        console.log(
          `ACESSO LIBERADO - Definindo popup de sucesso para: ${foundName}`
        );
        setPopup({
          open: true,
          msg: `Bem-vindo(a), ${foundName}!`,
          type: "success",
        });
        autoClosePopup(); // Fecha automaticamente após 3 segundos
        console.log(
          `Acesso liberado para: ${foundName} (distância: ${minDist.toFixed(
            4
          )})`
        );
      } else if (minDist < 0.7) {
        // Só mostra popup de negação se a pessoa estiver relativamente próxima
        setLastDetectionTime(now);
        console.log(`ACESSO NEGADO - Definindo popup de erro`);
        setPopup({
          open: true,
          msg: "Você não possui ingresso válido para este jogo.",
          type: "error",
        });
        autoClosePopup(); // Fecha automaticamente após 3 segundos
        console.log(
          `Acesso negado - pessoa não reconhecida (melhor distância: ${minDist.toFixed(
            4
          )})`
        );
      } else {
        // Se a distância for muito alta, não mostra popup (pessoa não registrada)
        setLastDetectionTime(now);
        console.log(
          `Pessoa não registrada - sem popup (distância: ${minDist.toFixed(4)})`
        );
      }
    } catch (error) {
      console.error("Erro durante verificação:", error);
      setPersonDetected(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Função para verificar acesso (mantida para compatibilidade)
  const handleCheckAccess = async () => {
    await performFaceRecognition();
  };

  // Função para fechar popup
  const closePopup = () => {
    console.log("Fechando popup");
    setPopup({ open: false, msg: "", type: "warning" });
    setPopupCountdown(3); // Reseta a contagem
  };

  // Função para fechar popup automaticamente
  const autoClosePopup = () => {
    setPopupCountdown(3);

    const countdownInterval = setInterval(() => {
      setPopupCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          closePopup();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Função para reiniciar a câmera
  const restartCamera = async () => {
    console.log("Reiniciando câmera...");

    // Para o stream atual
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Limpa o vídeo
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reseta estados
    setCameraActive(false);
    setCameraError("");
    setPersonDetected(false);
    setCameraInitialized(false);

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
