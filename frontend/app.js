// Global state
let currentUser = null;
let authToken = null;
let selectedVehicle = null;
let selectedCenter = null;
let selectedService = null;
let bookingData = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadFeaturedCenters();
    setupEventListeners();
    
    // Set minimum date to today
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }
});

// Check authentication
function checkAuth() {
    authToken = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (authToken && userStr) {
        currentUser = JSON.parse(userStr);
        updateNavbar();
        if (currentUser.role === 'customer') {
            showPage('customer-dashboard');
            loadCustomerDashboard();
        } else if (currentUser.role === 'garage') {
            showPage('garage-dashboard');
            loadGarageDashboard();
        } else if (currentUser.role === 'admin') {
            showPage('admin-dashboard');
            loadAdminDashboard();
        }
    } else {
        showPage('home');
    }
}

// Update navbar based on auth
function updateNavbar() {
    const navLogin = document.getElementById('nav-login');
    const navRegister = document.getElementById('nav-register');
    const navLogout = document.getElementById('nav-logout');
    const userName = document.getElementById('user-name');
    const bookBtn = document.getElementById('book-btn');
    const loginBtn = document.getElementById('login-btn');
    
    if (currentUser) {
        if (navLogin) navLogin.style.display = 'none';
        if (navRegister) navRegister.style.display = 'none';
        if (navLogout) navLogout.style.display = 'inline';
        if (userName) {
            userName.style.display = 'inline';
            userName.textContent = `Hi, ${currentUser.name}`;
        }
        if (bookBtn) bookBtn.style.display = 'inline';
        if (loginBtn) loginBtn.style.display = 'none';
    } else {
        if (navLogin) navLogin.style.display = 'inline';
        if (navRegister) navRegister.style.display = 'inline';
        if (navLogout) navLogout.style.display = 'none';
        if (userName) userName.style.display = 'none';
        if (bookBtn) bookBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Add vehicle form
    document.getElementById('add-vehicle-form').addEventListener('submit', handleAddVehicle);
    
    // Add center form
    document.getElementById('add-center-form').addEventListener('submit', handleAddCenter);
}

// API Helper
async function apiCall(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    try {
        const url = `/api${endpoint}`;
        console.log('API Call:', url, { method: options.method || 'GET' });
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('API Error Response:', response.status, data);
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', endpoint, error);
        throw error;
    }
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        updateNavbar();
        showAlert('Login successful!', 'success');
        
        if (currentUser.role === 'customer') {
            showPage('customer-dashboard');
            loadCustomerDashboard();
        } else if (currentUser.role === 'garage') {
            showPage('garage-dashboard');
            loadGarageDashboard();
        } else if (currentUser.role === 'admin') {
            showPage('admin-dashboard');
            loadAdminDashboard();
        }
    } catch (error) {
        showAlert(error.message || 'Login failed', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const userData = {
        name: document.getElementById('reg-name').value,
        role: document.getElementById('reg-role').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        contact: document.getElementById('reg-contact').value,
        location: document.getElementById('reg-location').value
    };
    
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        authToken = data.token;
        currentUser = data.user;
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        updateNavbar();
        showAlert('Registration successful!', 'success');
        
        if (currentUser.role === 'customer') {
            showPage('customer-dashboard');
            loadCustomerDashboard();
        } else if (currentUser.role === 'garage') {
            showPage('garage-dashboard');
            loadGarageDashboard();
        }
    } catch (error) {
        showAlert(error.message || 'Registration failed', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    updateNavbar();
    showPage('home');
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        if (page) page.classList.remove('active');
    });
    
    // Try with -page suffix first, then without
    let pageElement = document.getElementById(pageId + '-page');
    if (!pageElement) {
        pageElement = document.getElementById(pageId);
    }
    
    if (!pageElement) {
        console.error(`Page element not found: ${pageId} or ${pageId}-page`);
        showAlert('Page not found. Please refresh the page.', 'error');
        return;
    }
    pageElement.classList.add('active');
    
    // Load page-specific data
    if (pageId === 'home') {
        loadFeaturedCenters();
    } else if (pageId === 'customer-dashboard') {
        loadCustomerDashboard();
    } else if (pageId === 'garage-dashboard') {
        loadGarageDashboard();
    } else if (pageId === 'book-service') {
        if (!currentUser || currentUser.role !== 'customer') {
            showPage('login');
            return;
        }
        initializeBookingFlow();
    }
}

// Load Featured Centers
async function loadFeaturedCenters() {
    try {
        if (!authToken) {
            document.getElementById('featured-centers').innerHTML = '<p>Please login to view service centers</p>';
            return;
        }
        
        const data = await apiCall('/centers');
        const centers = data.centers || [];
        
        if (centers.length === 0) {
            document.getElementById('featured-centers').innerHTML = '<p>No service centers available</p>';
            return;
        }
        
        document.getElementById('featured-centers').innerHTML = centers.map(center => `
            <div class="card">
                <h3>${center.name}</h3>
                <p>📍 ${center.address}</p>
                <p>📞 ${center.contact}</p>
                <p>Services: ${center.serviceTypes.length}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading centers:', error);
        document.getElementById('featured-centers').innerHTML = '<p>Error loading service centers</p>';
    }
}

// Customer Dashboard
async function loadCustomerDashboard() {
    console.log('Loading customer dashboard for user:', currentUser);
    
    // Make sure the customer dashboard page is visible
    const dashboardPage = document.getElementById('customer-dashboard-page');
    if (!dashboardPage) {
        console.error('Customer dashboard page not found!');
        showAlert('Dashboard page not found. Please refresh the page.', 'error');
        return;
    }
    
    console.log('Customer dashboard page found and should be visible');
    
    // Ensure we're on the vehicles tab by default
    const vehiclesTab = document.getElementById('vehicles-tab');
    const bookingsTab = document.getElementById('bookings-tab');
    const vehiclesBtn = document.querySelector('#customer-dashboard-page .tab-btn:first-child');
    const bookingsBtn = document.querySelector('#customer-dashboard-page .tab-btn:last-child');
    
    if (vehiclesTab && bookingsTab) {
        vehiclesTab.classList.add('active');
        bookingsTab.classList.remove('active');
    }
    if (vehiclesBtn && bookingsBtn) {
        vehiclesBtn.classList.add('active');
        bookingsBtn.classList.remove('active');
    }
    
    await loadVehicles();
    await loadBookings();
}

async function loadVehicles() {
    try {
        const vehiclesListEl = document.getElementById('vehicles-list');
        if (!vehiclesListEl) {
            console.error('vehicles-list element not found');
            return;
        }

        vehiclesListEl.innerHTML = '<p>Loading vehicles...</p>';
        
        const data = await apiCall('/vehicles');
        const vehicles = data.vehicles || [];
        
        console.log('Loaded vehicles:', vehicles);
        
        if (vehicles.length === 0) {
            vehiclesListEl.innerHTML = '<p>No vehicles added. Add your first vehicle!</p>';
            return;
        }
        
        vehiclesListEl.innerHTML = vehicles.map(vehicle => `
            <div class="card">
                <h3>${vehicle.model || 'Unknown Model'}</h3>
                <p><strong>Registration:</strong> ${vehicle.registrationNumber || 'N/A'}</p>
                <p><strong>Type:</strong> ${vehicle.type || 'N/A'}</p>
                ${vehicle.lastServiceDate ? `<p><strong>Last Service:</strong> ${new Date(vehicle.lastServiceDate).toLocaleDateString()}</p>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading vehicles:', error);
        const vehiclesListEl = document.getElementById('vehicles-list');
        if (vehiclesListEl) {
            vehiclesListEl.innerHTML = `<p style="color: red;">Error loading vehicles: ${error.message}</p>`;
        }
    }
}

async function loadBookings() {
    try {
        const data = await apiCall(`/bookings/user/${currentUser.userId}`);
        const bookings = data.bookings || [];
        
        if (bookings.length === 0) {
            document.getElementById('bookings-list').innerHTML = '<p>No bookings yet. Book your first service!</p>';
            return;
        }
        
        // Load feedback for all bookings (allow feedback for Confirmed and Completed)
        const bookingsWithFeedback = await Promise.all(bookings.map(async (booking) => {
            // Check for feedback if booking is Confirmed or Completed
            if (booking.status === 'Completed' || booking.status === 'Confirmed') {
                try {
                    const feedbackData = await apiCall(`/feedback/booking/${booking.bookingId}`);
                    booking.existingFeedback = feedbackData.feedback || null;
                } catch (error) {
                    // No feedback yet, that's okay - 404 means no feedback exists
                    if (error.message && error.message.includes('404')) {
                        booking.existingFeedback = null;
                    } else {
                        console.error('Error loading feedback:', error);
                        booking.existingFeedback = null;
                    }
                }
            }
            return booking;
        }));
        
        document.getElementById('bookings-list').innerHTML = bookingsWithFeedback.map(booking => {
            const center = booking.centerId || {};
            const vehicle = booking.vehicleId || {};
            const statusClass = booking.status.toLowerCase();
            
            let feedbackSection = '';
            // Show feedback option for Confirmed and Completed bookings
            if (booking.status === 'Completed' || booking.status === 'Confirmed') {
                if (booking.existingFeedback) {
                    feedbackSection = `
                        <div style="margin-top: 10px; padding: 10px; background: #f0f9ff; border-radius: 8px;">
                            <p><strong>Your Feedback:</strong></p>
                            <p>Rating: ${'⭐'.repeat(booking.existingFeedback.rating || 0)} (${booking.existingFeedback.rating}/5)</p>
                            ${booking.existingFeedback.comment ? `<p>Comment: ${booking.existingFeedback.comment}</p>` : ''}
                        </div>
                    `;
                } else {
                    feedbackSection = `
                        <button class="btn btn-secondary" onclick="showFeedbackForm('${booking.bookingId}')" style="margin-top: 10px;">⭐ Give Feedback</button>
                    `;
                }
            }
            
            return `
                <div class="booking-card">
                    <h4>Booking #${booking.bookingId}</h4>
                    <p><strong>Service Center:</strong> ${center.name || 'N/A'}</p>
                    <p><strong>Vehicle:</strong> ${vehicle.model || 'N/A'} (${vehicle.registrationNumber || 'N/A'})</p>
                    <p><strong>Service:</strong> ${booking.serviceType}</p>
                    <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${booking.timeSlot}</p>
                    <span class="status-badge status-${statusClass}">${booking.status}</span>
                    ${booking.remarks ? `<p><strong>Remarks:</strong> ${booking.remarks}</p>` : ''}
                    ${feedbackSection}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading bookings:', error);
        const bookingsListEl = document.getElementById('bookings-list');
        if (bookingsListEl) {
            bookingsListEl.innerHTML = `<p style="color: red;">Error loading bookings: ${error.message}</p>`;
        }
    }
}

// Garage Dashboard
async function loadGarageDashboard() {
    console.log('Loading garage dashboard...');
    await loadMyCenters();
    await loadGarageBookings();
}

async function loadGarageFeedback() {
    try {
        const feedbackListEl = document.getElementById('garage-feedback-list');
        if (!feedbackListEl) {
            console.error('garage-feedback-list element not found');
            return;
        }

        feedbackListEl.innerHTML = '<p>Loading feedback...</p>';

        // Get all service centers owned by the garage owner
        const centersData = await apiCall('/centers/owner/my-centers');
        const centers = centersData.centers || [];
        
        if (centers.length === 0) {
            feedbackListEl.innerHTML = '<p>No service centers added yet</p>';
            return;
        }

        // Load feedback for all centers
        let allFeedbacks = [];
        for (const center of centers) {
            try {
                const feedbackData = await apiCall(`/feedback/center/${center.centerId}`);
                allFeedbacks = allFeedbacks.concat((feedbackData.feedbacks || []).map(f => ({
                    ...f,
                    centerName: center.name
                })));
            } catch (error) {
                console.error(`Error loading feedback for ${center.centerId}:`, error);
            }
        }
        
        if (allFeedbacks.length === 0) {
            feedbackListEl.innerHTML = '<p>No feedback received yet.</p>';
            return;
        }

        // Sort by date (newest first)
        allFeedbacks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        feedbackListEl.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Service Center</th>
                        <th>Customer</th>
                        <th>Booking ID</th>
                        <th>Service Type</th>
                        <th>Rating</th>
                        <th>Comment</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${allFeedbacks.map(feedback => {
                        const bookingInfo = feedback.bookingId?.bookingId || feedback.bookingDetails || {};
                        const userInfo = feedback.userId || {};
                        return `
                            <tr>
                                <td>${feedback.centerName || 'N/A'}</td>
                                <td>${userInfo.name || 'N/A'}${userInfo.email ? ` (${userInfo.email})` : ''}</td>
                                <td>${bookingInfo.bookingId || bookingInfo || 'N/A'}</td>
                                <td>${bookingInfo.serviceType || feedback.bookingDetails?.serviceType || 'N/A'}</td>
                                <td>${'⭐'.repeat(feedback.rating || 0)} (${feedback.rating}/5)</td>
                                <td>${feedback.comment || 'No comment'}</td>
                                <td>${new Date(feedback.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading garage feedback:', error);
        const feedbackListEl = document.getElementById('garage-feedback-list');
        if (feedbackListEl) {
            feedbackListEl.innerHTML = `<p style="color: red;">Error loading feedback: ${error.message}</p>`;
        }
    }
}

async function loadMyCenters() {
    try {
        const centersListEl = document.getElementById('centers-list');
        if (!centersListEl) {
            console.error('centers-list element not found');
            return;
        }

        centersListEl.innerHTML = '<p>Loading service centers...</p>';
        
        const data = await apiCall('/centers/owner/my-centers');
        console.log('Service centers data:', data);
        const centers = data.centers || [];
        
        console.log('Number of centers:', centers.length);
        
        if (centers.length === 0) {
            centersListEl.innerHTML = '<p>No service centers added. Add your first center!</p>';
            return;
        }
        
        centersListEl.innerHTML = centers.map(center => {
            console.log('Rendering center:', center);
            const serviceCount = center.serviceTypes ? (Array.isArray(center.serviceTypes) ? center.serviceTypes.length : 0) : 0;
            return `
                <div class="card">
                    <h3>${center.name || 'Unnamed Center'}</h3>
                    <p>📍 ${center.address || 'No address'}</p>
                    <p>📞 ${center.contact || 'No contact'}</p>
                    <p><strong>Services:</strong> ${serviceCount}</p>
                    <button class="btn btn-primary" onclick="loadCenterBookings('${center.centerId}')">View Bookings</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading centers:', error);
        const centersListEl = document.getElementById('centers-list');
        if (centersListEl) {
            centersListEl.innerHTML = `<p style="color: red;">Error loading centers: ${error.message}</p>`;
        }
    }
}

async function loadGarageBookings() {
    try {
        const bookingsListEl = document.getElementById('garage-bookings-list');
        if (!bookingsListEl) {
            console.error('garage-bookings-list element not found');
            return;
        }

        bookingsListEl.innerHTML = '<p>Loading bookings...</p>';

        const centersData = await apiCall('/centers/owner/my-centers');
        const centers = centersData.centers || [];
        
        if (centers.length === 0) {
            bookingsListEl.innerHTML = '<p>No service centers added yet</p>';
            return;
        }
        
        // Load bookings for all centers
        let allBookings = [];
        for (const center of centers) {
            try {
                const bookingsData = await apiCall(`/bookings/center/${center.centerId}`);
                allBookings = allBookings.concat(bookingsData.bookings || []);
            } catch (error) {
                console.error(`Error loading bookings for ${center.centerId}:`, error);
            }
        }
        
        if (allBookings.length === 0) {
            bookingsListEl.innerHTML = '<p>No bookings yet</p>';
            return;
        }
        
        // Sort by date
        allBookings.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        bookingsListEl.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Service</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allBookings.map(booking => {
                        const user = booking.userId || {};
                        const vehicle = booking.vehicleId || {};
                        return `
                            <tr>
                                <td>${booking.bookingId}</td>
                                <td>${user.name || 'N/A'}</td>
                                <td>${vehicle.model || 'N/A'}</td>
                                <td>${booking.serviceType}</td>
                                <td>${new Date(booking.date).toLocaleDateString()} ${booking.timeSlot}</td>
                                <td><span class="status-badge status-${booking.status.toLowerCase()}">${booking.status}</span></td>
                                <td>
                                    ${booking.status === 'Pending' ? `
                                        <button class="btn btn-success" onclick="updateBookingStatus('${booking.bookingId}', 'Confirmed')">Confirm</button>
                                        <button class="btn btn-danger" onclick="updateBookingStatus('${booking.bookingId}', 'Rejected')">Reject</button>
                                    ` : ''}
                                    ${booking.status === 'Confirmed' ? `
                                        <button class="btn btn-success" onclick="updateBookingStatus('${booking.bookingId}', 'Completed')">Complete</button>
                                    ` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading garage bookings:', error);
        const bookingsListEl = document.getElementById('garage-bookings-list');
        if (bookingsListEl) {
            bookingsListEl.innerHTML = `<p style="color: red;">Error loading bookings: ${error.message}</p>`;
        }
    }
}

// Booking Flow
async function initializeBookingFlow() {
    resetBookingFlow();
    await loadBookingVehicles();
    showBookingStep(1);
}

function resetBookingFlow() {
    selectedVehicle = null;
    selectedCenter = null;
    selectedService = null;
    bookingData = {};
}

function showBookingStep(step) {
    document.querySelectorAll('.booking-step-content').forEach(content => {
        if (content) content.classList.remove('active');
    });
    document.querySelectorAll('.step').forEach(stepEl => {
        if (stepEl) stepEl.classList.remove('active');
    });
    
    const stepContent = document.getElementById(`booking-step-${step}`);
    const stepIndicator = document.getElementById(`step-${step}`);
    
    if (stepContent) stepContent.classList.add('active');
    if (stepIndicator) stepIndicator.classList.add('active');
}

async function loadBookingVehicles() {
    try {
        const data = await apiCall('/vehicles');
        const vehicles = data.vehicles || [];
        
        if (vehicles.length === 0) {
            document.getElementById('booking-vehicles-list').innerHTML = 
                '<p>No vehicles found. Please add a vehicle first.</p>';
            return;
        }
        
        document.getElementById('booking-vehicles-list').innerHTML = vehicles.map(vehicle => `
            <div class="card ${selectedVehicle?.vehicleId === vehicle.vehicleId ? 'selected' : ''}" 
                 onclick="selectVehicle('${vehicle.vehicleId}', '${vehicle.model}', '${vehicle.registrationNumber}', this)">
                <h3>${vehicle.model}</h3>
                <p><strong>Registration:</strong> ${vehicle.registrationNumber}</p>
                <p><strong>Type:</strong> ${vehicle.type}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

function selectVehicle(vehicleId, model, regNumber, element) {
    selectedVehicle = { vehicleId, model, regNumber };
    document.querySelectorAll('#booking-vehicles-list .card').forEach(card => {
        if (card) card.classList.remove('selected');
    });
    if (element) {
        element.classList.add('selected');
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('selected');
    }
    
    setTimeout(() => {
        loadBookingCenters();
        showBookingStep(2);
    }, 300);
}

async function loadBookingCenters() {
    try {
        const centersListEl = document.getElementById('booking-centers-list');
        if (!centersListEl) {
            console.error('booking-centers-list element not found');
            return;
        }

        centersListEl.innerHTML = '<p>Loading service centers...</p>';
        
        const data = await apiCall('/centers');
        const centers = data.centers || [];
        
        if (centers.length === 0) {
            centersListEl.innerHTML = '<p>No service centers available</p>';
            return;
        }
        
        centersListEl.innerHTML = centers.map((center, index) => {
            // Store serviceTypes in a data attribute for easier access
            const serviceTypesJson = JSON.stringify(center.serviceTypes || []);
            return `
                <div class="card ${selectedCenter?.centerId === center.centerId ? 'selected' : ''}" 
                     data-center-id="${center.centerId}"
                     data-center-name="${center.name}"
                     data-service-types='${serviceTypesJson}'
                     onclick="selectCenterFromCard(this)">
                    <h3>${center.name || 'Unknown Center'}</h3>
                    <p>📍 ${center.address || 'No address'}</p>
                    <p>📞 ${center.contact || 'No contact'}</p>
                    <p><strong>Services Available:</strong> ${center.serviceTypes ? center.serviceTypes.length : 0}</p>
                </div>
            `;
        }).join('');
        
        console.log('Service centers loaded:', centers.length);
    } catch (error) {
        console.error('Error loading centers:', error);
        const centersListEl = document.getElementById('booking-centers-list');
        if (centersListEl) {
            centersListEl.innerHTML = `<p style="color: red;">Error loading service centers: ${error.message}</p>`;
        }
    }
}

function selectCenterFromCard(cardElement) {
    const centerId = cardElement.getAttribute('data-center-id');
    const name = cardElement.getAttribute('data-center-name');
    const serviceTypesJson = cardElement.getAttribute('data-service-types');
    
    if (!centerId || !name || !serviceTypesJson) {
        console.error('Missing data in card element');
        showAlert('Error selecting service center. Please try again.', 'error');
        return;
    }
    
    try {
        const serviceTypes = JSON.parse(serviceTypesJson);
        selectCenter(centerId, name, serviceTypes, cardElement);
    } catch (error) {
        console.error('Error parsing service types:', error);
        showAlert('Error loading service types. Please try again.', 'error');
    }
}

function selectCenter(centerId, name, serviceTypes, element) {
    console.log('Selecting center:', centerId, name, serviceTypes);
    
    selectedCenter = { centerId, name, serviceTypes };
    
    // Remove selected class from all cards
    document.querySelectorAll('#booking-centers-list .card').forEach(card => {
        if (card) card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    if (element) {
        element.classList.add('selected');
    }
    
    if (!serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
        showAlert('This service center has no services available. Please select another.', 'error');
        return;
    }
    
    setTimeout(() => {
        loadServiceTypes(serviceTypes);
        showBookingStep(3);
    }, 300);
}

function loadServiceTypes(serviceTypes) {
    const serviceTypesListEl = document.getElementById('service-types-list');
    if (!serviceTypesListEl) {
        console.error('service-types-list element not found');
        return;
    }
    
    if (!serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
        serviceTypesListEl.innerHTML = '<p>No services available for this center.</p>';
        return;
    }
    
    serviceTypesListEl.innerHTML = serviceTypes.map(service => {
        const serviceName = service.name || 'Unknown Service';
        const servicePrice = service.price || 0;
        return `
            <div class="service-type-card ${selectedService?.name === serviceName ? 'selected' : ''}" 
                 data-service-name="${serviceName.replace(/"/g, '&quot;')}"
                 data-service-price="${servicePrice}"
                 onclick="selectServiceFromCard(this)">
                <h4>${serviceName}</h4>
                <p class="price">₹${servicePrice}</p>
            </div>
        `;
    }).join('');
}

function selectServiceFromCard(cardElement) {
    const serviceName = cardElement.getAttribute('data-service-name').replace(/&quot;/g, '"');
    const servicePrice = parseFloat(cardElement.getAttribute('data-service-price'));
    
    if (!serviceName || !servicePrice) {
        console.error('Missing service data in card element');
        showAlert('Error selecting service. Please try again.', 'error');
        return;
    }
    
    selectService(serviceName, servicePrice, cardElement);
}

function selectService(name, price, element) {
    console.log('Selecting service:', name, price);
    selectedService = { name, price };
    
    // Remove selected class from all service cards
    document.querySelectorAll('#service-types-list .service-type-card').forEach(card => {
        if (card) card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    if (element) {
        element.classList.add('selected');
    }
    
    setTimeout(() => {
        showBookingStep(4);
    }, 300);
}

function nextBookingStep() {
    const date = document.getElementById('booking-date').value;
    const timeSlot = document.getElementById('booking-time').value;
    
    if (!date || !timeSlot) {
        showAlert('Please select both date and time', 'error');
        return;
    }
    
    bookingData = {
        vehicleId: selectedVehicle.vehicleId,
        centerId: selectedCenter.centerId,
        serviceType: selectedService.name,
        date,
        timeSlot
    };
    
    showBookingSummary();
    showBookingStep(5);
}

function showBookingSummary() {
    document.getElementById('booking-summary').innerHTML = `
        <div class="card">
            <h3>Booking Summary</h3>
            <p><strong>Vehicle:</strong> ${selectedVehicle.model} (${selectedVehicle.regNumber})</p>
            <p><strong>Service Center:</strong> ${selectedCenter.name}</p>
            <p><strong>Service:</strong> ${selectedService.name} - ₹${selectedService.price}</p>
            <p><strong>Date:</strong> ${new Date(bookingData.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${bookingData.timeSlot}</p>
        </div>
    `;
}

async function confirmBooking() {
    try {
        const data = await apiCall('/bookings', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
        
        showAlert('Booking confirmed successfully!', 'success');
        setTimeout(() => {
            showPage('customer-dashboard');
            loadBookings();
        }, 2000);
    } catch (error) {
        showAlert(error.message || 'Booking failed', 'error');
    }
}

// Tab Management
function showTab(tabName, element) {
    // Find the tab buttons container (could be in customer or garage dashboard)
    const dashboard = element ? element.closest('.page') : document.querySelector('.page.active');
    if (!dashboard) return;
    
    // Remove active from all tabs in this dashboard
    dashboard.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    dashboard.querySelectorAll('.tab-content').forEach(content => {
        if (content) content.classList.remove('active');
    });
    
    // Activate clicked tab
    if (element) {
        element.classList.add('active');
    }
    
    const tabElement = dashboard.querySelector(`#${tabName}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    } else {
        console.error(`Tab element not found: ${tabName}-tab`);
    }
}

function showGarageTab(tabName, element) {
    document.querySelectorAll('#garage-dashboard-page .tab-btn').forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    document.querySelectorAll('#garage-dashboard-page .tab-content').forEach(content => {
        if (content) content.classList.remove('active');
    });
    
    if (element) {
        element.classList.add('active');
    } else if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
    
    if (tabName === 'my-centers') {
        const tabElement = document.getElementById('my-centers-tab');
        if (tabElement) tabElement.classList.add('active');
    } else if (tabName === 'bookings') {
        const tabElement = document.getElementById('garage-bookings-tab');
        if (tabElement) tabElement.classList.add('active');
        loadGarageBookings();
    } else if (tabName === 'feedback') {
        const tabElement = document.getElementById('garage-feedback-tab');
        if (tabElement) tabElement.classList.add('active');
        loadGarageFeedback();
    }
}

// Vehicle Management
function showAddVehicleForm() {
    console.log('Opening add vehicle form...');
    const modal = document.getElementById('add-vehicle-modal');
    if (!modal) {
        console.error('Add vehicle modal not found!');
        showAlert('Error: Modal not found. Please refresh the page.', 'error');
        return;
    }
    // Ensure modal is visible
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.zIndex = '10000';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.classList.add('active');
    console.log('Modal opened successfully. Display:', modal.style.display);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

async function handleAddVehicle(e) {
    e.preventDefault();
    
    const registrationNumber = document.getElementById('vehicle-reg').value.trim();
    const model = document.getElementById('vehicle-model').value.trim();
    const type = document.getElementById('vehicle-type').value;
    const lastServiceDate = document.getElementById('vehicle-last-service').value || null;
    
    // Validate inputs
    if (!registrationNumber || !model || !type) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    const vehicleData = {
        registrationNumber,
        model,
        type,
        lastServiceDate
    };
    
    try {
        console.log('Adding vehicle:', vehicleData);
        const response = await apiCall('/vehicles', {
            method: 'POST',
            body: JSON.stringify(vehicleData)
        });
        
        console.log('Vehicle added successfully:', response);
        showAlert('Vehicle added successfully!', 'success');
        closeModal('add-vehicle-modal');
        document.getElementById('add-vehicle-form').reset();
        await loadVehicles();
    } catch (error) {
        console.error('Error adding vehicle:', error);
        showAlert(error.message || 'Failed to add vehicle', 'error');
    }
}

// Center Management
function showAddCenterForm() {
    document.getElementById('add-center-modal').classList.add('active');
}

// Helper function to clean and parse JSON
function parseServiceTypes(jsonString) {
    if (!jsonString || jsonString.trim() === '') {
        return [];
    }
    
    let cleaned = jsonString.trim();
    
    // Remove trailing commas more aggressively - handle multiple cases
    // Remove trailing commas before closing brackets/braces (including newlines)
    cleaned = cleaned.replace(/,(\s*\n\s*[}\]])/g, '$1');  // Trailing comma before closing bracket on new line
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');       // Trailing comma before closing bracket on same line
    
    // Ensure it's wrapped in array brackets if it's just objects
    cleaned = cleaned.trim();
    if (!cleaned.startsWith('[')) {
        // Check if it looks like it should be an array
        if (cleaned.includes('{')) {
            cleaned = '[' + cleaned + ']';
        }
    }
    
    try {
        // Try to parse the cleaned JSON
        return JSON.parse(cleaned);
    } catch (error) {
        // If still failing, try to extract and parse individual objects
        try {
            // Match all JSON objects in the string
            const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
            const objectMatches = cleaned.match(objectPattern);
            
            if (objectMatches && objectMatches.length > 0) {
                const parsedObjects = objectMatches.map(match => {
                    try {
                        return JSON.parse(match);
                    } catch (e) {
                        return null;
                    }
                }).filter(obj => obj !== null && typeof obj === 'object' && obj.name && typeof obj.price === 'number');
                
                if (parsedObjects.length > 0) {
                    return parsedObjects;
                }
            }
        } catch (extractError) {
            // Fall through to error message
        }
        
        // Show helpful error message
        throw new Error('Invalid JSON format. Please ensure:\n- Each service has "name" (string) and "price" (number)\n- Remove trailing commas\n- Use proper brackets: [{"name": "Service", "price": 100}]');
    }
}

async function handleAddCenter(e) {
    e.preventDefault();
    
    let serviceTypes;
    try {
        const servicesValue = document.getElementById('center-services').value;
        serviceTypes = parseServiceTypes(servicesValue);
        
        // Validate service types array
        if (!Array.isArray(serviceTypes)) {
            throw new Error('Services must be an array of objects');
        }
        
        // Validate each service object
        for (let i = 0; i < serviceTypes.length; i++) {
            const service = serviceTypes[i];
            if (!service.name || typeof service.price !== 'number') {
                throw new Error(`Service ${i + 1} is invalid. Each service must have "name" (string) and "price" (number).`);
            }
        }
        
    } catch (error) {
        showAlert(error.message || 'Invalid JSON format for services. Please check the format and try again.', 'error');
        return;
    }
    
    const centerData = {
        name: document.getElementById('center-name').value.trim(),
        address: document.getElementById('center-address').value.trim(),
        contact: document.getElementById('center-contact').value.trim(),
        serviceTypes
    };
    
    // Validate required fields
    if (!centerData.name || !centerData.address || !centerData.contact) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        await apiCall('/centers', {
            method: 'POST',
            body: JSON.stringify(centerData)
        });
        
        showAlert('Service center added successfully!', 'success');
        closeModal('add-center-modal');
        document.getElementById('add-center-form').reset();
        // Reset to default services JSON
        document.getElementById('center-services').value = `[
  {"name": "Oil Change", "price": 600},
  {"name": "Full Service", "price": 1500},
  {"name": "Washing", "price": 300}
]`;
        loadMyCenters();
    } catch (error) {
        showAlert(error.message || 'Failed to add service center', 'error');
    }
}

// Booking Status Update
async function updateBookingStatus(bookingId, status) {
    try {
        await apiCall(`/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        showAlert(`Booking ${status.toLowerCase()} successfully!`, 'success');
        loadGarageBookings();
    } catch (error) {
        showAlert(error.message || 'Failed to update status', 'error');
    }
}

function loadCenterBookings(centerId) {
    showGarageTab('bookings');
    // The loadGarageBookings function already loads all bookings
}

// Feedback
let currentFeedbackBookingId = null;

function showFeedbackForm(bookingId) {
    currentFeedbackBookingId = bookingId;
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        document.getElementById('feedback-rating').value = '';
        document.getElementById('feedback-comment').value = '';
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        currentFeedbackBookingId = null;
    }
}

async function submitFeedback(e) {
    if (e) e.preventDefault();
    
    if (!currentFeedbackBookingId) {
        showAlert('No booking selected', 'error');
        return;
    }
    
    const rating = parseInt(document.getElementById('feedback-rating').value);
    const comment = document.getElementById('feedback-comment').value || '';
    
    if (!rating || rating < 1 || rating > 5) {
        showAlert('Please select a rating between 1 and 5', 'error');
        return;
    }
    
    try {
        await apiCall('/feedback', {
            method: 'POST',
            body: JSON.stringify({ bookingId: currentFeedbackBookingId, rating, comment })
        });
        
        showAlert('Feedback submitted successfully!', 'success');
        closeFeedbackModal();
        await loadBookings();
    } catch (error) {
        showAlert(error.message || 'Failed to submit feedback', 'error');
    }
}

// Utility
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '3000';
    alert.style.minWidth = '300px';
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Close modal on outside click
document.addEventListener('click', function(event) {
    if (event.target && event.target.classList && event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        event.target.style.display = 'none';
    }
});

// Admin Dashboard Functions
function showAdminTab(tabName, element) {
    document.querySelectorAll('.dashboard-tabs .tab-btn').forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    document.querySelectorAll('#admin-dashboard-page .tab-content').forEach(content => {
        if (content) content.classList.remove('active');
    });
    
    if (element) element.classList.add('active');
    const tabContent = document.getElementById(`admin-${tabName}-tab`);
    if (tabContent) tabContent.classList.add('active');
}

async function loadAdminDashboard() {
    await loadAdminStats();
    await loadAdminServiceHistory();
    await loadAdminApprovals();
    await loadAdminUsers();
    await loadAdminFeedback();
}

async function loadAdminStats() {
    try {
        const data = await apiCall('/admin/stats');
        const stats = data.stats || {};
        
        const statsEl = document.getElementById('admin-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="stat-card">
                    <h3>${stats.totalUsers || 0}</h3>
                    <p>Total Users</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalCenters || 0}</h3>
                    <p>Service Centers</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalBookings || 0}</h3>
                    <p>Total Bookings</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.pendingApprovals || 0}</h3>
                    <p>Pending Approvals</p>
                </div>
                <div class="stat-card">
                    <h3>${stats.totalFeedback || 0}</h3>
                    <p>Total Feedback</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadAdminServiceHistory() {
    try {
        const data = await apiCall('/admin/service-history');
        const bookings = data.bookings || [];
        
        const historyEl = document.getElementById('admin-service-history-list');
        if (historyEl) {
            if (bookings.length === 0) {
                historyEl.innerHTML = '<p>No service history found.</p>';
                return;
            }
            
            historyEl.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Customer</th>
                            <th>Vehicle</th>
                            <th>Service Center</th>
                            <th>Service Type</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(booking => `
                            <tr>
                                <td>${booking.bookingId}</td>
                                <td>${booking.userId?.name || 'N/A'} (${booking.userId?.email || 'N/A'})</td>
                                <td>${booking.vehicleId?.model || 'N/A'} - ${booking.vehicleId?.registrationNumber || 'N/A'}</td>
                                <td>${booking.centerId?.name || 'N/A'}</td>
                                <td>${booking.serviceType}</td>
                                <td>${new Date(booking.date).toLocaleDateString()}</td>
                                <td>${booking.timeSlot}</td>
                                <td><span class="status-badge status-${booking.status.toLowerCase()}">${booking.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading service history:', error);
        const historyEl = document.getElementById('admin-service-history-list');
        if (historyEl) {
            historyEl.innerHTML = `<p style="color: red;">Error loading service history: ${error.message}</p>`;
        }
    }
}

async function loadAdminApprovals() {
    try {
        const data = await apiCall('/admin/service-centers');
        const centers = data.centers || [];
        const pendingCenters = centers.filter(c => (c.approvalStatus || 'pending') === 'pending');
        
        const approvalsEl = document.getElementById('admin-approvals-list');
        if (approvalsEl) {
            if (pendingCenters.length === 0) {
                approvalsEl.innerHTML = '<p>No pending approvals.</p>';
                return;
            }
            
            approvalsEl.innerHTML = `
                <div class="centers-grid">
                    ${pendingCenters.map(center => `
                        <div class="card">
                            <h3>${center.name}</h3>
                            <p><strong>Owner:</strong> ${center.ownerId?.name || 'N/A'} (${center.ownerId?.email || 'N/A'})</p>
                            <p><strong>Address:</strong> ${center.address}</p>
                            <p><strong>Contact:</strong> ${center.contact}</p>
                            <p><strong>Services:</strong> ${center.serviceTypes?.length || 0} service types</p>
                            <p><strong>Status:</strong> <span class="status-badge status-pending">${center.approvalStatus || 'pending'}</span></p>
                            <div style="margin-top: 15px;">
                                <button class="btn btn-success" onclick="approveCenter('${center.centerId}')" style="margin-right: 10px;">✓ Approve</button>
                                <button class="btn btn-danger" onclick="rejectCenter('${center.centerId}')">✗ Reject</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Also show all centers with their status
        const allCentersEl = document.createElement('div');
        allCentersEl.innerHTML = `
            <h4 style="margin-top: 30px;">All Service Centers</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Center Name</th>
                        <th>Owner</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${centers.map(center => `
                        <tr>
                            <td>${center.name}</td>
                            <td>${center.ownerId?.name || 'N/A'}</td>
                            <td>${center.address}</td>
                            <td><span class="status-badge status-${(center.approvalStatus || 'pending').toLowerCase()}">${center.approvalStatus || 'pending'}</span></td>
                            <td>
                                ${(center.approvalStatus || 'pending') !== 'approved' ? 
                                    `<button class="btn btn-success btn-sm" onclick="approveCenter('${center.centerId}')">Approve</button>` : ''}
                                ${(center.approvalStatus || 'pending') !== 'rejected' ? 
                                    `<button class="btn btn-danger btn-sm" onclick="rejectCenter('${center.centerId}')">Reject</button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        if (approvalsEl) {
            approvalsEl.appendChild(allCentersEl);
        }
    } catch (error) {
        console.error('Error loading approvals:', error);
        const approvalsEl = document.getElementById('admin-approvals-list');
        if (approvalsEl) {
            approvalsEl.innerHTML = `<p style="color: red;">Error loading approvals: ${error.message}</p>`;
        }
    }
}

async function approveCenter(centerId) {
    try {
        await apiCall(`/admin/service-centers/${centerId}/approval`, {
            method: 'PUT',
            body: JSON.stringify({ approvalStatus: 'approved' })
        });
        showAlert('Service center approved successfully!', 'success');
        await loadAdminApprovals();
        await loadAdminStats();
    } catch (error) {
        showAlert(error.message || 'Failed to approve service center', 'error');
    }
}

async function rejectCenter(centerId) {
    if (!confirm('Are you sure you want to reject this service center?')) {
        return;
    }
    try {
        await apiCall(`/admin/service-centers/${centerId}/approval`, {
            method: 'PUT',
            body: JSON.stringify({ approvalStatus: 'rejected' })
        });
        showAlert('Service center rejected successfully!', 'success');
        await loadAdminApprovals();
        await loadAdminStats();
    } catch (error) {
        showAlert(error.message || 'Failed to reject service center', 'error');
    }
}

async function loadAdminUsers() {
    try {
        const data = await apiCall('/admin/users');
        const users = data.users || [];
        
        const usersEl = document.getElementById('admin-users-list');
        if (usersEl) {
            if (users.length === 0) {
                usersEl.innerHTML = '<p>No users found.</p>';
                return;
            }
            
            usersEl.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Contact</th>
                            <th>Location</th>
                            <th>Bookings</th>
                            <th>Vehicles</th>
                            <th>Centers</th>
                            <th>Feedback</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td><span class="status-badge">${user.role}</span></td>
                                <td>${user.contact}</td>
                                <td>${user.location}</td>
                                <td>${user.stats?.bookings || 0}</td>
                                <td>${user.stats?.vehicles || 0}</td>
                                <td>${user.stats?.centers || 0}</td>
                                <td>${user.stats?.feedback || 0}</td>
                                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        const usersEl = document.getElementById('admin-users-list');
        if (usersEl) {
            usersEl.innerHTML = `<p style="color: red;">Error loading users: ${error.message}</p>`;
        }
    }
}

async function loadAdminFeedback() {
    try {
        const data = await apiCall('/admin/feedback');
        const feedbacks = data.feedbacks || [];
        
        const feedbackEl = document.getElementById('admin-feedback-list');
        if (feedbackEl) {
            if (feedbacks.length === 0) {
                feedbackEl.innerHTML = '<p>No feedback found.</p>';
                return;
            }
            
            feedbackEl.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Booking</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${feedbacks.map(feedback => `
                            <tr>
                                <td>${feedback.userId?.name || 'N/A'} (${feedback.userId?.email || 'N/A'})</td>
                                <td>${feedback.bookingId?.bookingId || 'N/A'} - ${feedback.bookingId?.serviceType || 'N/A'}</td>
                                <td>${'⭐'.repeat(feedback.rating || 0)} (${feedback.rating}/5)</td>
                                <td>${feedback.comment || 'No comment'}</td>
                                <td>${new Date(feedback.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-danger btn-sm" onclick="deleteFeedback('${feedback.feedbackId}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading feedback:', error);
        const feedbackEl = document.getElementById('admin-feedback-list');
        if (feedbackEl) {
            feedbackEl.innerHTML = `<p style="color: red;">Error loading feedback: ${error.message}</p>`;
        }
    }
}

async function deleteFeedback(feedbackId) {
    if (!confirm('Are you sure you want to delete this feedback?')) {
        return;
    }
    try {
        await apiCall(`/admin/feedback/${feedbackId}`, {
            method: 'DELETE'
        });
        showAlert('Feedback deleted successfully!', 'success');
        await loadAdminFeedback();
        await loadAdminStats();
    } catch (error) {
        showAlert(error.message || 'Failed to delete feedback', 'error');
    }
}

