import { getStoreData, updateStoreData } from './api.js';

// Configuration
const apiUrl = '/api/vaccine-receipts';
let currentRowId = null;

// Éléments DOM
const modal = document.getElementById('quantityModal');
const closeBtn = document.querySelector('.close');
const confirmBtn = document.getElementById('confirmAdd');
const cancelBtn = document.getElementById('cancelAdd');
const refreshBtn = document.getElementById('refreshBtn');
const addedQuantityInput = document.getElementById('addedQuantity');

// Initialisation
document.addEventListener('DOMContentLoaded', function () {
    loadData();
    setupEventListeners();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Formulaire d'ajout


    // Bouton d'actualisation
    refreshBtn.addEventListener('click', loadData);

    // Modal events
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', handleQuantityAdd);

    // Fermer le modal en cliquant à l'extérieur
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Entrée pour confirmer dans le modal
    addedQuantityInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleQuantityAdd();
        }
    });
}

// Charger les données
async function loadData() {
    try {
        refreshBtn.classList.add('loading');
        const res = await getStoreData();
        console.log('Données chargées:', res);
        renderTable(res.data);
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        showNotification('Erreur lors du chargement des données', 'error');
    } finally {
        refreshBtn.classList.remove('loading');
    }
}

// Rendu du tableau
function renderTable(data) {
    const body = document.getElementById("tableBody");

    if (!data || data.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <i class="fas fa-inbox"></i> Aucune donnée disponible
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = "";
    data.forEach((row) => {
        const remainingClass = getRemainingQuantityClass(row.quantity_remaining, row.quantity_received);

        body.innerHTML += `
          <tr>
            
            <td>${escapeHtml(row.department)}</td>
            <td><strong>${row.quantity_received}</strong></td>
            <td class="${remainingClass}">
                <strong>${row.quantity_remaining}</strong>
            </td>
            <td>
              <button class="btn btn-success btn-sm" onclick="openAddQuantityModal(${row.id})">
                <i class="fas fa-plus"></i> Augmenter
              </button>
            </td>
          </tr>
        `;
    });
}

// Gérer l'ajout de formulaire
async function handleAddForm(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';
        submitBtn.disabled = true;

        const body = {
            user_id: parseInt(document.getElementById("user_id").value),
            department: document.getElementById("department").value.trim(),
            quantity_received: parseInt(document.getElementById("quantity").value),
        };

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error('Erreur lors de l\'ajout');
        }

        showNotification('Vaccin ajouté avec succès!', 'success');
        e.target.reset();
        await loadData();

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'ajout du vaccin', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Ouvrir le modal d'augmentation de quantité
function openAddQuantityModal(id) {
    currentRowId = id;
    addedQuantityInput.value = '';
    addedQuantityInput.focus();
    modal.style.display = 'block';
}

// Fermer le modal
function closeModal() {
    modal.style.display = 'none';
    currentRowId = null;
    addedQuantityInput.value = '';
}

// Gérer l'ajout de quantité
async function handleQuantityAdd() {
    const added = addedQuantityInput.value.trim();

    if (!added || isNaN(added) || parseInt(added) <= 0) {
        showNotification('Veuillez saisir une quantité valide', 'warning');
        addedQuantityInput.focus();
        return;
    }

    try {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Traitement...';
        confirmBtn.disabled = true;

        await updateStoreData({
            id: currentRowId,
            added_quantity: parseInt(added)
        })


        showNotification('Quantité augmentée avec succès!', 'success');
        closeModal();
        await loadData();

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'augmentation de la quantité', 'error');
    } finally {
        confirmBtn.innerHTML = 'Confirmer';
        confirmBtn.disabled = false;
    }
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;

    document.body.appendChild(notification);

    // Auto-suppression après 5 secondes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Fonctions utilitaires
function getRemainingQuantityClass(remaining, received) {
    const percentage = (remaining / received) * 100;
    if (percentage < 10) return 'text-danger';
    if (percentage < 30) return 'text-warning';
    return 'text-success';
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    return colors[type] || '#3498db';
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Ajouter les styles d'animation pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .btn-sm {
        padding: 8px 12px;
        font-size: 0.85rem;
    }
`;
document.head.appendChild(style);

// Exposer les fonctions globales
window.openAddQuantityModal = openAddQuantityModal;