import React, { useEffect, useRef } from "react";
import { handleAudioError } from "../utils/utilities";

const AudioVisualizer = ({ sourceRef, audioContextRef }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArray = useRef(Uint8Array);

  useEffect(() => {
    if (!sourceRef.current || !audioContextRef.current) {
      console.log("sourceref or audiocontext ref not defined");
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    dataArray.current = new Uint8Array(analyser.frequencyBinCount);

    sourceRef.current.connect(analyser);
    analyser.connect(audioContextRef.current.destination);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray.current);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 60;

      const bars = 100;
      const slice = (2 * Math.PI) / bars;

      for (let i = 0; i < bars; i++) {
        const value = dataArray.current[i] || 0;
        const barLength = value / 4;

        const angle = i * slice;
        const x1 = centerX + radius * Math.cos(angle);
        const y1 = centerY + radius * Math.sin(angle);
        const x2 = centerX + (radius + barLength) * Math.cos(angle);
        const y2 = centerY + (radius + barLength) * Math.sin(angle);

        // Gradient with no transparent background
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "rgba(53, 82, 197, 1)"); // start solid
        grad.addColorStop(1, "rgba(0, 200, 255, 1)"); // end solid

        ctx.strokeStyle = grad;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Glow effect
        // ctx.shadowBlur = 20;
        // ctx.shadowColor = "rgba(0,255,170,0.8)";

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    audioContextRef.current.resume().then(() => {
      draw();
    });

    return () => {
      cancelAnimationFrame(animationRef.current);

      try {
        return () => {
          if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
          }
        };
      } catch (err) {
        console.warn("error during audio cleanup:", err);
      }
    };
  }, []);

  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center">
      {/* Canvas - transparent background */}
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="absolute top-0 left-0 w-full h-full rounded-full bg-transparent"
      />

      {/* Hollow circle in center */}
      <div className="w-[160px] h-[160px] bg-tayyab-avatar-new bg-cover rounded-full border-[4px] border-white z-10 bg-black/70"></div>

      {/* Label below */}
      <div className="absolute bottom-[-40px] text-center font-semibold text-md">
        <p>Musa Speaking</p>
      </div>
    </div>
  );
};

export default AudioVisualizer;
