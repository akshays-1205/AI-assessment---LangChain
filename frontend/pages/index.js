import { useState } from "react";
import { useRouter } from "next/router";
import MicCheck from "../components/MicCheck";

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [questionLimit, setQuestionLimit] = useState("5");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMicOk, setIsMicOk] = useState(false);

  const start = async () => {
    if (!file || !email || !role || !questionLimit) {
      setError("Please complete all fields before continuing.");
      return;
    }

    if (!isMicOk) {
      setError("Please pass the microphone test before starting.");
      return;
    }

    const parsedQuestionLimit = Number.parseInt(questionLimit, 10);
    if (Number.isNaN(parsedQuestionLimit) || parsedQuestionLimit < 1) {
      setError("Please enter a valid number of questions.");
      return;
    }

    setError("");
    setLoading(true);

    const form = new FormData();
    form.append("email", email);
    form.append("role", role);
    form.append("question_limit", String(parsedQuestionLimit));
    form.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/start", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem("session", data.session_id);
      localStorage.setItem("question", data.question || "");
      localStorage.setItem("questionNumber", "1");
      localStorage.setItem("role", role);
      localStorage.setItem("questionLimit", String(data.question_limit || parsedQuestionLimit));
      localStorage.setItem("interviewCompleted", "false");
      localStorage.removeItem("evaluation");
      router.push("/assessment");
    } catch (err) {
      setError(err.message || "Unable to start session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <section className="hero">
        <div>
          <h1 className="card-title">AI Interviewer</h1>
          <p className="card-copy">
            Upload your resume, set your target role, and start a mock technical interview powered by LangChain and Groq.
          </p>
        </div>
        <div className="card">
          <h2 className="page-title">Get started</h2>
          <p className="page-subtitle">Complete the form below to begin your interview session.</p>
          <div className="form-grid">
            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label>Role</label>
              <input
                type="text"
                value={role}
                placeholder="Software Engineer"
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
            <div>
              <label>Resume</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <label>Questions</label>
              <input
                type="number"
                min="1"
                value={questionLimit}
                placeholder="5"
                onChange={(e) => setQuestionLimit(e.target.value)}
              />
            </div>
          </div>
          <MicCheck onStatusChange={(ok) => setIsMicOk(ok)} />
          {error && <div className="toast" style={{ marginTop: "1rem" }}>{error}</div>}
          <button 
            className="button-primary" 
            style={{ width: "100%", marginTop: "1rem" }} 
            onClick={start} 
            disabled={loading || !isMicOk}
          >
            {loading ? "Starting session..." : "Launch Interview"}
          </button>
        </div>
      </section>
      <div className="card">
        <h2 className="page-title">How it works</h2>
        <p className="card-copy">
          Your uploaded resume is summarized, then the AI interviewer asks the exact number of questions you choose here. It can ask up to two follow-up questions on one topic before moving to another, and the final page scores your responses.
        </p>
      </div>
      <footer className="footer">Save your session ID in your browser to keep the conversation going.</footer>
    </main>
  );
}
