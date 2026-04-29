export default function SpeechInput({ onSubmit, disabled = false }) {
  const speak = async () => {
    if (disabled) {
      return;
    }

    const recognition =
      window?.SpeechRecognition ||
      window?.webkitSpeechRecognition ||
      window?.mozSpeechRecognition ||
      window?.msSpeechRecognition;

    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(
        "Microphone access is not available in this browser. Please use a browser that supports getUserMedia."
      );
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
      console.error("Microphone permission error:", error);
      alert(
        "Please allow microphone access, then try again. If the prompt does not appear, check your browser settings."
      );
      return;
    }

    const rec = new recognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (event) => {
      onSubmit(event.results[0][0].transcript);
    };
    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error || event);
      if (event.error === "not-allowed" || event.error === "permission_denied") {
        alert(
          "Microphone access was denied. Please allow it in your browser and refresh the page."
        );
      } else if (event.error === "no-speech") {
        alert("No speech was detected. Please try speaking more clearly.");
      } else {
        alert(
          "Unable to capture speech. Please make sure microphone access is enabled and try again."
        );
      }
    };
    rec.onend = () => {
      console.log("Speech recognition ended.");
    };

    try {
      rec.start();
    } catch (error) {
      console.error("Speech recognition start failed:", error);
      alert(
        "Speech recognition could not start. Please refresh the page and try again."
      );
    }
  };

  return (
    <button type="button" className="button-primary" onClick={speak} disabled={disabled}>
      Speak Answer
    </button>
  );
}
