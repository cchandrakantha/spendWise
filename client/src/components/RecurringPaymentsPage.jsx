
import { useEffect, useState } from "react";
import {
  Repeat,
  CalendarDays,
  Wallet,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  Search,
} from "lucide-react";

import {
  getRecurringPayments,
  getRecurringSummary,
} from "../services/recurringService";

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "Not scheduled";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusConfig = {
  ACTIVE: { label: "Active", className: "active", icon: CheckCircle2 },
  PAUSED: { label: "Paused", className: "paused", icon: PauseCircle },
  CANCELLED: { label: "Cancelled", className: "cancelled", icon: XCircle },
  COMPLETED: { label: "Completed", className: "completed", icon: CheckCircle2 },
};

const frequencyLabel = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 weeks",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

export default function RecurringPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalSeries: 0,
    activeSeries: 0,
    pausedSeries: 0,
    cancelledSeries: 0,
    completedSeries: 0,
    totalExpectedAmount: 0,
    estimatedMonthlyCommitment: 0,
  });

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frequencyFilter, setFrequencyFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRecurringPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const [paymentResponse, summaryResponse] = await Promise.all([
        getRecurringPayments(),
        getRecurringSummary(),
      ]);

      setPayments(paymentResponse.recurringPayments || []);
      setSummary(summaryResponse.summary || {});
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load recurring payments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecurringPayments();
  }, []);

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus =
      statusFilter === "ALL" || payment.status === statusFilter;

    const matchesFrequency =
      frequencyFilter === "ALL" ||
      payment.frequency === frequencyFilter;

    const searchText = search.toLowerCase();

    const matchesSearch =
      payment.recurringName?.toLowerCase().includes(searchText) ||
      payment.Merchant?.merchantName?.toLowerCase().includes(searchText) ||
      payment.Category?.categoryName?.toLowerCase().includes(searchText);

    return matchesStatus && matchesFrequency && matchesSearch;
  });

  return (
    <div className="recurring-page">
      <div className="recurring-page-header">
        <div>
          <h2>Recurring Payments</h2>
          <p>
            Track subscriptions, regular bills and upcoming payments.
          </p>
        </div>

        <button
          className="recurring-refresh-button"
          onClick={loadRecurringPayments}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="recurring-empty-state">
          <RefreshCw className="budget-spinner" size={25} />
          <p>Loading recurring payments...</p>
        </div>
      ) : error ? (
        <div className="recurring-empty-state recurring-error">
          <AlertTriangle size={26} />
          <p>{error}</p>
          <button onClick={loadRecurringPayments}>Try Again</button>
        </div>
      ) : (
        <>
          <div className="recurring-summary-grid">
            <div className="recurring-summary-card">
              <div className="recurring-card-top">
                <span>Monthly Commitment</span>
                <div className="recurring-icon blue">
                  <Wallet size={19} />
                </div>
              </div>
              <h3>{currency(summary.estimatedMonthlyCommitment)}</h3>
              <p>Estimated monthly recurring cost</p>
            </div>

            <div className="recurring-summary-card">
              <div className="recurring-card-top">
                <span>Total Payments</span>
                <div className="recurring-icon purple">
                  <Repeat size={19} />
                </div>
              </div>
              <h3>{summary.totalSeries || 0}</h3>
              <p>All recurring series</p>
            </div>

            <div className="recurring-summary-card">
              <div className="recurring-card-top">
                <span>Active Payments</span>
                <div className="recurring-icon green">
                  <CheckCircle2 size={19} />
                </div>
              </div>
              <h3>{summary.activeSeries || 0}</h3>
              <p>Currently active</p>
            </div>

            <div className="recurring-summary-card">
              <div className="recurring-card-top">
                <span>Paused Payments</span>
                <div className="recurring-icon amber">
                  <PauseCircle size={19} />
                </div>
              </div>
              <h3>{summary.pausedSeries || 0}</h3>
              <p>Temporarily paused</p>
            </div>
          </div>

          <div className="recurring-status-overview">
            <div>
              <span className="status-dot green-dot" />
              Active <strong>{summary.activeSeries || 0}</strong>
            </div>
            <div>
              <span className="status-dot amber-dot" />
              Paused <strong>{summary.pausedSeries || 0}</strong>
            </div>
            <div>
              <span className="status-dot red-dot" />
              Cancelled <strong>{summary.cancelledSeries || 0}</strong>
            </div>
            <div>
              <span className="status-dot blue-dot" />
              Completed <strong>{summary.completedSeries || 0}</strong>
            </div>
          </div>

          <div className="recurring-list-panel">
            <div className="recurring-list-heading">
              <div>
                <h3>All Recurring Payments</h3>
                <p>Manage and monitor your regular payments.</p>
              </div>
              <span>{filteredPayments.length} payments</span>
            </div>

            <div className="recurring-filters">
              <div className="recurring-search">
                <Search size={17} />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
              >
                <option value="ALL">All Frequencies</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Every 2 weeks</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="recurring-empty-state">
                <Repeat size={32} />
                <h3>No recurring payments found</h3>
                <p>
                  No payments match your current filters.
                </p>
              </div>
            ) : (
              <div className="recurring-table-wrapper">
                <table className="recurring-table">
                  <thead>
                    <tr>
                      <th>Payment</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Frequency</th>
                      <th>Next Payment</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayments.map((payment) => {
                      const config =
                        statusConfig[payment.status] ||
                        statusConfig.ACTIVE;

                      const StatusIcon = config.icon;

                      return (
                        <tr key={payment.recurringId}>
                          <td>
                            <div className="recurring-payment-name">
                              <div className="recurring-payment-icon">
                                <Repeat size={17} />
                              </div>
                              <div>
                                <strong>{payment.recurringName}</strong>
                                <span>
                                  {payment.Merchant?.merchantName ||
                                    "No merchant"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {payment.Category?.categoryName || "Uncategorized"}
                          </td>

                          <td>
                            <strong>
                              {currency(payment.expectedAmount)}
                            </strong>
                          </td>

                          <td>
                            {frequencyLabel[payment.frequency] ||
                              payment.frequency}
                          </td>

                          <td>
                            <div className="recurring-date">
                              <CalendarDays size={15} />
                              {formatDate(payment.nextExpectedDate)}
                            </div>
                          </td>

                          <td>
                            <span className={`recurring-status ${config.className}`}>
                              <StatusIcon size={13} />
                              {config.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
