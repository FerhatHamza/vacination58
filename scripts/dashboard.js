import { logoutUser } from "./auth.js";
import { getAdminStats, getAdminStats2, summaryByPeriod, getStoreData, getVaccinesReceived } from "./api.js";

const tauxVaccinations = document.getElementById("tauxVaccinations");
const totalVaccines = document.getElementById("totalVaccines");
const totalRestante = document.getElementById("totalRestante");
const logoutBtn = document.getElementById("logoutId");
const container = document.getElementById("stock-initial-container"); // stock

logoutBtn.addEventListener("click", () => {
  logoutUser();
  window.location.href = "index.html";
});

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
});

// 🧩 Access control
function checkAccess(requiredRole) {
  const USER_KEY = "userSession";
  const role = JSON.parse(localStorage.getItem(USER_KEY));

  if (!role || role.role !== requiredRole) {
    window.location.href = "index.html";
  }
}

// 🧠 Main init
async function initDashboard() {
  checkAccess("admin");
  const [status, table] = await Promise.all([
    getStatus(),
    renderEtabTable(),
  ]);
  renderStockInitialCards();
  return { status, table };
}

// 📊 Render charts + global numbers
async function getStatus() {
  const result = await getAdminStats();
  const response2 = await getAdminStats2();

  if (!result.success || !result.summary) {
    alert("Impossible de charger les statistiques globales");
    return;
  }

  // Update summary cards
  const total = Number(result.summary.total_vaccinated) || 0;
  const target = Number(result.summary.total_vaccines_received) || 10000;
  const restante = target - total;
  const percentage = (total / target) * 100;

  totalVaccines.textContent = total.toLocaleString();
  totalRestante.textContent = restante.toLocaleString();
  tauxVaccinations.textContent = `${percentage.toFixed(2)}%`;

  // Draw charts
  dessinerGraphiques({
    etabs: response2.data.map(r => ({
      nom: formatEtabName(r.username),
      total: r.grand_total
    })),
    categories: {
      "≥65 ans sains": result.summary.total_age_65_no_chronic,
      "≥65 ans malades": result.summary.total_age_65_with_chronic,
      "Chroniques adultes": result.summary.total_chronic_adults,
      "Chroniques enfants": result.summary.total_chronic_children,
      "Femmes enceintes": result.summary.total_pregnant_women,
      "Santé": result.summary.total_health_staff,
      "Pèlerins": result.summary.total_pilgrims,
      "Autres": result.summary.total_others
    }
  });
}


function formatEtabName(input) {
  if (!input) return "";

  // Split by underscore
  const parts = input.split("_");

  // First part uppercase (like EPH, EPSP, DSP, etc.)
  const prefix = parts[0].toUpperCase();

  // Remaining parts: capitalize first letter
  const rest = parts
    .slice(1)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return `${prefix} ${rest}`.trim();
}

function getUtilisationColor(value) {
  const percent = Math.min(Math.max(value, 0), 1);
  const hue = percent * 120; // 0 (red) → 120 (green)
  return { css: `hsl(${hue}, 100%, 45%)` };
}

function getTextColor({ r, g, b }) {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? "#000" : "#fff"; // black for light bg, white for dark
}

async function renderEtabTable() {
  try {
    // Fetch global and per-etab data
    // const [globalStats, perEtabStats] = await Promise.all([
    //   getAdminStats(),
    //   getAdminStats2()
    // ]);

    const tableBody = document.querySelector("#vaccTable tbody");
    tableBody.innerHTML = "";

    // Hardcoded received doses
    const vaccinesReceived = {
      "DSP Ghardaia": 10000,
      "EHS Ghardaia": 200,
      "EPH Berriane": 200,
      "EPH Ghardaia": 400,
      "EPH Guerrara": 200,
      "EPH Metlili": 200,
      "EPSP Berriane": 800,
      "EPSP Ghardaia": 4000,
      "EPSP Guerrara": 2000,
      "EPSP Metlili": 2000
    };



    // const summaryRes = await summaryByPeriod();
    const [summaryRes, res] = await Promise.all([
      summaryByPeriod(),
      getVaccinesReceived()
    ]);
    const vaccinesRec = res.result;

    const summaryData = summaryRes.data;
    // console.log('summaryData:: ', summaryData.users);


    if (!summaryData || !Array.isArray(summaryData.users)) {
      console.warn("⚠️ Aucun utilisateur trouvé dans summaryData");
      return;
    }
    // console.log('summary:: ', summaryData);
    summaryData.users.forEach(item => {
      const row = document.createElement("tr");
      const received = vaccinesRec[item.etab] || 0;
      const utilisation = received > 0 ? item.grandTotal_total_vaccinated / received : 0;

      const colorData = getUtilisationColor(utilisation)
      const textColor = getTextColor(colorData);

      row.innerHTML = `
          <td>${item.etab}</td>
          <td>${item.summary.today}</td>
          <td>${item.summary.lastThreeDays}</td>
          <td>${item.summary.thisWeek}</td>
          <td>${item.summary.thisMonth}</td>
          <td>${item.grandTotal_total_vaccinated}</td>
          <td style="
            font-weight: bold;
            background-color: ${colorData.css};;
            color: ${textColor};
            text-align: center;
            border-radius: 6px;
            transition: 0.3s ease;
          ">
            ${(utilisation * 100).toFixed(2)} %
          </td>
        `;
      tableBody.appendChild(row);
    });
    // }
  } catch (error) {
    console.error("Erreur lors du rendu du tableau:", error);
  }
}

async function renderStockInitialCards() {
  const container = document.getElementById('stock-initial-container');

  // إضافة فحص لوجود العنصر
  if (!container) {
    console.error('العنصر stock-initial-container غير موجود في الصفحة');
    return;
  }

  const res = await getStoreData();

  // إذا لم تكن هناك بيانات، عرض رسالة مناسبة
  if (!res || !res.data || res.data.length === 0) {
    container.innerHTML = `
      <div class="section-header">
        <h2><i class="fas fa-syringe"></i> مخزون اللقاحات</h2>
      </div>
      <div class="empty-stock">
        <i class="fas fa-inbox"></i>
        <p>لا توجد بيانات متاحة</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="section-header">
      <h2><i class="fas fa-syringe"></i> مخزون اللقاحات</h2>
    </div>
    <div class="stock-grid">
  `;

  res.data.forEach((row) => {
    // فحص وجود الخصائص المطلوبة
    if (!row.department || row.quantity_received === undefined || row.quantity_remaining === undefined) {
      console.warn('بيانات غير مكتملة للصف:', row);
      return;
    }

    // حساب نسبة الاستخدام
    const used = row.quantity_received - row.quantity_remaining;
    const usagePercentage = row.quantity_received > 0 ? (used / row.quantity_received) * 100 : 0;

    // تحديد فئة المخزون بناءً على النسبة المتبقية
    let stockClass = 'high-stock';
    let badgeText = 'مرتفع';

    if (usagePercentage > 70) {
      stockClass = 'low-stock';
      badgeText = 'منخفض';
    } else if (usagePercentage > 40) {
      stockClass = 'medium-stock';
      badgeText = 'متوسط';
    }

    html += `
      <div class="stock-card ${stockClass}">
        <div class="stock-badge">${badgeText}</div>
        <div class="stock-etab">
          <i class="fas fa-hospital"></i>
          ${row.department}
        </div>
        <div class="stock-amounts">
          <div class="stock-row stock-amount">
            <div class="stock-label">
              <i class="fas fa-boxes"></i>
              <span>المستلم</span>
            </div>
            <div class="stock-value">${formatNumber(row.quantity_received)}</div>
          </div>
          <div class="stock-row stock-amountRemaining">
            <div class="stock-label">
              <i class="fas fa-box-open"></i>
              <span>المتبقي</span>
            </div>
            <div class="stock-value">${formatNumber(row.quantity_remaining)}</div>
          </div>
        </div>
        <div class="usage-container">
          <div class="usage-label">
            <span>الاستخدام</span>
            <span>${Math.round(usagePercentage)}%</span>
          </div>
          <div class="usage-bar">
            <div class="usage-progress" style="width: ${usagePercentage}%"></div>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// دالة مساعدة لتنسيق الأرقام بشكل مدمج
function formatNumber(num) {
  if (!num && num !== 0) return '0';

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('fr-FR');
}



// 📈 Charts rendering
function dessinerGraphiques(data) {
  if (!data || !data.etabs || !data.categories) {
    console.error("❌ Données invalides passées à dessinerGraphiques");
    return;
  }

  const creerGraphique = (id, type, chartData, options = {}) => {
    const ctx = document.getElementById(id);
    if (!ctx) {
      console.warn(`⚠️ Élément #${id} non trouvé`);
      return;
    }

    // تدمير المخطط السابق إذا موجود
    if (ctx.chartInstance) {
      ctx.chartInstance.destroy();
    }

    const defaults = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            padding: 20,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 13 },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 8
        }
      }
    };

    ctx.chartInstance = new Chart(ctx, {
      type,
      data: chartData,
      options: { ...defaults, ...options },
    });
  };

  // 🏥 رسم بياني للمؤسسات - أعمدة أفقية
  const maxEtab = Math.max(...data.etabs.map(e => e.total));
  const etabColors = data.etabs.map(etab => {
    const percentage = etab.total / maxEtab;
    return getUtilisationColor(percentage).css;
  });

  creerGraphique(
    "chartEtab",
    "bar",
    {
      labels: data.etabs.map(e => e.nom),
      datasets: [
        {
          label: "Personnes vaccinées",
          data: data.etabs.map(e => e.total),
          backgroundColor: etabColors,
          borderColor: etabColors.map(color => color.replace('rgb', 'rgba').replace(')', ', 1)')),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    {
      indexAxis: 'y', // أعمدة أفقية
      plugins: {
        title: {
          display: true,
          text: "Nombre de personnes vaccinées par établissement",
          font: { size: 16, weight: 'bold' },
          padding: 20
        },
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: { size: 12 }
          },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        y: {
          ticks: {
            font: { size: 13 },
            autoSkip: false
          },
          grid: { display: false }
        }
      }
    }
  );

  // 👥 رسم بياني للفئات - دائري مع تدرج لوني
  const categoriesArray = Object.entries(data.categories);
  const totalCategories = Object.values(data.categories).reduce((a, b) => a + b, 0);

  // ألوان متدرجة للفئات المختلفة
  const categoryColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
  ];

  creerGraphique(
    "chartCategories",
    "doughnut", // دائري مجوف
    {
      labels: categoriesArray.map(([name]) => name),
      datasets: [
        {
          data: categoriesArray.map(([, value]) => value),
          backgroundColor: categoryColors,
          borderColor: 'white',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverOffset: 8
        },
      ],
    },
    {
      plugins: {
        title: {
          display: true,
          text: "Répartition par catégorie de population",
          font: { size: 16, weight: 'bold' },
          padding: 20
        },
        legend: {
          position: 'right',
          labels: {
            generateLabels: function (chart) {
              const data = chart.data;
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / totalCategories) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                };
              });
            }
          }
        }
      },
      cutout: '50%', // لجعل الرسم بياني مجوفاً
      animation: {
        animateScale: true,
        animateRotate: true
      }
    }
  );

  // 📊 إضافة إحصائيات إضافية
  afficherStatistiques(data);
}

function afficherStatistiques(data) {
  const statsContainer = document.getElementById('statsContainer');
  if (!statsContainer) return;

  const totalVaccines = data.etabs.reduce((sum, etab) => sum + etab.total, 0);
  const etablissementsCount = data.etabs.length;
  const categoriesCount = Object.keys(data.categories).length;

  statsContainer.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${totalVaccines.toLocaleString()}</div>
        <div class="stat-label">Total vaccinés</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${etablissementsCount}</div>
        <div class="stat-label">Établissements</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${categoriesCount}</div>
        <div class="stat-label">Catégories</div>
      </div>
    </div>
  `;
}

// إضافة CSS للتحسين البصري
const style = document.createElement('style');
style.textContent = `
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }
  
  .stat-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }
  
  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    font-size: 0.9rem;
    opacity: 0.9;
  }
  
  .chart-container {
    position: relative;
    margin: 2rem 0;
    padding: 1rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
`;
document.head.appendChild(style);