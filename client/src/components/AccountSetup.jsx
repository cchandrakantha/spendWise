
import { useState } from "react";
import { Wallet, ArrowRight, Loader2 } from "lucide-react";
import { createAccount } from "../services/accountService";

function AccountSetup({ onAccountCreated }) {
  const [formData, setFormData] = useState({
    accountName: "My Savings Account",
    accountType: "SAVINGS",
    openingBalance: "",
    currency: "INR",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.accountName.trim()) {
      setError("Please enter an account name.");
      return;
    }

    if (
      formData.openingBalance === "" ||
      !Number.isFinite(Number(formData.openingBalance)) ||
      Number(formData.openingBalance) < 0
    ) {
      setError("Please enter a valid opening balance.");
      return;
    }

    try {
      setLoading(true);

      await createAccount({
        ...formData,
        accountName: formData.accountName.trim(),
        openingBalance: Number(formData.openingBalance),
      });

      onAccountCreated();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
            <Wallet size={28} className="text-emerald-400" />
          </div>

          <h1 className="text-3xl font-bold text-white">
            Set up your account
          </h1>

          <p className="text-slate-400 mt-3">
            Let's start by adding your bank or wallet balance.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#172235] border border-[#263449] rounded-2xl p-7 space-y-5"
        >
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Account Name
            </label>
            <input
              type="text"
              name="accountName"
              value={formData.accountName}
              onChange={handleChange}
              placeholder="e.g. My Savings Account"
              className="w-full bg-[#0b1120] border border-[#263449] rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Account Type
            </label>
            <select
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
              className="w-full bg-[#0b1120] border border-[#263449] rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
            >
              <option value="SAVINGS">Savings Account</option>
              <option value="CURRENT">Current Account</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="WALLET">Digital Wallet</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Opening Balance (₹)
            </label>
            <input
              type="number"
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              placeholder="Enter your current balance"
              min="0"
              step="0.01"
              className="w-full bg-[#0b1120] border border-[#263449] rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              Enter the amount currently available in this account.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-lg py-3 transition"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          Your financial information is securely linked to your account.
        </p>
      </div>
    </div>
  );
}

export default AccountSetup;
