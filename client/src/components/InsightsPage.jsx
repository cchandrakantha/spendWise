
import React, { useEffect, useState } from "react";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  Wallet,
  RefreshCw,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { getInsights } from "../services/insightService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatFrequency = (value) => {
  if (!value) return "Recurring";
  return value.charAt(0) + value.slice(1).toLowerCase();
};

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [analysis, setAnalysis] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getInsights();

      setInsights(response.insights || []);
      setAnalysis(response.analysis || {});
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load insights. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  const budgetWarnings = analysis.budgetWarnings || [];
  const upcomingPayments = analysis.upcomingPayments || [];
  const highestCategory = analysis.highestSpendingCategory;

  const monthName = analysis.month
    ? new Date(analysis.year, analysis.month - 1).toLocaleString("en-IN", {
        month: "long",
      })
    : "Current Month";

  if (loading) {
    return (
      <div className="insights-loading">
        <RefreshCw className="spin" size={24} />
        <p>Analyzing your finances...</p>
      </div>
    );
  }

  return (
    <div className="insights-page">
      <div className="insights-heading">
        <div>
          <p className="insights-eyebrow">
            <Sparkles size={13} /> FINANCIAL INTELLIGENCE
          </p>
          <h2>Insights</h2>
          <p className="insights-subtitle">
            Understand your spending patterns and stay ahead of your finances.
          </p>
        </div>

        <button className="insights-refresh" onClick={loadInsights}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="insights-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="insights-month-banner">
        <div className="insights-month-icon">
          <CalendarDays size={21} />
        </div>
        <div>
          <span>Financial overview</span>
          <h3>
            {monthName} {analysis.year || ""}
          </h3>
        </div>
      </div>

      <div className="insights-overview-grid">
        <div className="insight-overview-card">
          <div className="insight-card-icon purple">
            <TrendingUp size={21} />
          </div>
          <div>
            <p>Highest Spending Category</p>
            <h3>
              {highestCategory?.categoryName || "No data yet"}
            </h3>
            <span>
              {highestCategory
                ? formatCurrency(highestCategory.totalSpent)
                : "No categorized expenses this month"}
            </span>
          </div>
        </div>

        <div className="insight-overview-card">
          <div className="insight-card-icon warning">
            <AlertTriangle size={21} />
          </div>
          <div>
            <p>Budget Warnings</p>
            <h3>{budgetWarnings.length}</h3>
            <span>
              {budgetWarnings.length
                ? "Categories exceeding budget"
                : "No budget overruns detected"}
            </span>
          </div>
        </div>

        <div className="insight-overview-card">
          <div className="insight-card-icon blue">
            <CalendarDays size={21} />
          </div>
          <div>
            <p>Upcoming Payments</p>
            <h3>{upcomingPayments.length}</h3>
            <span>Due within the next 7 days</span>
          </div>
        </div>

        <div className="insight-overview-card">
          <div className="insight-card-icon green">
            <Lightbulb size={21} />
          </div>
          <div>
            <p>Saved Insights</p>
            <h3>{insights.length}</h3>
            <span>Available financial insights</span>
          </div>
        </div>
      </div>

      <div className="insights-content-grid">
        <section className="insights-panel">
          <div className="insights-panel-heading">
            <div>
              <h3>
                <AlertTriangle size={18} />
                Budget Alerts
              </h3>
              <p>Categories that have exceeded their budgets</p>
            </div>
            <span className="insights-count">
              {budgetWarnings.length}
            </span>
          </div>

          {budgetWarnings.length === 0 ? (
            <div className="insights-empty">
              <CheckCircle2 size={27} />
              <h4>You're on track!</h4>
              <p>No budget overruns detected this month.</p>
            </div>
          ) : (
            <div className="insights-list">
              {budgetWarnings.map((item) => {
                const overAmount =
                  item.actualSpent - item.budgetAmount;

                return (
                  <div
                    className="budget-warning-item"
                    key={item.categoryId}
                  >
                    <div className="warning-item-top">
                      <div className="warning-category-icon">
                        <TrendingUp size={17} />
                      </div>
                      <div className="warning-category-name">
                        <h4>{item.categoryName || "Category"}</h4>
                        <span>Budget exceeded</span>
                      </div>
                      <span className="warning-over-amount">
                        +{formatCurrency(overAmount)}
                      </span>
                    </div>

                    <div className="warning-amounts">
                      <span>
                        Spent: {formatCurrency(item.actualSpent)}
                      </span>
                      <span>
                        Budget: {formatCurrency(item.budgetAmount)}
                      </span>
                    </div>

                    <div className="warning-progress-track">
                      <div
                        className="warning-progress-fill"
                        style={{
                          width: `${
                            item.budgetAmount > 0
                              ? Math.min(
                                  (item.actualSpent / item.budgetAmount) *
                                    100,
                                  100
                                )
                              : 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="insights-panel">
          <div className="insights-panel-heading">
            <div>
              <h3>
                <CalendarDays size={18} />
                Upcoming Payments
              </h3>
              <p>Recurring payments expected in the next 7 days</p>
            </div>
            <span className="insights-count">
              {upcomingPayments.length}
            </span>
          </div>

          {upcomingPayments.length === 0 ? (
            <div className="insights-empty">
              <Wallet size={27} />
              <h4>No upcoming payments</h4>
              <p>You have no active recurring payments due soon.</p>
            </div>
          ) : (
            <div className="insights-list">
              {upcomingPayments.map((payment) => (
                <div
                  className="upcoming-payment-item"
                  key={payment.recurringId}
                >
                  <div className="payment-item-icon">
                    <Wallet size={18} />
                  </div>

                  <div className="payment-item-details">
                    <h4>
                      {payment.recurringName || "Recurring payment"}
                    </h4>
                    <span>
                      <Clock size={12} />
                      {formatDate(payment.nextExpectedDate)}
                    </span>
                    <small>
                      {formatFrequency(payment.frequency)}
                    </small>
                  </div>

                  <strong>
                    {formatCurrency(payment.expectedAmount)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="insights-panel saved-insights-panel">
        <div className="insights-panel-heading">
          <div>
            <h3>
              <Lightbulb size={18} />
              Financial Insights & Recommendations
            </h3>
            <p>Previously generated insights for your account</p>
          </div>
          <span className="insights-count">{insights.length}</span>
        </div>

        {insights.length === 0 ? (
          <div className="insights-empty">
            <Sparkles size={27} />
            <h4>No saved insights yet</h4>
            <p>
              Your saved financial insights will appear here when available.
            </p>
          </div>
        ) : (
          <div className="saved-insights-grid">
            {insights.map((item, index) => (
              <div
                className="saved-insight-card"
                key={item.insightId || index}
              >
                <div className="saved-insight-icon">
                  <Lightbulb size={19} />
                </div>

                <div>
                  <span className="saved-insight-type">
                    {item.insightType || "Financial insight"}
                  </span>
                  <h4>{item.title || "Financial recommendation"}</h4>
                  <p>
                    {item.description ||
                      item.message ||
                      "No additional details available."}
                  </p>
                  <small>
                    {formatDate(item.generatedAt)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
