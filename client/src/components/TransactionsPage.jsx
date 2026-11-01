
import { useEffect, useState } from "react";
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { getTransactions } from "../services/transactionService";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function TransactionsPage({ onAddTransaction }) {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getTransactions({
          page,
          limit: 10,
          search: search.trim() || undefined,
          type: type || undefined,
          status: status || undefined,
        });

        if (cancelled) return;

        const rows =
          response.transactions ||
          response.data?.transactions ||
          response.data ||
          [];

        setTransactions(Array.isArray(rows) ? rows : []);

        const pagination =
          response.pagination || response.data?.pagination;

        setTotalPages(
          Math.max(1, Number(pagination?.totalPages) || 1)
        );

        setTotal(
          Number(pagination?.total) ||
          Number(pagination?.totalItems) ||
          rows.length
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            "Unable to load transactions."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [page, search, type, status]);

  const getIcon = (transaction) => {
    if (
      transaction.transactionType === "INCOME" ||
      transaction.transactionType === "REFUND"
    ) {
      return <ArrowDownLeft size={18} />;
    }

    if (transaction.transactionType === "TRANSFER") {
      return <RefreshCw size={18} />;
    }

    return <ArrowUpRight size={18} />;
  };

  const getAmountClass = (transaction) =>
    transaction.transactionType === "INCOME" ||
    transaction.transactionType === "REFUND"
      ? "amount-income"
      : "amount-expense";

  const getAmountPrefix = (transaction) =>
    transaction.transactionType === "INCOME" ||
    transaction.transactionType === "REFUND"
      ? "+"
      : "-";

  return (
    <div className="transactions-page">
      <div className="page-toolbar">
        <div>
          <h2>All Transactions</h2>
          <p>Track and manage your financial activity.</p>
        </div>

        <button className="add-button" onClick={onAddTransaction}>
          + Add Transaction
        </button>
      </div>

      <div className="panel transaction-filters">
        <div className="transaction-search">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="transaction-filter-controls">
          <div className="filter-control">
            <Filter size={17} />
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="TRANSFER">Transfer</option>
              <option value="REFUND">Refund</option>
            </select>
          </div>

          <div className="filter-control">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="panel transactions-list-panel">
        <div className="transactions-list-heading">
          <div>
            <h3>Transaction History</h3>
            <p>{total} transactions found</p>
          </div>
        </div>

        {loading ? (
          <div className="transactions-message">
            Loading transactions...
          </div>
        ) : error ? (
          <div className="transactions-message error-message">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="transactions-message">
            No transactions found. Add your first transaction to get started.
          </div>
        ) : (
          <div className="transaction-table-wrapper">
            <div className="transaction-table transactions-full-table">
              <div className="transaction-row table-header">
                <span>TRANSACTION</span>
                <span>CATEGORY</span>
                <span>ACCOUNT</span>
                <span>DATE</span>
                <span>STATUS</span>
                <span>AMOUNT</span>
              </div>

              {transactions.map((transaction) => (
                <div
                  className="transaction-row"
                  key={transaction.transactionId}
                >
                  <div className="transaction-name">
                    <div className="transaction-icon">
                      {getIcon(transaction)}
                    </div>

                    <div className="transaction-details">
                      <strong>
                        {transaction.description ||
                          transaction.Merchant?.merchantName ||
                          "Transaction"}
                      </strong>
                      <small>{transaction.transactionType}</small>
                    </div>
                  </div>

                  <span className="category-label">
                    {transaction.Category?.categoryName ||
                      "Uncategorized"}
                  </span>

                  <span className="account-label">
                    {transaction.Account?.accountName || "—"}
                  </span>

                  <span className="transaction-date">
                    {formatDate(transaction.transactionDate)}
                  </span>

                  <span
                    className={`transaction-status status-${String(
                      transaction.status || ""
                    ).toLowerCase()}`}
                  >
                    {transaction.status || "—"}
                  </span>

                  <strong className={getAmountClass(transaction)}>
                    {getAmountPrefix(transaction)}
                    {formatCurrency(transaction.amount)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="transactions-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={17} />
              Previous
            </button>

            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
