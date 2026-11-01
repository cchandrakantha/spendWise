
import { useEffect, useState } from "react";

import Login from "./components/Login";
import Signup from "./components/Signup";
import AccountSetup from "./components/AccountSetup";
import { getAccounts } from "./services/accountService";
import AddTransactionModal from "./components/AddTransactionModal";
import TransactionsPage from "./components/TransactionsPage";
import BudgetsPage from "./components/BudgetsPage";
import RecurringPaymentsPage from "./components/RecurringPaymentsPage";
import CategoriesPage from "./components/CategoriesPage";
import InsightsPage from "./components/InsightsPage";

import {
  getCurrentUser,
  logout,
} from "./services/authService";

import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Repeat,
  Tags,
  Lightbulb,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  TrendingUp,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getDashboard } from "./services/dashboardService";
import "./App.css";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Budgets", icon: Wallet },
  { label: "Recurring Payments", icon: Repeat },
  { label: "Categories", icon: Tags },
  { label: "Insights", icon: Lightbulb },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authentication state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(true);

  const [accountSetupRequired, setAccountSetupRequired] = useState(false);
const [dashboardRefresh, setDashboardRefresh] = useState(0);
const [showTransactionModal, setShowTransactionModal] = useState(false);

  // Dashboard state
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Restore existing login session
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("spendwise_token");

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await getCurrentUser();
const accountData = await getAccounts();

setAccountSetupRequired(
  !accountData.accounts || accountData.accounts.length === 0
);

setUser(data.user);
      } catch (err) {
        console.error("Session restoration failed:", err);
        logout();
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Fetch dashboard after successful login
  useEffect(() => {
    if (!user) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getDashboard();
        setDashboard(data);
      } catch (err) {
        console.error("Dashboard API error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user,dashboardRefresh]);

  // Authentication handlers
  const handleLogin = async (loggedInUser) => {
  try {
    const accountData = await getAccounts();

    setAccountSetupRequired(
      !accountData.accounts || accountData.accounts.length === 0
    );

    setUser(loggedInUser);
    setActivePage("Dashboard");
    setError("");
  } catch (err) {
    setError(
      err.response?.data?.message || "Unable to check your accounts."
    );
  }
};

const handleSignup = (registeredUser) => {
  setAccountSetupRequired(true);
  setUser(registeredUser);
  setActivePage("Dashboard");
  setError("");
};

const handleAccountCreated = () => {
  setAccountSetupRequired(false);
  setDashboardRefresh((previous) => previous + 1);
};

  const handleLogout = () => {
    logout();
    setUser(null);
    setDashboard(null);
    setActivePage("Dashboard");
    setAuthMode("login");
    setError("");
  };

  // Formatting helpers
  const formatCurrency = (amount = 0) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const formatDate = (date) => {
    if (!date) return "â€”";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMonth = (month) => {
    if (!month) return "";

    const [year, monthNumber] = month.split("-");

    return new Date(
      Number(year),
      Number(monthNumber) - 1
    ).toLocaleDateString("en-IN", {
      month: "short",
    });
  };

  // Chart data
  const monthlyData = (dashboard?.monthlyTrends || []).map(
    (item) => ({
      month: formatMonth(item.month),
      income: Number(item.income) || 0,
      expenses: Number(item.expenses) || 0,
    })
  );

  // Recent transactions
  const transactions = (
    dashboard?.recentTransactions || []
  ).map((transaction) => {
    const type = transaction.transactionType?.toLowerCase();

    return {
      id: transaction.transactionId,
      name:
        transaction.Merchant?.merchantName ||
        transaction.description ||
        "Transaction",
      category:
        transaction.Category?.categoryName ||
        "Uncategorized",
      date: formatDate(transaction.transactionDate),
      amount: Number(transaction.amount) || 0,
      type,
      icon:
        type === "income"
          ? "ðŸ’¼"
          : type === "refund"
            ? "â†©ï¸"
            : type === "transfer"
              ? "ðŸ”„"
              : "ðŸ’³",
    };
  });

  const getTransactionAmount = (transaction) => {
    const amount = formatCurrency(transaction.amount);

    if (
      transaction.type === "income" ||
      transaction.type === "refund"
    ) {
      return `+${amount}`;
    }

    if (transaction.type === "transfer") {
      return amount;
    }

    return `-${amount}`;
  };

  // User profile display
  const userName = user?.fullName || "User";

  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Authentication loading screen
  if (authLoading) {
    return (
      <div className="auth-loading">
        <h2>SpendWise</h2>
        <p>Checking your account...</p>
      </div>
    );
  }

  // Login and Signup screens
  // Login and Signup screens
if (!user) {
  return authMode === "login" ? (
    <Login
      onLogin={handleLogin}
      onSignupClick={() => setAuthMode("signup")}
    />
  ) : (
    <Signup
      onSignup={handleSignup}
      onLoginClick={() => setAuthMode("login")}
    />
  );
}

// First account setup screen
if (accountSetupRequired) {
  return (
    <AccountSetup
      onAccountCreated={handleAccountCreated}
    />
  );
}


  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-logo">S</div>

          <span>
            Spend<span className="brand-highlight">Wise</span>
          </span>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${
                activePage === label ? "active" : ""
              }`}
              onClick={() => {
                setActivePage(label);
                setSidebarOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>

              {label === "Insights" && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>

          <div className="profile-card">
            <div className="avatar">{userInitials}</div>

            <div className="profile-info">
              <strong>{userName}</strong>
              <span>Personal Account</span>
            </div>

            <span className="profile-menu">â€¢â€¢â€¢</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="breadcrumb">
                Workspace / <span>{activePage}</span>
              </div>

              <h1>{activePage}</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="search-button">
              <Search size={18} />
              <span>Search anything...</span>
              <kbd>âŒ˜ K</kbd>
            </button>

            <button className="icon-button notification-button">
              <Bell size={19} />
              <span />
            </button>

            <button
  className="add-button"
  onClick={() => setShowTransactionModal(true)}
>
  <Plus size={18} />
  Add Transaction
</button>
          </div>
        </header>

        <section className="page-content">
  {activePage === "Transactions" ? (
    <TransactionsPage
      onAddTransaction={() => setShowTransactionModal(true)}
    />
  ) : activePage === "Budgets" ? (
    <BudgetsPage />
  ) : activePage === "Recurring Payments" ? (
    <RecurringPaymentsPage />
    ) : activePage === "Categories" ? (
  <CategoriesPage />
     ) : activePage === "Insights" ? (
  <InsightsPage />
  ) : (
    <>
          
          <div className="welcome-row">
            <div>
              <h2>Welcome back, {userName} ðŸ‘‹</h2>
              <p>
                Here's what's happening with your finances today.
              </p>
            </div>

            <div className="date-selector">
              {new Date().toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}{" "}
              <span>âŒ„</span>
            </div>
          </div>
          
          {loading ? (
            <div className="panel">
              <p>Loading your financial data...</p>
            </div>
          ) : error ? (
            <div className="panel">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total Balance</span>

                    <div className="stat-icon green">
                      <Wallet size={19} />
                    </div>
                  </div>

                  <h3>
                    {formatCurrency(dashboard?.totalBalance)}
                  </h3>

                  <div className="stat-foot positive">
                    <TrendingUp size={15} />
                    <span>Across your active accounts</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total Income</span>

                    <div className="stat-icon blue">
                      <ArrowDownRight size={19} />
                    </div>
                  </div>

                  <h3>
                    {formatCurrency(dashboard?.totalIncome)}
                  </h3>

                  <div className="stat-foot positive">
                    <TrendingUp size={15} />
                    <span>Total recorded income</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total Expenses</span>

                    <div className="stat-icon orange">
                      <ArrowUpRight size={19} />
                    </div>
                  </div>

                  <h3>
                    {formatCurrency(dashboard?.totalExpenses)}
                  </h3>

                  <div className="stat-foot negative">
                    <ArrowUpRight size={15} />
                    <span>Total recorded expenses</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Net Cash Flow</span>

                    <div className="stat-icon purple">
                      <CreditCard size={19} />
                    </div>
                  </div>

                  <h3>
                    {formatCurrency(dashboard?.netCashFlow)}
                  </h3>

                  <div
                    className={`stat-foot ${
                      Number(dashboard?.netCashFlow) >= 0
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    <TrendingUp size={15} />
                    <span>Income minus expenses</span>
                  </div>
                </div>
              </div>

              {/* Charts and Budget */}
              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Financial Overview</h3>
                      <p>Income vs expenses over time</p>
                    </div>

                    <button className="period-button">
                      Last 6 monthsâŒ„
                    </button>
                  </div>

                  <div className="chart-legend">
                    <span>
                      <i className="legend-dot income-dot" />
                      Income
                    </span>

                    <span>
                      <i className="legend-dot expense-dot" />
                      Expenses
                    </span>
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient
                            id="incomeGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10b981"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>

                          <linearGradient
                            id="expenseGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#3b82f6"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="100%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>

                        <CartesianGrid
                          stroke="#263449"
                          strokeDasharray="4 4"
                          vertical={false}
                        />

                        <XAxis
                          dataKey="month"
                          stroke="#64748b"
                          tickLine={false}
                          axisLine={false}
                        />

                        <YAxis
                          stroke="#64748b"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) =>
                            `â‚¹${value / 1000}k`
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            background: "#111827",
                            border: "1px solid #263449",
                            borderRadius: 10,
                          }}
                          formatter={(value) =>
                            formatCurrency(value)
                          }
                        />

                        <Area
                          type="monotone"
                          dataKey="income"
                          stroke="#10b981"
                          fill="url(#incomeGradient)"
                          strokeWidth={2.5}
                        />

                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stroke="#3b82f6"
                          fill="url(#expenseGradient)"
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel budget-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Budget Overview</h3>
                      <p>Your monthly spending limits</p>
                    </div>

                    <button
                      className="text-link"
                      onClick={() => setActivePage("Budgets")}
                    >
                      View all
                    </button>
                  </div>

                  <p>
                    Budget data will be connected in the next step.
                  </p>
                </section>
              </div>

              {/* Recent Transactions */}
              <section className="panel transactions-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Recent Transactions</h3>
                    <p>Your latest financial activity</p>
                  </div>

                  <button
                    className="text-link"
                    onClick={() =>
                      setActivePage("Transactions")
                    }
                  >
                    View all transactions â†’
                  </button>
                </div>

                <div className="transaction-table">
                  <div className="transaction-row table-header">
                    <span>TRANSACTION</span>
                    <span>CATEGORY</span>
                    <span>DATE</span>
                    <span>AMOUNT</span>
                  </div>

                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <div
                        className="transaction-row"
                        key={transaction.id}
                      >
                        <div className="transaction-name">
                          <div className="transaction-icon">
                            {transaction.icon}
                          </div>

                          <strong>{transaction.name}</strong>
                        </div>

                        <span className="category-label">
                          {transaction.category}
                        </span>

                        <span className="transaction-date">
                          {transaction.date}
                        </span>

                        <strong
                          className={
                            transaction.type === "income" ||
                            transaction.type === "refund"
                              ? "amount-income"
                              : "amount-expense"
                          }
                        >
                          {getTransactionAmount(transaction)}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p>No transactions found.</p>
                  )}
                </div>
              </section>

              <div className="demo-notice">
                <span>â“˜</span> Your dashboard is connected to your
                SpendWise account data.
              </div>
            </>
          )}
          </>
        )}
        </section>
      </main>
       {showTransactionModal && (
        <AddTransactionModal
          onClose={() => setShowTransactionModal(false)}
          onSuccess={() =>
            setDashboardRefresh((previous) => previous + 1)
          }
        />
      )}
    </div>
  );
}

export default App;

