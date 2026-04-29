import { useState, useEffect, useRef } from "react";

export default function MicCheck({ onStatusChange }) {
  const [status, setStatus] = useState("not_checked"); // not_checked, checking, low, ok
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const samplesRef = useRef([]);

  const startCheck = async () => {
    try {
      setStatus("checking");
      samplesRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setVolume(average);
        samplesRef.current.push(average);
        
        if (samplesRef.current.length < 150) { // Approx 3 seconds at 60fps
          animationRef.current = requestAnimationFrame(checkVolume);
        } else {
          stopCheck();
        }
      };
      
      animationRef.current = requestAnimationFrame(checkVolume);
    } catch (error) {
      console.error("Mic check error:", error);
      setStatus("error");
      onStatusChange(false);
    }
  };

  const stopCheck = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    const avgVolume = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
    console.log("Average volume during check:", avgVolume);
    
    if (avgVolume > 15) { // Threshold for "Low"
      setStatus("ok");
      onStatusChange(true);
    } else {
      setStatus("low");
      onStatusChange(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.95rem", color: "var(--muted)" }}>Microphone Test</span>
        <button 
          className="button-secondary" 
          style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          onClick={startCheck}
          disabled={status === "checking"}
        >
          {status === "checking" ? "Checking..." : "Test Mic"}
        </button>
      </div>
      
      {status === "checking" && (
        <div style={{ height: "4px", width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(volume / 128) * 100}%`, background: "var(--accent)", transition: "width 0.1s ease" }} />
        </div>
      )}

      {status === "ok" && (
        <div className="status status-live" style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}>
          ✓ Mic level is good
        </div>
      )}

      {status === "low" && (
        <div className="status status-off" style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}>
          ⚠ Mic input is too low. Please check.
        </div>
      )}

      {status === "error" && (
        <div className="status status-off" style={{ marginTop: "0.5rem", width: "100%", justifyContent: "center" }}>
          ⚠ Could not access microphone.
        </div>
      )}
      
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
        Speak into your microphone for 3 seconds after clicking "Test Mic".
      </p>
    </div>
  );
}
