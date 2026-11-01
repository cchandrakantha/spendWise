
import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";

import {
  getBudgetOverview,
  createBudget,
} from "../services/budgetService";

import { getCategories } from "../services/categoryService";

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const monthNames = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

export default function BudgetsPage() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [overview, setOverview] = useState([]);
  const [summary, setSummary] = useState({
    totalBudget: 0,
    totalSpent: 0,
    remaining: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    categoryId: "",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    budgetAmount: "",
  });

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getBudgetOverview(year, month);

      setOverview(response.overview || []);
      setSummary(response.summary || {
        totalBudget: 0,
        totalSpent: 0,
        remaining: 0,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load budget information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, [year, month]);

  const openCreateModal = async () => {
    setFormError("");
    setSuccessMessage("");
    setForm({
      categoryId: "",
      year,
      month,
      budgetAmount: "",
    });

    setShowModal(true);
    setCategoriesLoading(true);

    try {
      const response = await getCategories();

      const availableCategories =
        response.categories ||
        response.data?.categories ||
        [];

      setCategories(
        availableCategories.filter(
          (category) =>
            category.categoryType === "EXPENSE" &&
            category.isActive
        )
      );
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        "Unable to load expense categories."
      );
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const amount = Number(form.budgetAmount);

    if (!form.categoryId) {
      setFormError("Please select an expense category.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid budget amount.");
      return;
    }

    if (Math.round(amount * 100) !== amount * 100) {
      setFormError("Budget amount can have at most two decimal places.");
      return;
    }

    try {
      setSaving(true);

      await createBudget({
        categoryId: form.categoryId,
        year: Number(form.year),
        month: Number(form.month),
        budgetAmount: amount,
      });

      setSuccessMessage("Budget created successfully!");

      // Refresh the selected month if the new budget belongs to it.
      if (Number(form.year) === year && Number(form.month) === month) {
        await loadBudgets();
      }

      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage("");
      }, 900);
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        "Unable to create budget."
      );
    } finally {
      setSaving(false);
    }
  };

  const utilization =
    summary.totalBudget > 0
      ? Math.min(
          (summary.totalSpent / summary.totalBudget) * 100,
          100
        )
      : 0;

  return (
    <div className="budgets-page">
      <div className="budgets-page-header">
        <div>
          <h2>Budget Management</h2>
          <p>Plan your spending and stay in control of your finances.</p>
        </div>

        <div className="budget-header-actions">
          <button
            className="budget-create-button"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Create Budget
          </button>

          <div className="budget-month-picker">
            <CalendarDays size={17} />

            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                (value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="budget-empty-state">
          <RefreshCw className="budget-spinner" size={24} />
          <p>Loading your budget overview...</p>
        </div>
      ) : error ? (
        <div className="budget-empty-state budget-error">
          <AlertTriangle size={25} />
          <p>{error}</p>
          <button onClick={loadBudgets}>Try Again</button>
        </div>
      ) : (
        <>
          <div className="budget-summary-grid">
            <div className="budget-summary-card">
              <div className="budget-card-top">
                <span>Total Budget</span>
                <div className="budget-card-icon blue">
                  <Wallet size={19} />
                </div>
              </div>
              <h3>{currency(summary.totalBudget)}</h3>
              <p>Allocated for {monthNames[month - 1]}</p>
            </div>

            <div className="budget-summary-card">
              <div className="budget-card-top">
                <span>Total Spent</span>
                <div className="budget-card-icon amber">
                  <TrendingUp size={19} />
                </div>
              </div>
              <h3>{currency(summary.totalSpent)}</h3>
              <p>Completed expenses</p>
            </div>

            <div className="budget-summary-card">
              <div className="budget-card-top">
                <span>Remaining Budget</span>
                <div className="budget-card-icon green">
                  <TrendingDown size={19} />
                </div>
              </div>
              <h3 className={summary.remaining < 0 ? "budget-negative" : "budget-positive"}>
                {currency(summary.remaining)}
              </h3>
              <p>
                {summary.remaining < 0
                  ? "Amount over budget"
                  : "Available to spend"}
              </p>
            </div>

            <div className="budget-summary-card">
              <div className="budget-card-top">
                <span>Overall Usage</span>
                <div className="budget-card-icon purple">
                  <CalendarDays size={19} />
                </div>
              </div>
              <h3>{utilization.toFixed(1)}%</h3>
              <p>Budget utilization</p>
            </div>
          </div>

          <div className="budget-overview-panel">
            <div className="budget-section-heading">
              <div>
                <h3>Monthly Budget Overview</h3>
                <p>Overall spending against your allocated budget</p>
              </div>
              <span>{monthNames[month - 1]} {year}</span>
            </div>

            <div className="budget-progress-track overall">
              <div
                className={`budget-progress-fill ${
                  summary.remaining < 0 ? "over" : ""
                }`}
                style={{ width: `${utilization}%` }}
              />
            </div>

            <div className="budget-progress-labels">
              <span>Spent: {currency(summary.totalSpent)}</span>
              <span>Budget: {currency(summary.totalBudget)}</span>
            </div>
          </div>

          <div className="budget-categories-panel">
            <div className="budget-section-heading">
              <div>
                <h3>Category Budgets</h3>
                <p>Monitor spending category by category</p>
              </div>
              <span>{overview.length} categories</span>
            </div>

            {overview.length === 0 ? (
              <div className="budget-empty-state">
                <Wallet size={30} />
                <h3>No budgets found</h3>
                <p>
                  You haven't created any budgets for this month yet.
                </p>
                <button
                  className="budget-create-button"
                  onClick={openCreateModal}
                >
                  <Plus size={16} />
                  Create Your First Budget
                </button>
              </div>
            ) : (
              <div className="budget-category-list">
                {overview.map((item) => {
                  const percentage = Number(
                    item.utilizationPercentage || 0
                  );

                  const isOver = item.status === "OVER_BUDGET";

                  return (
                    <div className="budget-category-card" key={item.budgetId}>
                      <div className="budget-category-top">
                        <div>
                          <h4>{item.categoryName}</h4>
                          <p>
                            {currency(item.actualSpent)} spent of{" "}
                            {currency(item.budgetAmount)}
                          </p>
                        </div>

                        <span
                          className={`budget-status ${
                            isOver ? "over" : "within"
                          }`}
                        >
                          {isOver ? "Over Budget" : "Within Budget"}
                        </span>
                      </div>

                      <div className="budget-progress-track">
                        <div
                          className={`budget-progress-fill ${
                            isOver ? "over" : ""
                          }`}
                          style={{
                            width: `${Math.min(percentage, 100)}%`,
                          }}
                        />
                      </div>

                      <div className="budget-category-bottom">
                        <span>{percentage.toFixed(1)}% used</span>
                        <strong className={isOver ? "budget-negative" : "budget-positive"}>
                          {currency(item.remaining)}{" "}
                          {isOver ? "over budget" : "remaining"}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <div className="budget-modal-overlay">
          <div className="budget-modal">
            <div className="budget-modal-header">
              <div>
                <h3>Create New Budget</h3>
                <p>Set a spending limit for an expense category.</p>
              </div>

              <button
                type="button"
                className="budget-modal-close"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBudget}>
              <div className="budget-form-group">
                <label>Expense Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  required
                  disabled={categoriesLoading}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories..."
                      : "Select a category"}
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.categoryId}
                      value={category.categoryId}
                    >
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="budget-form-row">
                <div className="budget-form-group">
                  <label>Month</label>
                  <select
                    value={form.month}
                    onChange={(e) =>
                      setForm({ ...form, month: Number(e.target.value) })
                    }
                  >
                    {monthNames.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="budget-form-group">
                  <label>Year</label>
                  <select
                    value={form.year}
                    onChange={(e) =>
                      setForm({ ...form, year: Number(e.target.value) })
                    }
                  >
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="budget-form-group">
                <label>Budget Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter amount"
                  value={form.budgetAmount}
                  onChange={(e) =>
                    setForm({ ...form, budgetAmount: e.target.value })
                  }
                  required
                />
              </div>

              {formError && (
                <div className="budget-form-error">
                  <AlertTriangle size={16} />
                  {formError}
                </div>
              )}

              {successMessage && (
                <div className="budget-form-success">
                  {successMessage}
                </div>
              )}

              <div className="budget-modal-actions">
                <button
                  type="button"
                  className="budget-cancel-button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="budget-create-button"
                  disabled={saving || categoriesLoading}
                >
                  {saving ? "Creating..." : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
