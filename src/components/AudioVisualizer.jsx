import React, { useEffect, useRef } from "react";

const AudioVisualizer = ({ sourceRef, audioContextRef }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArray = useRef();

  useEffect(() => {
    if (!sourceRef.current || !audioContextRef.current) {
      console.log("sourceRef or audioContextRef not defined");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // ✅ Fixed size (square, not stretched)
    const size = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    const bufferLength = analyser.frequencyBinCount;
    dataArray.current = new Uint8Array(bufferLength);

    sourceRef.current.connect(analyser);
    analyser.connect(audioContextRef.current.destination);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray.current);

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = 80;
      const bars = 120;
      const step = (2 * Math.PI) / bars;

      for (let i = 0; i < bars; i++) {
        const value = dataArray.current[i] || 0;
        const barLength = Math.min(value / 2, 60);

        // 🔹 FIX: Even circular symmetry (no oval distortion)
        const angle = i * step - Math.PI / 2; // start at top (90°)
        const x1 = centerX + radius * Math.cos(angle);
        const y1 = centerY + radius * Math.sin(angle);
        const x2 = centerX + (radius + barLength) * Math.cos(angle);
        const y2 = centerY + (radius + barLength) * Math.sin(angle);

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "rgba(53, 82, 197, 1)");
        grad.addColorStop(1, "rgba(0, 200, 255, 1)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // ✅ optional inner circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    audioContextRef.current.resume().then(() => draw());

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-[300px] h-[300px] flex flex-col gap-y-4 items-center justify-center">
      {/* ⚠️ Important: do NOT stretch canvas */}
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{ width: "300px", height: "300px" }}
        className="absolute top-0 left-0 rounded-full"
      />
      <div className="w-[240px] h-[240px] bg-tayyab-avatar-new bg-cover rounded-full z-10 bg-black/70"></div>
      <div className="absolute bottom-[-40px] text-center font-semibold text-md">
        <p>Tayyib Speaking</p>
      </div>
    </div>
  );
};

export default AudioVisualizer;
