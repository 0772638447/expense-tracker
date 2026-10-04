// Expense Tracker - frontend logic

// PHASE 2
// Your backend from Phase 1 is already running, with real expenses in the
// database (from schema.sql). Build this page directly against it with
// fetch and async/await - there is no in-memory or localStorage stage
// this time, and no sample data file.
//
// A possible structure (change it if you have a better idea):
//   - async function getExpenses()          fetch(API_URL), return the JSON
//   - async function addExpense(data)       fetch(API_URL, { method: "POST", ... })
//   - async function updateExpense(id,data) fetch(API_URL + "/" + id, { method: "PUT", ... })
//   - async function deleteExpense(id)      fetch(API_URL + "/" + id, { method: "DELETE" })
//   - async function refresh()              get the list, then call renderTable and renderSummary
//   - renderTable(list)                     build the table rows from the array the API returned
//   - renderSummary(list)                   update the summary cards
//   - applyFilter()                         re-render with the list filtered by category
//
// Don't forget:
//   - Show a Bootstrap spinner while a request is in flight.
//   - Wrap every fetch call in try/catch, and show a Bootstrap alert on failure.
//   - After add, edit, or delete, call refresh() so the page always shows
//     what the server actually saved - never update the table by hand.
//   - The API is at http://localhost:3000/api/expenses (see the Roadmap).

const API_URL = "http://localhost:3000/api/expenses";
// ===============================
// Get Elements
// ===============================


// ===============================
// Get Elements
// ===============================
const expenseForm = document.getElementById("expenseForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const expenseTable = document.getElementById("expenseTable");
const filterCategory = document.getElementById("filterCategory");

const totalAmount = document.getElementById("totalAmount");
const expenseCount = document.getElementById("expenseCount");
const highestAmount = document.getElementById("highestAmount");
const highestTitle = document.getElementById("highestTitle");

const emptyMessage = document.getElementById("emptyMessage");
const submitButton = document.getElementById("submitButton");

// State
let expenses = [];
let editingId = null;

// Default Date
const today = new Date().toISOString().split("T")[0];
if (dateInput) dateInput.value = today;

// ===============================
// Spinner & Alert Helpers
// ===============================

// إنشاء أو جلب عنصر التنبيه للإشارات بالأخطاء
function showAlert(message) {
    let alertContainer = document.getElementById("apiAlert");
    if (!alertContainer) {
        alertContainer = document.createElement("div");
        alertContainer.id = "apiAlert";
        alertContainer.className = "alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3 z-3";
        alertContainer.role = "alert";
        document.body.appendChild(alertContainer);
    }
    alertContainer.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.classList.remove("d-none");
}

function hideAlert() {
    const alertContainer = document.getElementById("apiAlert");
    if (alertContainer) {
        alertContainer.classList.add("d-none");
    }
}

// عرض وإخفاء مؤشر التحميل (Spinner)
function showSpinner() {
    let spinner = document.getElementById("loadingSpinner");
    if (!spinner) {
        spinner = document.createElement("div");
        spinner.id = "loadingSpinner";
        spinner.className = "position-fixed top-50 start-50 translate-middle z-3";
        spinner.innerHTML = `
            <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `;
        document.body.appendChild(spinner);
    }
    spinner.classList.remove("d-none");
}

function hideSpinner() {
    const spinner = document.getElementById("loadingSpinner");
    if (spinner) {
        spinner.classList.add("d-none");
    }
}

// ===============================
// API Functions (Async / Await)
// ===============================

async function getExpenses() {
    showSpinner();
    hideAlert();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch expenses from server.");
        return await response.json();
    } catch (error) {
        showAlert(error.message);
        return [];
    } finally {
        hideSpinner();
    }
}

async function addExpense(data) {
    showSpinner();
    hideAlert();
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to add new expense.");
        return await response.json();
    } catch (error) {
        showAlert(error.message);
    } finally {
        hideSpinner();
    }
}

async function updateExpense(id, data) {
    showSpinner();
    hideAlert();
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error("Failed to update expense.");
        return await response.json();
    } catch (error) {
        showAlert(error.message);
    } finally {
        hideSpinner();
    }
}

async function deleteExpenseApi(id) {
    showSpinner();
    hideAlert();
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("Failed to delete expense.");
    } catch (error) {
        showAlert(error.message);
    } finally {
        hideSpinner();
    }
}

// ===============================
// Refresh & Render Logic
// ===============================

async function refresh() {
    expenses = await getExpenses();
    applyFilter();
}

function renderTable(list) {
    expenseTable.innerHTML = "";

    if (!list || list.length === 0) {
        if (emptyMessage) emptyMessage.classList.remove("d-none");
        return;
    }

    if (emptyMessage) emptyMessage.classList.add("d-none");

    list.forEach(function (expense) {
        const row = document.createElement("tr");

        const formattedDate = expense.date 
            ? new Date(expense.date).toISOString().split("T")[0] 
            : "";

        row.innerHTML = `
            <td>${expense.title}</td>
            <td>$${Number(expense.amount).toFixed(2)}</td>
            <td>
                <span class="badge text-bg-info category-badge">
                    ${expense.category}
                </span>
            </td>
            <td>${formattedDate}</td>
            <td>
                <button
                    class="btn btn-sm btn-outline-primary action-btn me-1"
                    onclick="editExpense(${expense.id})"
                >
                    Edit
                </button>
                <button
                    class="btn btn-sm btn-outline-danger"
                    onclick="deleteExpense(${expense.id})"
                >
                    Delete
                </button>
            </td>
        `;

        expenseTable.appendChild(row);
    });
}

function renderSummary(list) {
    if (!list || list.length === 0) {
        totalAmount.textContent = "$0.00";
        expenseCount.textContent = "0";
        highestAmount.textContent = "$0.00";
        highestTitle.textContent = "No expenses";
        return;
    }

    // Total
    const total = list.reduce((sum, expense) => sum + Number(expense.amount), 0);
    totalAmount.textContent = "$" + total.toFixed(2);

    // Count
    expenseCount.textContent = list.length;

    // Highest
    const highest = list.reduce((max, expense) => {
        return Number(expense.amount) > Number(max.amount) ? expense : max;
    }, list[0]);

    highestAmount.textContent = "$" + Number(highest.amount).toFixed(2);
    highestTitle.textContent = highest.title;
}

function applyFilter() {
    const selectedCategory = filterCategory.value;

    let filteredExpenses = expenses;
    if (selectedCategory !== "All") {
        filteredExpenses = expenses.filter(expense => expense.category === selectedCategory);
    }

    renderTable(filteredExpenses);
    renderSummary(filteredExpenses);
}

// ===============================
// Event Listeners & Handlers
// ===============================

expenseForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;

    // Validation
    if (title === "") return alert("Please enter the title.");
    if (amount <= 0 || isNaN(amount)) return alert("Please enter a valid amount.");
    if (category === "") return alert("Please choose a category.");
    if (date === "") return alert("Please choose a date.");

    const payload = { title, amount, category, date };

    if (editingId !== null) {
        await updateExpense(editingId, payload);
        editingId = null;
        submitButton.textContent = "Add Expense";
        submitButton.classList.remove("btn-success");
        submitButton.classList.add("btn-primary");
    } else {
        await addExpense(payload);
    }

    // Reset Form & Input State
    expenseForm.reset();
    dateInput.value = today;

    // Always fetch latest state from server
    await refresh();
});

async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;

    await deleteExpenseApi(id);
    await refresh();
}

function editExpense(id) {
    const expense = expenses.find(item => item.id === id);
    if (!expense) return;

    titleInput.value = expense.title;
    amountInput.value = expense.amount;
    categoryInput.value = expense.category;
    
    if (expense.date) {
        dateInput.value = new Date(expense.date).toISOString().split("T")[0];
    }

    editingId = id;

    submitButton.textContent = "Update Expense";
    submitButton.classList.remove("btn-primary");
    submitButton.classList.add("btn-success");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

filterCategory.addEventListener("change", applyFilter);

// ===============================
// Initial Load
// ===============================
refresh();