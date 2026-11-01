
import { useState } from "react";
import { Wallet, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signup } from "../services/authService";

function Signup({ onSignup, onLoginClick }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await signup({ fullName, email, password });
      onSignup(data.user);
    } catch (err) {
      setError(
        err.response?.data?.message || "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl border border-[#263449] bg-[#172235] p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#10b981] text-[#0b1120]">
            <Wallet size={28} />
          </div>

          <h1 className="text-3xl font-bold text-white">
            Spend<span className="text-[#10b981]">Wise</span>
          </h1>

          <p className="mt-2 text-sm text-[#94a3b8]">
            Start managing your finances smarter.
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white">
            Create account
          </h2>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Enter your details to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#cbd5e1]">
              Full name
            </label>

            <div className="flex items-center rounded-lg border border-[#263449] bg-[#0b1120] px-3">
              <User size={18} className="text-[#94a3b8]" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-transparent p-3 text-white outline-none placeholder:text-[#64748b]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-[#cbd5e1]">
              Email address
            </label>

            <div className="flex items-center rounded-lg border border-[#263449] bg-[#0b1120] px-3">
              <Mail size={18} className="text-[#94a3b8]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-transparent p-3 text-white outline-none placeholder:text-[#64748b]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-[#cbd5e1]">
              Password
            </label>

            <div className="flex items-center rounded-lg border border-[#263449] bg-[#0b1120] px-3">
              <Lock size={18} className="text-[#94a3b8]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-transparent p-3 text-white outline-none placeholder:text-[#64748b]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#94a3b8]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#10b981] py-3 font-semibold text-[#0b1120] transition hover:bg-[#059669] disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#94a3b8]">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onLoginClick}
            className="font-semibold text-[#10b981] hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
