import { useState } from "react";
import { useRouter } from "next/router";
import { FaCogs, FaEnvelope, FaLock, FaSignInAlt } from "react-icons/fa";
import { apiPost } from "../lib/apiClient";
import { verifyAuth } from "../middlewares/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email et mot de passe sont obligatoires.");
      return;
    }
    setError("");
    setLoading(true);
    apiPost("/api/auth/login", { email: email.trim(), password })
      .then(() => router.push("/"))
      .catch((err) => {
        setError(err.message || "Erreur de connexion.");
        setLoading(false);
      });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#EEF1F6]">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-[#0B1526] flex items-center justify-center mb-2">
            <FaCogs className="text-white text-xl" />
          </div>
          <span className="text-xl font-bold tracking-wide text-gray-800">
            MES <span className="font-extrabold">PERFORMANCE</span>
          </span>
          <span className="text-sm text-gray-400 mt-1">Connectez-vous à votre espace</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-500">Email</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 mt-1">
              <FaEnvelope className="text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@gmail.com"
                className="text-base outline-none flex-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-500">Mot de passe</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 mt-1">
              <FaLock className="text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="text-base outline-none flex-1"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white text-base font-semibold py-2 rounded-md mt-2 disabled:opacity-60 hover:bg-blue-700 transition-colors"
          >
            <FaSignInAlt />
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export async function getServerSideProps({ req, res }) {
  const user = verifyAuth(req, res);
  if (user && user.id) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }
  return { props: {} };
}