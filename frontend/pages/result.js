import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const scoreLabels = [
  { key: "knowledge", title: "Knowledge" },
  { key: "communication", title: "Communication" },
  { key: "problem_solving", title: "Problem Solving" },
];

export default function Result() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEvaluation = localStorage.getItem("evaluation");
    const storedRole = localStorage.getItem("role") || "";

    if (!storedEvaluation) {
      router.push("/");
      return;
    }

    try {
      setEvaluation(JSON.parse(storedEvaluation));
      setRole(storedRole);
    } catch {
      router.push("/");
    }
  }, [router]);

  if (!evaluation) {
    return null;
  }

  return (
    <main className="container">
      <section className="hero">
        <div>
          <h1 className="card-title">Interview evaluation</h1>
          <p className="card-copy">
            {role ? `Assessment summary for ${role}.` : "Assessment summary."}
          </p>
        </div>
      </section>

      <div className="form-grid">
        {scoreLabels.map(({ key, title }) => (
          <div className="card" key={key}>
            <h2 className="page-title">{title}</h2>
            <p className="card-title">{evaluation[key]}/10</p>
          </div>
        ))}
      </div>

      <div className="card">
        <button
          type="button"
          className="button-primary"
          onClick={() => {
            localStorage.removeItem("session");
            localStorage.removeItem("question");
            localStorage.removeItem("role");
            localStorage.removeItem("questionLimit");
            localStorage.removeItem("interviewCompleted");
            localStorage.removeItem("evaluation");
            router.push("/");
          }}
        >
          Start New Interview
        </button>
      </div>
    </main>
  );
}
