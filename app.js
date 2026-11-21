
const $ = (s) => document.querySelector(s);

const state = {
  user: null,
  page: "dashboard",
  data: {
    orders: [],
    products: [],
    customers: [],
    expenses: [],
    deliveries: [],
    users: []
  }
};

const pages = {
  dashboard: ["ড্যাশবোর্ড", "আপনার ব্যবসার আজকের সারসংক্ষেপ"],
  orders: ["অর্ডার", "নতুন অর্ডার তৈরি ও অর্ডার পরিচালনা"],
  products: ["পণ্য ও স্টক", "পণ্যের তালিকা ও মজুত"],
  combos: ["কম্বো বিল্ডার", "পণ্যের কম্বো তৈরি ও মূল্য নির্ধারণ"],
  customers: ["কাস্টমার", "কাস্টমারের তথ্য ও কেনাকাটার ইতিহাস"],
  delivery: ["ডেলিভারি", "কুরিয়ার ও ডেলিভারি অবস্থা"],
  expenses: ["খরচ", "ব্যবসার খরচের হিসাব"],
  reports: ["রিপোর্ট", "বিক্রি, খরচ ও লাভ-ক্ষতির সারসংক্ষেপ"],
  users: ["ইউজার ম্যানেজমেন্ট", "অ্যাডমিন ও কর্মীদের অ্যাকাউন্ট"],
  settings: ["সেটিংস", "ব্যবসার তথ্য ও সংযোগ"]
};

const money = n =>
  `${window.RONGCHARON_CONFIG.CURRENCY}${Number(n || 0).toLocaleString("en-US")}`;

function toast(t) {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

function api(action, payload = {}) {
  const url = window.RONGCHARON_CONFIG.API_URL;

  if (!url || url.includes("PASTE_YOUR")) {
    return Promise.reject(
      new Error("Backend সংযুক্ত করা হয়নি। config.js পরীক্ষা করুন।")
    );
  }

  return new Promise((resolve, reject) => {
    const cb = "rc_" + Date.now() + "_" +
      Math.random().toString(36).slice(2);

    const script = document.createElement("script");

    const timer = setTimeout(() => {
      delete window[cb];
      script.remove();
      reject(new Error("সার্ভার থেকে উত্তর পাওয়া যায়নি।"));
    }, 15000);

    window[cb] = (res) => {
      clearTimeout(timer);
      delete window[cb];
      script.remove();

      res && res.ok
        ? resolve(res)
        : reject(new Error(res?.message || "অনুরোধ সম্পন্ন হয়নি"));
    };

    const params = new URLSearchParams({
      action,
      payload: JSON.stringify(payload),
      callback: cb
    });

    script.src = url + "?" + params.toString();

    script.onerror = () => {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
      reject(new Error("Backend সংযোগ ব্যর্থ হয়েছে"));
    };

    document.body.appendChild(script);
  });
}

function showLogin() {
  $("#loginView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}

function showApp() {
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");

  $("#currentUser").textContent =
    state.user?.name || state.user?.userId || "ব্যবহারকারী";

  $("#todayLabel").textContent =
    new Date().toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  renderPage("dashboard");
}

// LOGIN: Login করার পর Google Sheet থেকে সব তথ্য Load হবে
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const userId = $("#userId").value.trim();
  const password = $("#password").value;
  const msg = $("#loginMessage");

  msg.textContent = "লগইন যাচাই হচ্ছে…";

  try {
    const r = await api("login", { userId, password });

    state.user = r.user;
    sessionStorage.setItem("rc_session", r.token);

    msg.textContent = "তথ্য লোড হচ্ছে…";

    await refreshData();

    showApp();
    msg.textContent = "";

  } catch (err) {
    state.user = null;
    sessionStorage.removeItem("rc_session");
    showLogin();
    msg.textContent = err.message;
  }
});

// LOGOUT
$("#logoutBtn").onclick = () => {
  state.user = null;
  state.data = {
    orders: [],
    products: [],
    customers: [],
    expenses: [],
    deliveries: [],
    users: []
  };

  sessionStorage.removeItem("rc_session");
  showLogin();
};

// MENU
$("#menuBtn").onclick = () =>
  $("#sidebar").classList.toggle("open");

document.addEventListener("click", e => {
  const b = e.target.closest("[data-page]");
  if (!b) return;

  renderPage(b.dataset.page);
  $("#sidebar").classList.remove("open");
});

function heading(page) {
  $("#pageHeading").innerHTML = `
    <div>
      <h1>${pages[page][0]}</h1>
      <p>${pages[page][1]}</p>
    </div>
    <span class="date-chip">
      ${new Date().toLocaleDateString("bn-BD")}
    </span>
  `;

  document.querySelectorAll("[data-page]").forEach(x => {
    x.classList.toggle("active", x.dataset.page === page);
  });
}

function renderPage(page) {
  state.page = page;
  heading(page);

  const root = $("#pageContent");

  const renderers = {
    dashboard: dashboard,
    orders: () => basicList("orders", "অর্ডার"),
    products: () => basicList("products", "পণ্য"),
    combos: combos,
    customers: () => basicList("customers", "কাস্টমার"),
    delivery: () => basicList("deliveries", "ডেলিভারি"),
    expenses: expenses,
    reports: reports,
    users: users,
    settings: settings
  };

  (renderers[page] || dashboard)(root);
}

function dashboard(root = $("#pageContent")) {
  const o = state.data.orders;
  const p = state.data.products;
  const e = state.data.expenses;

  const sales = o
    .filter(x => x.status !== "বাতিল")
    .reduce((a, x) => a + Number(x.total || 0), 0);

  root.innerHTML = `
    <div class="cards">
      <div class="stat">
        <div class="label">মোট অর্ডার</div>
        <div class="value">${o.length}</div>
        <div class="hint">সংরক্ষিত অর্ডার</div>
      </div>
      <div class="stat">
        <div class="label">মোট বিক্রি</div>
        <div class="value">${money(sales)}</div>
        <div class="hint">অর্ডারের মোট মূল্য</div>
      </div>
      <div class="stat">
        <div class="label">মোট পণ্য</div>
        <div class="value">${p.length}</div>
        <div class="hint">পণ্যের তালিকা</div>
      </div>
      <div class="stat">
        <div class="label">মোট খরচ</div>
        <div class="value">${money(e.reduce((a, x) => a + Number(x.amount || 0), 0))}</div>
        <div class="hint">নথিভুক্ত খরচ</div>
      </div>
    </div>

    <div class="panel">
      <h3>দ্রুত কাজ</h3>
      <div class="quick-grid">
        <button class="quick" data-page="orders">
          ＋ নতুন অর্ডার<span>কাস্টমারের অর্ডার লিখুন</span>
        </button>
        <button class="quick" data-page="products">
          ◇ পণ্য যোগ<span>নতুন পণ্য ও স্টক যোগ করুন</span>
        </button>
        <button class="quick" data-page="expenses">
          ৳ খরচ যোগ<span>ব্যবসার খরচ লিখুন</span>
        </button>
        <button class="quick" data-page="customers">
          ♙ কাস্টমার<span>কাস্টমারের তথ্য দেখুন</span>
        </button>
      </div>
    </div>

    <div class="panel">
      <h3>সাম্প্রতিক অর্ডার</h3>
      ${table(
        ["অর্ডার", "কাস্টমার", "মোট", "অবস্থা"],
        o.slice(-5).reverse().map(x => [
          x.orderId,
          x.customer,
          money(x.total),
          x.status
        ])
      )}
    </div>
  `;
}

function table(headers, rows) {
  if (!rows.length) {
    return `<div class="empty">এখনো কোনো তথ্য যোগ করা হয়নি</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map(x => `<th>${x}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(r =>
            `<tr>${r.map(x => `<td>${x ?? ""}</td>`).join("")}</tr>`
          ).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function basicList(key, title) {
  const root = $("#pageContent");
  const arr = state.data[key] || [];

  const cols = key === "products"
    ? ["পণ্য আইডি", "নাম", "ক্রয়মূল্য", "বিক্রয়মূল্য", "স্টক"]
    : key === "customers"
    ? ["কাস্টমার আইডি", "নাম", "মোবাইল", "ঠিকানা"]
    : key === "deliveries"
    ? ["অর্ডার", "কুরিয়ার", "ট্র্যাকিং", "অবস্থা"]
    : ["অর্ডার", "কাস্টমার", "মোবাইল", "মোট", "অবস্থা"];

  const keys = key === "products"
    ? ["productId", "name", "purchasePrice", "sellingPrice", "stock"]
    : key === "customers"
    ? ["customerId", "name", "phone", "address"]
    : key === "deliveries"
    ? ["orderId", "courier", "tracking", "status"]
    : ["orderId", "customer", "phone", "total", "status"];

  root.innerHTML = `
    <div class="toolbar">
      <input id="listSearch" placeholder="${title} খুঁজুন">
      <button class="btn primary" id="addBtn">＋ নতুন যোগ করুন</button>
    </div>
    <div class="panel" id="listPanel">
      ${table(cols, arr.map(x =>
        keys.map(k => k === "total" ? money(x[k]) : x[k])
      ))}
    </div>
    <div id="entryArea"></div>
  `;

  $("#listSearch").oninput = e => {
    const q = e.target.value.toLowerCase();

    $("#listPanel").innerHTML = table(cols,
      arr.filter(x => JSON.stringify(x).toLowerCase().includes(q))
        .map(x => keys.map(k => k === "total" ? money(x[k]) : x[k]))
    );
  };

  $("#addBtn").onclick = () => showEntry(key, title);
}

function showEntry(key, title) {
  const root = $("#entryArea");

  const schemas = {
    products: [
      ["name", "পণ্যের নাম"],
      ["category", "ক্যাটাগরি"],
      ["purchasePrice", "ক্রয়মূল্য"],
      ["sellingPrice", "বিক্রয়মূল্য"],
      ["stock", "প্রাথমিক স্টক"],
      ["minStock", "সর্বনিম্ন স্টক"]
    ],
    customers: [
      ["name", "কাস্টমারের নাম"],
      ["phone", "মোবাইল"],
      ["address", "ঠিকানা"]
    ],
    orders: [
      ["customer", "কাস্টমারের নাম"],
      ["phone", "মোবাইল"],
      ["address", "ঠিকানা"],
      ["total", "মোট টাকা"],
      ["advance", "অগ্রিম"],
      ["status", "অবস্থা"]
    ],
    deliveries: [
      ["orderId", "অর্ডার নম্বর"],
      ["courier", "কুরিয়ার"],
      ["tracking", "ট্র্যাকিং নম্বর"],
      ["status", "ডেলিভারি অবস্থা"]
    ]
  };

  const fields = schemas[key] || [];

  root.innerHTML = `
    <div class="form-card">
      <h3>নতুন ${title}</h3>
      <form id="entryForm" class="field-grid">
        ${fields.map(([k, l]) => `
          <div class="field">
            <label>${l}</label>
            <input name="${k}"
              ${["purchasePrice", "sellingPrice", "stock", "minStock", "total", "advance"].includes(k)
                ? 'type="number" min="0"' : ""}
              required>
          </div>
        `).join("")}

        <div class="field full-row form-actions">
          <button class="btn primary" type="submit">সংরক্ষণ করুন</button>
          <button class="btn outline" type="button" id="cancelEntry">বাতিল</button>
        </div>
      </form>
    </div>
  `;

  $("#cancelEntry").onclick = () => root.innerHTML = "";

  $("#entryForm").onsubmit = async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.target));

    try {
      await api("save", {
        token: sessionStorage.getItem("rc_session"),
        entity: key,
        data
      });

      await refreshData();
      toast("তথ্য সফলভাবে লোড হয়েছে");
      renderPage(state.page);

    } catch (err) {
      toast(err.message);
    }
  };
}

function combos(root) {
  root.innerHTML = `
    <div class="form-card">
      <h3>নতুন কম্বো তৈরি</h3>
      <p class="muted">
        কম্বোর নাম, পণ্যের সংখ্যা ও বিক্রয়মূল্য লিখুন।
        পণ্য-ভিত্তিক স্টক সংযোগ Backend চালুর পর সক্রিয় হবে।
      </p>

      <form id="comboForm" class="field-grid">
        <div class="field">
          <label>কম্বোর নাম</label>
          <input name="name" required placeholder="যেমন: ৪ পিস Combo">
        </div>
        <div class="field">
          <label>পণ্যের সংখ্যা</label>
          <input name="itemCount" type="number" min="1" required>
        </div>
        <div class="field">
          <label>বিক্রয়মূল্য (৳)</label>
          <input name="price" type="number" min="0" required>
        </div>
        <div class="field">
          <label>নোট</label>
          <input name="note">
        </div>
        <div class="field full-row">
          <button class="btn primary">কম্বো সংরক্ষণ</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3>প্রস্তাবিত কম্বো মূল্য</h3>
      ${table(["কম্বো", "মূল্য"], [
        ["৪টি পণ্য", money(299)],
        ["৫টি পণ্য", money(399)],
        ["৭টি পণ্য", money(499)]
      ])}
    </div>
  `;

  $("#comboForm").onsubmit = async e => {
    e.preventDefault();

    try {
      await api("save", {
        token: sessionStorage.getItem("rc_session"),
        entity: "combos",
        data: Object.fromEntries(new FormData(e.target))
      });

      await refreshData();
      toast("কম্বো সংরক্ষণ সম্পন্ন হয়েছে");

    } catch (err) {
      toast(err.message);
    }
  };
}

function expenses(root) {
  root.innerHTML = `
    <div class="form-card">
      <h3>নতুন খরচ যোগ করুন</h3>

      <form id="expenseForm" class="field-grid">
        <div class="field">
          <label>খরচের খাত</label>
          <select name="category">
            <option>পণ্য ক্রয়</option>
            <option>প্যাকেজিং</option>
            <option>কুরিয়ার</option>
            <option>বিজ্ঞাপন</option>
            <option>অন্যান্য</option>
          </select>
        </div>

        <div class="field">
          <label>টাকার পরিমাণ</label>
          <input name="amount" type="number" min="1" required>
        </div>

        <div class="field full-row">
          <label>বিবরণ</label>
          <input name="note">
        </div>

        <div class="field full-row">
          <button class="btn primary">খরচ সংরক্ষণ</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3>খরচের তালিকা</h3>
      ${table(
        ["খাত", "পরিমাণ", "বিবরণ"],
        state.data.expenses.map(x => [
          x.category,
          money(x.amount),
          x.note
        ])
      )}
    </div>
  `;

  $("#expenseForm").onsubmit = async e => {
    e.preventDefault();

    try {
      await api("save", {
        token: sessionStorage.getItem("rc_session"),
        entity: "expenses",
        data: Object.fromEntries(new FormData(e.target))
      });

      await refreshData();
      renderPage("expenses");
      toast("খরচ সংরক্ষণ সম্পন্ন হয়েছে");

    } catch (err) {
      toast(err.message);
    }
  };
}

function reports(root) {
  const sales = state.data.orders.reduce(
    (a, x) => a + Number(x.total || 0), 0
  );

  const cost = state.data.expenses.reduce(
    (a, x) => a + Number(x.amount || 0), 0
  );

  root.innerHTML = `
    <div class="cards">
      <div class="stat">
        <div class="label">মোট বিক্রি</div>
        <div class="value">${money(sales)}</div>
      </div>
      <div class="stat">
        <div class="label">মোট খরচ</div>
        <div class="value">${money(cost)}</div>
      </div>
      <div class="stat">
        <div class="label">বিক্রি থেকে খরচ বাদ</div>
        <div class="value">${money(sales - cost)}</div>
      </div>
      <div class="stat">
        <div class="label">অর্ডার সংখ্যা</div>
        <div class="value">${state.data.orders.length}</div>
      </div>
    </div>

    <div class="panel">
      <h3>হিসাব সম্পর্কে</h3>
      <p class="muted">
        প্রকৃত লাভ নির্ভুল করতে পণ্যের ক্রয়মূল্য,
        অর্ডারের পণ্যভিত্তিক খরচ, রিটার্ন,
        কুরিয়ার চার্জ ও অন্যান্য খরচ রেকর্ড করতে হবে।
      </p>
    </div>
  `;
}

function users(root) {
  root.innerHTML = `
    <div class="panel">
      <h3>ইউজার ম্যানেজমেন্ট</h3>
      <p>
        শুরুতে ১ জন Admin ও ২ জন Employee অ্যাকাউন্ট
        তৈরির পরিকল্পনা রয়েছে। নিরাপদভাবে কর্মীদের
        User ID ও অস্থায়ী পাসওয়ার্ড Backend Setup-এর
        পর তৈরি করতে হবে।
      </p>
      <p class="tag">Admin: পূর্ণ নিয়ন্ত্রণ</p>
      <p class="tag">Employee: সীমিত অনুমতি</p>
    </div>
  `;
}

function settings(root) {
  root.innerHTML = `
    <div class="panel">
      <h3>ব্যবসার তথ্য</h3>
      <p><b>ব্যবসার নাম:</b> রঙচরণ</p>
      <p><b>যোগাযোগ:</b> 01617304334</p>
      <p><b>মুদ্রা:</b> বাংলাদেশি টাকা (৳)</p>
      <p><b>ডেলিভারি:</b> কুরিয়ার</p>
      <p class="muted">
        Backend URL config.js ফাইলে একবার সেট করা হবে;
        এখানে URL ইনপুট থাকবে না।
      </p>
    </div>
  `;
}

// GOOGLE SHEET থেকে সব তথ্য Load
async function refreshData() {
  const token = sessionStorage.getItem("rc_session");

  if (!token) {
    throw new Error("লগইন সেশন পাওয়া যায়নি।");
  }

  const r = await api("list", { token });

  state.data = {
    ...state.data,
    ...(r.data || {})
  };
}

// PAGE LOAD হলে আগের Session যাচাই ও তথ্য Load
(async function init() {
  const token = sessionStorage.getItem("rc_session");

  if (token) {
    try {
      const r = await api("me", { token });

      state.user = r.user;

      await refreshData();

      showApp();

    } catch (err) {
      state.user = null;
      sessionStorage.removeItem("rc_session");
      showLogin();
    }

  } else {
    showLogin();
  }
})();
