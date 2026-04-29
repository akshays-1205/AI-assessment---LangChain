import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import SpeechInput from "../components/SpeechInput";

function extractQuestionOnly(text) {
  if (!text) return "";

  const expectedAnswerIndex = text.indexOf("**Expected Answer:**");
  const rawQuestion = expectedAnswerIndex >= 0 ? text.slice(0, expectedAnswerIndex) : text;

  return rawQuestion
    .replace(/^.*?\*\*Question:\*\*\s*/i, "")
    .replace(/^.*?Question:\s*/i, "")
    .trim();
}

export default function Assessment() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [answerText, setAnswerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [questionLimit, setQuestionLimit] = useState(null);
  const submittingRef = useRef(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const speakQuestion = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedSession = localStorage.getItem("session");
    const storedQuestion = extractQuestionOnly(localStorage.getItem("question") || "");
    const storedRole = localStorage.getItem("role") || "";
    const storedCompleted = localStorage.getItem("interviewCompleted") === "true";
    const storedEvaluation = localStorage.getItem("evaluation");

    if (!storedSession) {
      router.push("/");
      return;
    }

    const storedQuestionNumber = Number(localStorage.getItem("questionNumber")) || 1;
    const storedQuestionLimit = Number(localStorage.getItem("questionLimit")) || null;
    setSession(storedSession);
    setQuestion(storedQuestion);
    setRole(storedRole);
    setQuestionNumber(storedQuestionNumber);
    setQuestionLimit(storedQuestionLimit);
    setIsCompleted(storedCompleted);
  }, [router]);

  useEffect(() => {
    if (!voiceEnabled || isCompleted) {
      return;
    }

    const cleanQuestion = extractQuestionOnly(question);
    if (!cleanQuestion) {
      return;
    }

    speakQuestion(cleanQuestion);

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [question, voiceEnabled, isCompleted]);

  useEffect(() => {
    if (typeof window === "undefined" || !session) {
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setCameraError("Camera preview is not supported in this browser.");
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
        setCameraError("");
      } catch (cameraAccessError) {
        if (isMounted) {
          setCameraReady(false);
          setCameraError("Camera access is required for the proctored assessment preview.");
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [session]);

  const sendAnswer = async (text, redirectToResult = false) => {
    if (submittingRef.current || isCompleted) {
      return;
    }

    if (!session || !text) {
      setError("Please provide an answer before submitting.");
      return;
    }

    setError("");
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session, answer: text }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      const nextQuestion = data.completed ? (data.response || "") : extractQuestionOnly(data.response || "");
      const nextQuestionNumber = data.completed ? questionNumber : questionNumber + 1;
      setQuestion(nextQuestion);
      setQuestionNumber(nextQuestionNumber);
      localStorage.setItem("question", nextQuestion);
      localStorage.setItem("questionNumber", String(nextQuestionNumber));
      localStorage.setItem("interviewCompleted", data.completed ? "true" : "false");
      setIsCompleted(Boolean(data.completed));
      if (data.evaluation) {
        localStorage.setItem("evaluation", JSON.stringify(data.evaluation));
      }
      setAnswerText("");
      if (redirectToResult && data.completed) {
        router.push("/result");
      }
    } catch (err) {
      setError(err.message || "Unable to send answer.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <div className="hero-left">
          <div>
            <h1 className="card-title">Interview in progress</h1>
            <p className="card-copy">
              Answer the prompt below verbally or by typing, then submit to continue the conversation.
            </p>
          </div>
          <div className="card question-card">
            <h2 className="page-title">Current question</h2>
            <span className="question-badge">Q{questionNumber})</span>
            <p className="card-copy">
              {extractQuestionOnly(question) || "The first question will appear after you start the session."}
            </p>
          </div>
        </div>
        <div className="card proctor-card">
          <div className="proctor-header">
            <h2 className="page-title">Proctor view</h2>
            <span className={`status ${cameraReady ? "status-live" : "status-off"}`}>
              {cameraReady ? "Camera live" : "Camera unavailable"}
            </span>
          </div>
          <div className="proctor-body">
            <div className="proctor-video-shell">
              <video
                ref={videoRef}
                className="proctor-video"
                autoPlay
                muted
                playsInline
              />
            </div>
          </div>
          <p className="card-copy">
            Keep your face clearly visible during the assessment.
          </p>
          {cameraError && <div className="toast">{cameraError}</div>}
        </div>
      </section>

      {role && (
        <div className="card">
          <p className="page-subtitle">Role: {role}</p>
        </div>
      )}

      <div className="card text-card">
        <h2 className="page-title">Your answer</h2>

        <div className="input-row">
          <textarea
            rows={5}
            value={answerText}
            placeholder="Type your answer here..."
            onChange={(e) => setAnswerText(e.target.value)}
            disabled={isCompleted}
          />
          {questionLimit !== questionNumber && (
            <button
              type="button"
              className="button-secondary"
              onClick={() => sendAnswer(answerText)}
              disabled={isSubmitting || isCompleted || !answerText}
            >
              {isSubmitting ? "Sending..." : "Submit Answer"}
            </button>
          )}
        </div>

        <div className="input-inline input-footer">
          {!isCompleted && (
            <SpeechInput
              disabled={isSubmitting || isCompleted}
              onSubmit={(text) => {
                setAnswerText(text);
                if (questionLimit && questionNumber === questionLimit) {
                  sendAnswer(text, true);
                } else {
                  sendAnswer(text);
                }
              }}
            />
          )}
          {questionLimit && questionNumber === questionLimit && (
            <button
              type="button"
              className="button-primary"
              onClick={() => sendAnswer(answerText, true)}
              disabled={isSubmitting || !answerText}
            >
              Finish assessment
            </button>
          )}
        </div>
      </div>

      {error && <div className="toast">{error}</div>}

      <footer className="footer">Your session continues until you close the browser or clear local storage.</footer>
    </main>
  );
}
