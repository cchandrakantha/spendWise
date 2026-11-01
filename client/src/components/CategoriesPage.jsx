
import React, { useEffect, useMemo, useState } from "react";
import {
  Tags,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Receipt,
  Search,
  RefreshCw,
  AlertCircle,
  Wallet,
} from "lucide-react";
import {
  getCategories,
  getCategorySummary,
} from "../services/categoryService";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const typeConfig = {
  INCOME: {
    label: "Income",
    icon: TrendingUp,
    color: "income",
  },
  EXPENSE: {
    label: "Expense",
    icon: TrendingDown,
    color: "expense",
  },
  TRANSFER: {
    label: "Transfer",
    icon: ArrowLeftRight,
    color: "transfer",
  },
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [activeType, setActiveType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const [categoryResponse, summaryResponse] = await Promise.all([
        getCategories(),
        getCategorySummary(),
      ]);

      setCategories(categoryResponse.categories || []);
      setSummary(summaryResponse.categories || []);
      setTotalSpending(Number(summaryResponse.totalSpending || 0));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load categories. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const summaryMap = useMemo(
    () => new Map(summary.map((item) => [item.categoryId, item])),
    [summary]
  );

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesType =
        activeType === "ALL" || category.categoryType === activeType;

      const matchesSearch = category.categoryName
        ?.toLowerCase()
        .includes(search.toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [categories, activeType, search]);

  const counts = {
    ALL: categories.length,
    INCOME: categories.filter((item) => item.categoryType === "INCOME").length,
    EXPENSE: categories.filter((item) => item.categoryType === "EXPENSE").length,
    TRANSFER: categories.filter((item) => item.categoryType === "TRANSFER").length,
  };

  if (loading) {
    return (
      <div className="categories-loading">
        <RefreshCw className="spin" size={24} />
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="categories-heading">
        <div>
          <p className="categories-eyebrow">MONEY ORGANIZATION</p>
          <h2>Categories</h2>
          <p className="categories-subtitle">
            Organize and understand where your money goes.
          </p>
        </div>

        <button
          className="categories-refresh"
          onClick={loadCategories}
          title="Refresh categories"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="categories-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="categories-overview">
        <div className="category-overview-card">
          <div className="category-overview-icon">
            <Tags size={21} />
          </div>
          <div>
            <p>Total Categories</p>
            <h3>{categories.length}</h3>
          </div>
        </div>

        <div className="category-overview-card">
          <div className="category-overview-icon expense-icon">
            <TrendingDown size={21} />
          </div>
          <div>
            <p>Total Spending</p>
            <h3>{formatCurrency(totalSpending)}</h3>
          </div>
        </div>

        <div className="category-overview-card">
          <div className="category-overview-icon">
            <Receipt size={21} />
          </div>
          <div>
            <p>Expense Categories</p>
            <h3>{counts.EXPENSE}</h3>
          </div>
        </div>
      </div>

      <div className="categories-toolbar">
        <div className="categories-tabs">
          {[
            ["ALL", "All"],
            ["EXPENSE", "Expenses"],
            ["INCOME", "Income"],
            ["TRANSFER", "Transfers"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`category-tab ${
                activeType === value ? "active" : ""
              }`}
              onClick={() => setActiveType(value)}
            >
              {label}
              <span>{counts[value]}</span>
            </button>
          ))}
        </div>

        <div className="categories-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="categories-section-heading">
        <div>
          <h3>All Categories</h3>
          <p>{filteredCategories.length} categories found</p>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="categories-empty">
          <Wallet size={30} />
          <h3>No categories found</h3>
          <p>Try changing your search or category filter.</p>
        </div>
      ) : (
        <div className="categories-grid">
          {filteredCategories.map((category) => {
            const config =
              typeConfig[category.categoryType] || typeConfig.EXPENSE;
            const Icon = config.icon;
            const categorySummary = summaryMap.get(category.categoryId);
            const amount = Number(categorySummary?.totalAmount || 0);
            const transactionCount = Number(
              categorySummary?.transactionCount || 0
            );
            const percentage =
              totalSpending > 0 ? (amount / totalSpending) * 100 : 0;

            return (
              <div className="category-card" key={category.categoryId}>
                <div className="category-card-top">
                  <div className={`category-card-icon ${config.color}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`category-type-badge ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                <h3>{category.categoryName}</h3>
                <p className="category-description">
                  {category.description || "No description available"}
                </p>

                {category.categoryType === "EXPENSE" ? (
                  <>
                    <div className="category-spending">
                      <strong>{formatCurrency(amount)}</strong>
                      <span>{transactionCount} transactions</span>
                    </div>

                    <div className="category-progress-track">
                      <div
                        className="category-progress-fill"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                        }}
                      />
                    </div>

                    <div className="category-percentage">
                      {percentage.toFixed(1)}% of total spending
                    </div>
                  </>
                ) : (
                  <div className="category-card-footer">
                    <span>{transactionCount} transactions</span>
                    <span>
                      {category.categoryType === "INCOME"
                        ? "Income category"
                        : "Transfer category"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
