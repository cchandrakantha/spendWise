
import { useEffect, useState } from "react";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getAccounts } from "../services/accountService";
import { getCategories } from "../services/categoryService";
import { createTransaction } from "../services/transactionService";

function AddTransactionModal({ onClose, onSuccess }) {
  const [type, setType] = useState("EXPENSE");
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    accountId: "",
    categoryId: "",
    amount: "",
    transactionDate: new Date().toLocaleDateString("en-CA"),
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accountData, categoryData] = await Promise.all([
          getAccounts(),
          getCategories(),
        ]);

        const activeAccounts = accountData.accounts || [];
        setAccounts(activeAccounts);
        setCategories(categoryData.categories || []);

        if (activeAccounts.length > 0) {
          setForm((previous) => ({
            ...previous,
            accountId: activeAccounts[0].accountId,
          }));
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load accounts and categories."
        );
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredCategories = categories.filter(
    (category) => category.categoryType === type
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setForm((previous) => ({
      ...previous,
      categoryId: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.accountId) {
      setError("Please select an account.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      setLoading(true);

      await createTransaction({
        accountId: form.accountId,
        categoryId: form.categoryId || null,
        transactionType: type,
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
        description: form.description.trim(),
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create transaction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#263449] bg-[#172235] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Add Transaction
            </h2>
            <p className="mt-1 text-sm text-[#94a3b8]">
              Record your income or expenses.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#263449]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleTypeChange("EXPENSE")}
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold transition ${
              type === "EXPENSE"
                ? "border-red-500 bg-red-500/10 text-red-400"
                : "border-[#263449] text-[#94a3b8]"
            }`}
          >
            <ArrowUpRight size={18} />
            Expense
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("INCOME")}
            className={`flex items-center justify-center gap-2 rounded-xl border p-3 font-semibold transition ${
              type === "INCOME"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                : "border-[#263449] text-[#94a3b8]"
            }`}
          >
            <ArrowDownLeft size={18} />
            Income
          </button>
        </div>

        {dataLoading ? (
          <p className="py-8 text-center text-[#94a3b8]">
            Loading account information...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-[#cbd5e1]">
                Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-[#263449] bg-[#0b1120] p-3 text-white outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#cbd5e1]">
                Account
              </label>
              <select
                name="accountId"
                required
                value={form.accountId}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#263449] bg-[#0b1120] p-3 text-white outline-none"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option
                    key={account.accountId}
                    value={account.accountId}
                  >
                    {account.accountName} ({account.accountType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#cbd5e1]">
                Category
              </label>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#263449] bg-[#0b1120] p-3 text-white outline-none"
              >
                <option value="">Select category (optional)</option>
                {filteredCategories.map((category) => (
                  <option
                    key={category.categoryId}
                    value={category.categoryId}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#cbd5e1]">
                Transaction Date
              </label>
              <input
                type="date"
                name="transactionDate"
                required
                value={form.transactionDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-[#263449] bg-[#0b1120] p-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#cbd5e1]">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="e.g. Grocery shopping"
                className="w-full rounded-lg border border-[#263449] bg-[#0b1120] p-3 text-white outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-[#263449] py-3 font-semibold text-[#cbd5e1] hover:bg-[#263449]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || accounts.length === 0}
                className="flex-1 rounded-lg bg-[#10b981] py-3 font-semibold text-[#0b1120] hover:bg-[#059669] disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Transaction"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddTransactionModal;

