// DOM Elements - Will be initialized based on the current page
let googleLoginBtn;
let logoutBtn;
let deliveryAgentRegistrationForm;
let onlineStatusToggle;
let refreshBtn;
let deliveriesContainer;
let noDeliveries;
let debugStatus;
let profileForm;
let saveSettingsBtn;
let deliveryHistoryContainer;

// Current user data
let currentUser = null;
let currentUserData = null;
let currentLocation = null;



// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCadZIoYzIc_QhEkGjv86G4rjFwMASd5ig",
  authDomain: "nothing-d3af4.firebaseapp.com",
  databaseURL: "https://nothing-d3af4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nothing-d3af4",
  storageBucket: "nothing-d3af4.firebasestorage.app",
  messagingSenderId: "7155955115",
  appId: "1:7155955115:web:3bd80618f9aff1a4dc8eee",
  measurementId: "G-XSVGL2M8LL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth and Firestore references
const auth = firebase.auth();
const db = firebase.firestore();

// Google authentication provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Function to handle admin access
function isAdmin(email) {
    // For development purposes, allow all users to access admin
    return true;
    
    // Uncomment below for production to restrict access
    /*
    const adminEmails = [
        'admin@example.com',
        // Add more admin emails as needed
    ];
    
    return adminEmails.includes(email);
    */
} 

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize common elements
    googleLoginBtn = document.getElementById('googleLogin');
    logoutBtn = document.getElementById('logoutBtn');
    debugStatus = document.getElementById('debug-status');
    
    // Set up Google login button if on index page
    if (googleLoginBtn && window.location.pathname.includes('delivery_agent/index.html')) {
        googleLoginBtn.addEventListener('click', () => {
            auth.signInWithPopup(googleProvider)
                .catch(error => {
                    console.error('Google login error:', error);
                    updateDebug(`Google login error: ${error.message}`);
                    alert('Error signing in with Google. Please try again.');
                });
        });
    }
    
    // Set up logout button if it exists
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut();
        });
    }
    
    // Test Firebase connection
    testFirebaseConnection();
    
    // Initialize page-specific elements based on the current page
    initPageElements();
});

// Helper function to update debug information
function updateDebug(message) {
    if (debugStatus) {
        debugStatus.textContent = message;
        console.log('Debug:', message);
    }
}

// Test Firebase connection
function testFirebaseConnection() {
    updateDebug('Testing Firebase connection...');
    
    try {
        // Check if we have Firebase initialized
        if (!firebase || !firebase.app) {
            updateDebug('ERROR: Firebase not initialized');
            return;
        }
        
        // Check Firestore connection by fetching a simple document
        db.collection('bloodRequests').limit(1).get()
            .then(() => {
                updateDebug('Firebase connection successful');
            })
            .catch(error => {
                updateDebug(`Firebase connection error: ${error.message}`);
                console.error('Firebase connection test failed:', error);
            });
    } catch (error) {
        updateDebug(`Firebase connection test error: ${error.message}`);
        console.error('Firebase connection test error:', error);
    }
}

// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log('User logged in:', user.email);
        updateDebug(`User authenticated: ${user.email}`);
        currentUser = user;
        
        // Check if we're on the registration page
        if (window.location.pathname.includes('registration.html')) {
            // Let the registration page handle the user
            initRegistrationPage(user);
            return;
        }
        
        // Check if user exists in our database as a delivery agent
        db.collection('deliveryAgents').doc(user.uid).get()
            .then((doc) => {
                if (!doc.exists) {
                    // User doesn't exist as a delivery agent, redirect to registration
                    console.log('New delivery agent, redirecting to registration');
                    window.location.href = 'registration.html';
                } else {
                    // User exists, store data and initialize the page
                    currentUserData = doc.data();
                    if (window.location.pathname.includes('index.html')) {
                        window.location.href = 'dashboard.html';
                    } else {
                        initPageElements();
                        loadPageData();
                    }
                }
            })
            .catch(error => {
                console.error('Error checking user in database:', error);
                updateDebug(`ERROR: ${error.message}`);
            });
    } else {
        // User is signed out
        console.log('User logged out');
        updateDebug('User not authenticated, redirecting...');
        currentUser = null;
        currentUserData = null;
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Initialize page elements based on the current page
function initPageElements() {
    const currentPath = window.location.pathname;
    console.log('Initializing page elements for path:', currentPath);
    
    if (currentPath.includes('delivery_agent/dashboard.html') || currentPath.includes('delivery.html')) {
        // Dashboard page elements
        onlineStatusToggle = document.getElementById('onlineStatusToggle');
        refreshBtn = document.getElementById('refreshBtn');
        deliveriesContainer = document.getElementById('deliveriesContainer');
        noDeliveries = document.getElementById('noDeliveries');
        
        // Set up event listeners
        if (onlineStatusToggle) {
            onlineStatusToggle.addEventListener('change', toggleOnlineStatus);
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshDeliveries);
        }
    } else if (currentPath.includes('delivery_agent/profile.html') || currentPath.includes('delivery-profile.html')) {
        // Profile page elements
        profileForm = document.getElementById('profileForm');
        saveSettingsBtn = document.getElementById('saveSettingsBtn');
        
        // Set up event listeners
        if (profileForm) {
            profileForm.addEventListener('submit', updateProfile);
        }
    } else if (currentPath.includes('delivery_agent/history.html') || currentPath.includes('delivery-history.html')) {
        // History page elements
        deliveryHistoryContainer = document.getElementById('deliveryHistoryContainer');
        initSearchAndFilters(); // Initialize search and filters
    } else if (currentPath.includes('delivery_agent/registration.html')) {
        // Registration page elements
        deliveryAgentRegistrationForm = document.getElementById('deliveryAgentRegistrationForm');
        googleLoginBtn = document.getElementById('googleLogin');
        
        // Set up event listeners
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => {
                auth.signInWithPopup(googleProvider)
                    .catch(error => {
                        console.error('Google login error:', error);
                        updateDebug(`Google login error: ${error.message}`);
                    });
            });
        }
        
        if (deliveryAgentRegistrationForm) {
            deliveryAgentRegistrationForm.addEventListener('submit', registerDeliveryAgent);
        }
    } else if (currentPath.includes('delivery_agent/delivery_details.html')) {
        // Delivery details page elements
        const markDeliveredBtn = document.getElementById('mark-delivered-btn');
        const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
        const getPickupDirectionsBtn = document.getElementById('get-pickup-directions');
        const getDropDirectionsBtn = document.getElementById('get-drop-directions');
        
        // Set up event listeners
        if (markDeliveredBtn) {
            markDeliveredBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to mark this delivery as delivered?')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const deliveryId = urlParams.get('id');
                    if (deliveryId) {
                        markDeliveryAsCompleted(deliveryId);
                    } else {
                        alert('Delivery ID not found');
                    }
                }
            });
        }
        
        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => {
                window.location.href = 'dashboard.html';
            });
        }
        
        if (getPickupDirectionsBtn) {
            getPickupDirectionsBtn.addEventListener('click', () => {
                const pickupAddress = document.getElementById('pickup-address').textContent;
                if (pickupAddress) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`, '_blank');
                }
            });
        }
        
        if (getDropDirectionsBtn) {
            getDropDirectionsBtn.addEventListener('click', () => {
                const dropAddress = document.getElementById('drop-address').textContent;
                if (dropAddress) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropAddress)}`, '_blank');
                }
            });
        }
        
        // Load delivery details
        const urlParams = new URLSearchParams(window.location.search);
        const deliveryId = urlParams.get('id');
        if (deliveryId) {
            loadDeliveryDetails(deliveryId);
        } else {
            updateDebug('No delivery ID provided');
        }
    }
}

// Load page data based on the current page
function loadPageData() {
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('delivery_agent/dashboard.html') || currentPath.includes('delivery.html')) {
        // Load available deliveries
        loadAvailableDeliveries();
        
        // Get current location
        getCurrentLocation()
            .then(location => {
                currentLocation = location;
                console.log('Current location:', location);
            })
            .catch(error => {
                console.error('Error getting location:', error);
                updateDebug(`Location error: ${error.message}`);
            });
    } else if (currentPath.includes('delivery_agent/profile.html') || currentPath.includes('delivery-profile.html')) {
        // Load profile data
        loadProfileData();
    } else if (currentPath.includes('delivery_agent/history.html') || currentPath.includes('delivery-history.html')) {
        // Load delivery history
        loadDeliveryHistory();
    } else if (currentPath.includes('delivery_agent/delivery_details.html')) {
        // Load delivery details
        const urlParams = new URLSearchParams(window.location.search);
        const deliveryId = urlParams.get('id');
        if (deliveryId) {
            loadDeliveryDetails(deliveryId);
        } else {
            updateDebug('No delivery ID provided');
            alert('No delivery ID provided. Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        }
    }
}

// Toggle online status
function toggleOnlineStatus() {
    if (!currentUser) return;
    
    const isOnline = onlineStatusToggle.checked;
    updateDebug(`Setting online status to: ${isOnline ? 'Online' : 'Offline'}`);
    
    // Update user status in database
    db.collection('deliveryAgents').doc(currentUser.uid).update({
        isOnline: isOnline,
        lastStatusUpdate: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        updateDebug(`Status updated to: ${isOnline ? 'Online' : 'Offline'}`);
        
        // If going online, refresh deliveries
        if (isOnline) {
            refreshDeliveries();
        } else {
            // If going offline, clear deliveries
            if (deliveriesContainer) {
                deliveriesContainer.innerHTML = '';
            }
            if (noDeliveries) {
                noDeliveries.classList.remove('d-none');
                noDeliveries.textContent = 'You are currently offline. Go online to see available deliveries.';
            }
        }
    })
    .catch(error => {
        console.error('Error updating status:', error);
        updateDebug(`Error updating status: ${error.message}`);
        
        // Revert toggle if update failed
        onlineStatusToggle.checked = !isOnline;
    });
}

// Refresh available deliveries
function refreshDeliveries() {
    if (!currentUser || !onlineStatusToggle || !onlineStatusToggle.checked) {
        updateDebug('Cannot refresh: User is offline or not authenticated');
        return;
    }
    
    updateDebug('Refreshing available deliveries...');
    loadAvailableDeliveries();
}

// Load available deliveries
function loadAvailableDeliveries() {
    if (!deliveriesContainer || !currentUser) {
        updateDebug('Cannot load deliveries: Container or user not initialized');
        return;
    }
    
    // Clear existing deliveries
    deliveriesContainer.innerHTML = '';
    
    // Show loading message
    updateDebug('Loading available deliveries...');
    
    // Get current location first
    getCurrentLocation()
        .then(location => {
            currentLocation = location;
            updateDebug('Location obtained, fetching deliveries...');
            
            // Set up real-time listener for blood requests
            return db.collection('bloodRequests')
                .where('status', '==', 'found')
                .where('deliveryStatus', '==', 'pending')
                .onSnapshot(snapshot => {
                    console.log('Received snapshot with', snapshot.size, 'documents');
                    
                    // Clear existing deliveries
                    deliveriesContainer.innerHTML = '';
                    
                    if (snapshot.empty) {
                        updateDebug('No deliveries available');
                        if (noDeliveries) {
                            noDeliveries.classList.remove('d-none');
                            noDeliveries.textContent = 'No deliveries available at the moment. Please check back later.';
                        }
                        return;
                    }
                    
                    // Hide no deliveries message
                    if (noDeliveries) {
                        noDeliveries.classList.add('d-none');
                    }
                    
                    // Convert snapshot to array
                    const deliveries = [];
                    snapshot.forEach(doc => {
                        const requestData = doc.data();
                        console.log('Processing request:', doc.id);
                        console.log('Patient Name:', requestData.patientName);
                        console.log('Status:', requestData.status);
                        console.log('Delivery Status:', requestData.deliveryStatus);
                        
                        // Check if this agent hasn't rejected this request
                        const isAvailable = !requestData.rejectedAgents || !requestData.rejectedAgents.includes(currentUser.uid);
                        
                        console.log('Is Available:', isAvailable);
                        console.log('-------------------');
                        
                        if (isAvailable) {
                            deliveries.push({
                                id: doc.id,
                                data: requestData
                            });
                        }
                    });
                    
                    console.log('Filtered deliveries:', deliveries.length);
                    
                    // Show all available deliveries
                    updateDebug(`Showing ${deliveries.length} available deliveries`);
                    
                    // Process each delivery
                    deliveries.forEach(delivery => {
                        createDeliveryCard(delivery.id, delivery.data);
                    });
                }, error => {
                    console.error('Error setting up deliveries listener:', error);
                    updateDebug(`Error loading deliveries: ${error.message}`);
                    if (noDeliveries) {
                        noDeliveries.classList.remove('d-none');
                        noDeliveries.textContent = 'Error loading deliveries. Please try refreshing.';
                    }
                });
        })
        .catch(error => {
            console.error('Error getting location:', error);
            updateDebug(`Error: ${error.message}`);
            if (noDeliveries) {
                noDeliveries.classList.remove('d-none');
                noDeliveries.innerHTML = `
                    <div class="alert alert-warning">
                        <h5>Location Access Required</h5>
                        <p>${error.message}</p>
                        <p>Please follow these steps:</p>
                        <ol>
                            <li>Click the lock/info icon in your browser's address bar</li>
                            <li>Find "Location" in the permissions list</li>
                            <li>Change it to "Allow"</li>
                            <li>Refresh this page</li>
                        </ol>
                        <button class="btn btn-primary mt-3" onclick="window.location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> Refresh Page
                        </button>
                    </div>
                `;
            }
        });
}

// Create a delivery card
function createDeliveryCard(requestId, requestData) {
    if (!deliveriesContainer || !currentLocation) {
        console.error('Cannot create delivery card: Container or location not initialized');
        return;
    }
    
    console.log('Creating delivery card for request:', requestId, requestData);
    
    // Get template
    const template = document.getElementById('deliveryTemplate');
    if (!template) {
        console.error('Delivery template not found');
        return;
    }
    
    // Clone template
    const deliveryCard = template.content.cloneNode(true);
    
    // Calculate distances
    const donorLocation = requestData.donorLocation || { latitude: 0, longitude: 0 };
    const recipientLocation = requestData.recipientLocation || { latitude: 0, longitude: 0 };
    
    const pickupDistance = calculateDistance(
        currentLocation.latitude, 
        currentLocation.longitude, 
        donorLocation.latitude, 
        donorLocation.longitude
    );
    
    const dropDistance = calculateDistance(
        donorLocation.latitude, 
        donorLocation.longitude, 
        recipientLocation.latitude, 
        recipientLocation.longitude
    );
    
    // Set card data
    const priceElement = deliveryCard.querySelector('.order-price');
    if (priceElement) {
        priceElement.style.display = 'none';
    }
    
    const commissionElement = deliveryCard.querySelector('.order-commission');
    if (commissionElement) {
        commissionElement.style.display = 'none';
    }
    
    // Set status badge based on user's online status
    const isAgentOnline = onlineStatusToggle && onlineStatusToggle.checked;
    const statusBadge = deliveryCard.querySelector('.status-badge');
    statusBadge.textContent = isAgentOnline ? 'Online' : 'Offline';
    statusBadge.classList.add(isAgentOnline ? 'bg-success' : 'bg-secondary');
    
    // Set pickup location (donor location)
    const pickupAddress = requestData.donorHospital || requestData.donorAddress || 'Donor Location';
    deliveryCard.querySelector('.pickup-address').textContent = pickupAddress;
    deliveryCard.querySelector('.pickup-details').textContent = `${pickupDistance.toFixed(1)} km away • ${requestData.bloodGroup || 'Unknown'} Blood • ${requestData.units || 1} units`;
    
    // Set drop location (recipient hospital)
    deliveryCard.querySelector('.drop-address').textContent = requestData.hospital || 'Recipient Hospital';
    deliveryCard.querySelector('.drop-details').textContent = `${dropDistance.toFixed(1)} km from pickup • ${requestData.urgency || 'Regular'}`;
    
    // Add the card to the container
    const cardElement = deliveryCard.querySelector('.col-md-6');
    if (cardElement) {
        cardElement.setAttribute('data-request-id', requestId);
        deliveriesContainer.appendChild(cardElement);
        
        // Set up event listeners after the card is added to the DOM
        const declineBtn = cardElement.querySelector('.decline-btn');
        const acceptBtn = cardElement.querySelector('.accept-btn');
        
        if (declineBtn) {
            declineBtn.addEventListener('click', async () => {
                try {
                    // First check if the request is still available
                    const requestDoc = await db.collection('bloodRequests').doc(requestId).get();
                    if (!requestDoc.exists) {
                        throw new Error('Request no longer exists');
                    }
                    
                    const requestData = requestDoc.data();
                    if (requestData.deliveryStatus && requestData.deliveryStatus !== 'pending') {
                        throw new Error('This request has already been assigned to another delivery agent');
                    }
                    
                    // Update the request to indicate it was declined
                    await db.collection('bloodRequests').doc(requestId).update({
                        rejectedAgents: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                        lastRejectedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Remove the card with animation
                    cardElement.style.transition = 'opacity 0.3s ease-out';
                    cardElement.style.opacity = '0';
                    setTimeout(() => cardElement.remove(), 300);
                    
                    // Show success message
                    updateDebug('Delivery declined successfully');
                } catch (error) {
                    console.error('Error declining delivery:', error);
                    alert(error.message || 'Error declining delivery. Please try again.');
                }
            });
        }
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                // Check if agent is online
                if (!onlineStatusToggle || !onlineStatusToggle.checked) {
                    alert('Please set your status to online before accepting deliveries.');
                    return;
                }
                
                // Show the delivery details modal
                const modal = document.getElementById('deliveryDetailsModal');
                if (!modal) {
                    console.error('Delivery details modal not found');
                    return;
                }
                
                console.log('Showing modal for request:', requestId);
                console.log('Request data:', requestData);
                
                // Show delivery details in modal
                showDeliveryDetails(requestId, requestData);
            });
        }
    }
    
    // Start countdown timer (45 seconds)
    startCountdownTimer(cardElement, requestId, 45);
}

// Start countdown timer for a delivery card
function startCountdownTimer(deliveryCard, requestId, seconds) {
    const countdownElement = deliveryCard.querySelector('.countdown');
    const progressBar = deliveryCard.querySelector('.progress-bar');
    
    if (!countdownElement || !progressBar) return;
    
    let timeLeft = seconds;
    countdownElement.textContent = timeLeft;
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
        // Update progress bar
        const progressPercentage = (timeLeft / seconds) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        
        if (timeLeft <= 10) {
            progressBar.classList.remove('bg-warning');
            progressBar.classList.add('bg-danger');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            
            // Remove the card when time expires
            const cardElement = deliveryCard.closest('.col-md-6');
            if (cardElement) {
                // Fade out animation
                cardElement.style.transition = 'opacity 0.5s';
                cardElement.style.opacity = '0';
                
                setTimeout(() => {
                    cardElement.remove();
                    
                    // Update the request to indicate it was not accepted in time
                    db.collection('bloodRequests').doc(requestId).update({
                        rejectedAgents: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
                        lastRejectedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(error => {
                        console.error('Error updating request:', error);
                    });
                }, 500);
            }
        }
    }, 1000);
    
    // Store the interval ID on the card element for cleanup
    deliveryCard.dataset.timerInterval = timerInterval;
}

// Show delivery details in modal
function showDeliveryDetails(requestId, requestData) {
    // Get modal elements
    const modal = document.getElementById('deliveryDetailsModal');
    if (!modal) {
        console.error('Delivery details modal not found');
        return;
    }
    
    console.log('Showing delivery details for request:', requestId);
    console.log('Request data:', requestData);
    
    // Set modal data
    const donorName = document.getElementById('modal-donor-name');
    const donorBloodGroup = document.getElementById('modal-donor-blood-group');
    const donorContact = document.getElementById('modal-donor-contact');
    const donorAddress = document.getElementById('modal-donor-address');
    const patientName = document.getElementById('modal-patient-name');
    const recipientBloodGroup = document.getElementById('modal-recipient-blood-group');
    const units = document.getElementById('modal-units');
    const hospital = document.getElementById('modal-hospital');
    const recipientContact = document.getElementById('modal-recipient-contact');
    const pickupAddress = document.getElementById('modal-pickup-address');
    const dropAddress = document.getElementById('modal-drop-address');
    
    if (donorName) donorName.textContent = requestData.donorName || 'Not available';
    if (donorBloodGroup) donorBloodGroup.textContent = requestData.bloodGroup || 'Not available';
    if (donorContact) donorContact.textContent = requestData.donorContact || 'Not available';
    if (donorAddress) donorAddress.textContent = requestData.donorAddress || requestData.donorHospital || 'Not available';
    
    if (patientName) patientName.textContent = requestData.patientName || 'Not available';
    if (recipientBloodGroup) recipientBloodGroup.textContent = requestData.bloodGroup || 'Not available';
    if (units) units.textContent = requestData.units || '1';
    if (hospital) hospital.textContent = requestData.hospital || 'Not available';
    if (recipientContact) recipientContact.textContent = requestData.contactNumber || 'Not available';
    
    if (pickupAddress) pickupAddress.textContent = requestData.donorAddress || requestData.donorHospital || 'Not available';
    if (dropAddress) dropAddress.textContent = requestData.address || requestData.hospital || 'Not available';
    
    // Set up directions buttons
    const getPickupDirectionsBtn = document.getElementById('getPickupDirections');
    const getDropDirectionsBtn = document.getElementById('getDropDirections');
    
    if (getPickupDirectionsBtn) {
        getPickupDirectionsBtn.onclick = () => {
            const pickupAddress = document.getElementById('modal-pickup-address').textContent;
            if (pickupAddress && pickupAddress !== 'Not available') {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`, '_blank');
            }
        };
    }
    
    if (getDropDirectionsBtn) {
        getDropDirectionsBtn.onclick = () => {
            const dropAddress = document.getElementById('modal-drop-address').textContent;
            if (dropAddress && dropAddress !== 'Not available') {
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropAddress)}`, '_blank');
            }
        };
    }
    
    // Set up confirm button
    const confirmAcceptBtn = document.getElementById('confirmAcceptBtn');
    if (confirmAcceptBtn) {
        // Store the request data
        confirmAcceptBtn.setAttribute('data-request-id', requestId);
        confirmAcceptBtn.setAttribute('data-request-data', JSON.stringify(requestData));
        
        // Remove any existing click handlers
        const newConfirmBtn = confirmAcceptBtn.cloneNode(true);
        confirmAcceptBtn.parentNode.replaceChild(newConfirmBtn, confirmAcceptBtn);
        
        // Add new click handler
        newConfirmBtn.addEventListener('click', () => {
            const requestId = newConfirmBtn.getAttribute('data-request-id');
            const requestData = JSON.parse(newConfirmBtn.getAttribute('data-request-data') || '{}');
            if (requestId) {
                acceptDelivery(requestId, requestData);
            }
        });
    }
    
    // Show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Accept delivery
function acceptDelivery(requestId, requestData) {
    if (!currentUser) {
        throw new Error('You must be logged in to accept deliveries');
    }
    
    // Get delivery notes from modal
    const deliveryNotes = document.getElementById('deliveryNotes').value;
    
    // First check if the request is still available
    db.collection('bloodRequests').doc(requestId).get()
        .then(doc => {
            if (!doc.exists) {
                throw new Error('Request no longer exists');
            }
            
            const currentData = doc.data();
            if (currentData.deliveryStatus && currentData.deliveryStatus !== 'pending') {
                throw new Error('This request has already been assigned to another delivery agent');
            }
            
            // Update the request in the database
            return db.collection('bloodRequests').doc(requestId).update({
                status: 'in_progress',
                deliveryStatus: 'assigned',
                deliveryAgentId: currentUser.uid,
                deliveryAgentName: currentUserData ? currentUserData.fullName : currentUser.displayName,
                deliveryAgentContact: currentUserData ? currentUserData.phoneNumber : 'Not available',
                deliveryAssignedAt: firebase.firestore.FieldValue.serverTimestamp(),
                deliveryNotes: deliveryNotes,
                statusHistory: firebase.firestore.FieldValue.arrayUnion({
                    status: 'in_progress',
                    comment: `Delivery accepted by ${currentUserData ? currentUserData.fullName : currentUser.displayName}`,
                    timestamp: new Date().toISOString()
                })
            }).then(() => currentData); // Return the current data for the next step
        })
        .then((requestData) => {
            updateDebug('Delivery accepted successfully');
            
            // Create a delivery record with all necessary data
            return db.collection('deliveries').add({
                requestId: requestId,
                deliveryAgentId: currentUser.uid,
                deliveryAgentName: currentUserData ? currentUserData.fullName : currentUser.displayName,
                patientName: requestData.patientName || 'Not available',
                donorName: requestData.donorName || 'Not available',
                bloodGroup: requestData.bloodGroup || 'Not available',
                units: requestData.units || '1',
                pickupLocation: requestData.donorAddress || requestData.donorHospital || 'Not available',
                dropLocation: requestData.address || requestData.hospital || 'Not available',
                donorContact: requestData.donorContact || 'Not available',
                recipientContact: requestData.contactNumber || 'Not available',
                urgency: requestData.urgency || 'Regular',
                status: 'in_progress',
                notes: deliveryNotes,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                statusHistory: [{
                    status: 'in_progress',
                    comment: 'Delivery accepted',
                    timestamp: new Date().toISOString()
                }]
            });
        })
        .then((docRef) => {
            // Close the modal
            const modal = document.getElementById('deliveryDetailsModal');
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
            
            // Show success message
            alert('Delivery accepted successfully! Redirecting to delivery details...');
            
            // Redirect to delivery details page
            window.location.href = `delivery_details.html?id=${docRef.id}`;
        })
        .catch(error => {
            console.error('Error accepting delivery:', error);
            updateDebug(`Error accepting delivery: ${error.message}`);
            alert(error.message || 'Error accepting delivery. Please try again.');
        });
}

// Initialize registration page
function initRegistrationPage(user) {
    if (!deliveryAgentRegistrationForm) return;
    
    // Pre-fill email if user is logged in
    const emailInput = document.getElementById('email');
    if (emailInput && user) {
        emailInput.value = user.email;
        emailInput.readOnly = true;
    }
}

// Register delivery agent
function registerDeliveryAgent(e) {
    e.preventDefault();
    
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Registering delivery agent...');
    
    // Get form data
    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const vehicleType = document.getElementById('vehicleType').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const address = document.getElementById('address').value;
    
    // Get location data
    const locationDataInput = document.getElementById('location-data');
    let locationData = null;
    
    if (locationDataInput && locationDataInput.value) {
        try {
            locationData = JSON.parse(locationDataInput.value);
        } catch (error) {
            console.error('Error parsing location data:', error);
        }
    }
    
    // Create delivery agent data
    const deliveryAgentData = {
        userId: currentUser.uid,
        fullName,
        email,
        phoneNumber,
        vehicleType,
        vehicleNumber,
        address,
        location: locationData,
        isOnline: false,
        isApproved: true, // Auto-approve for now
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to database
    db.collection('deliveryAgents').doc(currentUser.uid).set(deliveryAgentData)
        .then(() => {
            updateDebug('Delivery agent registered successfully');
            alert('Registration successful! You can now start accepting deliveries.');
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        })
        .catch(error => {
            console.error('Error registering delivery agent:', error);
            updateDebug(`Error registering: ${error.message}`);
            alert('Error registering. Please try again.');
        });
}

// Load profile data
function loadProfileData() {
    if (!currentUser || !profileForm) return;
    
    updateDebug('Loading profile data...');
    
    // Get profile data from database
    db.collection('deliveryAgents').doc(currentUser.uid).get()
        .then(doc => {
            if (!doc.exists) {
                updateDebug('Profile not found');
                return;
            }
            
            const data = doc.data();
            
            // Fill form fields
            document.getElementById('fullName').value = data.fullName || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('phoneNumber').value = data.phoneNumber || '';
            document.getElementById('vehicleType').value = data.vehicleType || '';
            document.getElementById('vehicleNumber').value = data.vehicleNumber || '';
            document.getElementById('address').value = data.address || '';
            
            updateDebug('Profile data loaded');
        })
        .catch(error => {
            console.error('Error loading profile:', error);
            updateDebug(`Error loading profile: ${error.message}`);
        });
}

// Update profile
function updateProfile(e) {
    e.preventDefault();
    
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Updating profile...');
    
    // Get form data
    const fullName = document.getElementById('fullName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const vehicleType = document.getElementById('vehicleType').value;
    const vehicleNumber = document.getElementById('vehicleNumber').value;
    const address = document.getElementById('address').value;
    
    // Update profile data
    db.collection('deliveryAgents').doc(currentUser.uid).update({
        fullName,
        phoneNumber,
        vehicleType,
        vehicleNumber,
        address,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        updateDebug('Profile updated successfully');
        alert('Profile updated successfully!');
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        updateDebug(`Error updating profile: ${error.message}`);
        alert('Error updating profile. Please try again.');
    });
}

// Load delivery history with search and filters
function loadDeliveryHistory() {
    if (!currentUser || !deliveryHistoryContainer) return;
    
    updateDebug('Loading delivery history...');
    
    // Get filter values
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const dateFilter = document.getElementById('dateFilter')?.value || 'all';
    const searchQuery = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    
    // Clear existing history
    deliveryHistoryContainer.innerHTML = '';
    
    // Create base query
    let query = db.collection('deliveries')
        .where('deliveryAgentId', '==', currentUser.uid);
    
    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
        query = query.where('status', '==', statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (dateFilter) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }
        
        if (startDate) {
            query = query.where('createdAt', '>=', startDate);
        }
    }
    
    // Order by creation date
    query = query.orderBy('createdAt', 'desc');
    
    // Execute query
    query.get()
        .then(snapshot => {
            if (snapshot.empty) {
                updateDebug('No delivery history found');
                deliveryHistoryContainer.innerHTML = `
                    <div class="alert alert-info text-center">
                        You haven't completed any deliveries yet.
                    </div>
                `;
                return;
            }
            
            let filteredDeliveries = [];
            
            // Process each delivery and apply search filter
            snapshot.forEach(doc => {
                const deliveryData = doc.data();
                
                // Apply search filter if search query exists
                if (searchQuery) {
                    const searchableFields = [
                        doc.id,
                        deliveryData.patientName,
                        deliveryData.donorName,
                        deliveryData.bloodGroup,
                        deliveryData.pickupLocation,
                        deliveryData.dropLocation,
                        deliveryData.notes
                    ].map(field => (field || '').toLowerCase());
                    
                    if (!searchableFields.some(field => field.includes(searchQuery))) {
                        return; // Skip this delivery if no match
                    }
                }
                
                filteredDeliveries.push({ id: doc.id, data: deliveryData });
            });
            
            if (filteredDeliveries.length === 0) {
                deliveryHistoryContainer.innerHTML = `
                    <div class="no-records">
                        <i class="bi bi-inbox-fill d-block"></i>
                        <h4>No Delivery Records Found</h4>
                        <p class="text-muted">No deliveries match your current search criteria.</p>
                        <button class="btn btn-outline-danger mt-2" id="resetFiltersBtn">
                            <i class="bi bi-arrow-counterclockwise me-2"></i>Reset Filters
                        </button>
                    </div>
                `;
                
                // Add event listener to reset button
                const resetBtn = document.getElementById('resetFiltersBtn');
                if (resetBtn) {
                    resetBtn.addEventListener('click', resetFilters);
                }
                return;
            }
            
            updateDebug(`Found ${filteredDeliveries.length} matching deliveries`);
            
            // Create cards for filtered deliveries
            filteredDeliveries.forEach(({ id, data }) => {
                createHistoryCard(id, data);
            });
        })
        .catch(error => {
            console.error('Error loading delivery history:', error);
            updateDebug(`Error loading history: ${error.message}`);
        });
}

// Reset all filters
function resetFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchInput');
    
    if (statusFilter) statusFilter.value = 'all';
    if (dateFilter) dateFilter.value = 'all';
    if (searchInput) searchInput.value = '';
    
    loadDeliveryHistory();
}

// Initialize search and filter event listeners
function initSearchAndFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', loadDeliveryHistory);
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', loadDeliveryHistory);
    }
    
    if (searchInput) {
        // Add debounce to search input
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(loadDeliveryHistory, 300);
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', loadDeliveryHistory);
    }
}

// Create a history card
function createHistoryCard(deliveryId, deliveryData) {
    if (!deliveryHistoryContainer) return;
    
    // Format date
    const createdAt = deliveryData.createdAt ? new Date(deliveryData.createdAt.toDate()) : new Date();
    const formattedDate = createdAt.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Create card
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';
    card.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <div>
                <span class="badge ${getStatusBadgeClass(deliveryData.status)}">${formatStatus(deliveryData.status)}</span>
                <span class="ms-2 text-muted">${formattedDate}</span>
            </div>
            <div>
                <strong>ID:</strong> ${deliveryId.substring(0, 8)}
            </div>
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Patient:</strong> ${deliveryData.patientName || 'Not available'}</p>
                    <p><strong>Donor:</strong> ${deliveryData.donorName || 'Not available'}</p>
                    <p><strong>Blood Group:</strong> ${deliveryData.bloodGroup || 'Not available'}</p>
                    <p><strong>Units:</strong> ${deliveryData.units || '1'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Pickup:</strong> ${deliveryData.pickupLocation || 'Not available'}</p>
                    <p><strong>Drop:</strong> ${deliveryData.dropLocation || 'Not available'}</p>
                    <p><strong>Notes:</strong> ${deliveryData.notes || 'No notes'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Add 'Mark as Delivered' button for in-progress deliveries
    if (deliveryData.status === 'in_progress') {
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer';
        cardFooter.innerHTML = `
            <button class="btn btn-success w-100 mark-delivered-btn">
                <i class="bi bi-check-circle"></i> Mark as Delivered
            </button>
        `;
        card.appendChild(cardFooter);
        
        // Add event listener to the button
        setTimeout(() => {
            const markDeliveredBtn = card.querySelector('.mark-delivered-btn');
            if (markDeliveredBtn) {
                markDeliveredBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to mark this delivery as delivered?')) {
                        markDeliveryAsCompleted(deliveryId);
                    }
                });
            }
        }, 0);
    }
    
    // Add to container
    deliveryHistoryContainer.appendChild(card);
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'completed':
            return 'bg-success';
        case 'in_progress':
            return 'bg-primary';
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

// Helper function to format status
function formatStatus(status) {
    switch (status) {
        case 'in_progress':
            return 'In Progress';
        case 'completed':
            return 'Completed';
        case 'delivered':
            return 'Delivered';
        case 'cancelled':
            return 'Cancelled';
        default:
            return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Mark delivery as completed (delivered)
function markDeliveryAsCompleted(deliveryId) {
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Marking delivery as completed...');
    
    // First get the delivery data to get the request ID
    db.collection('deliveries').doc(deliveryId).get()
        .then(doc => {
            if (!doc.exists) throw new Error('Delivery not found');
            
            const deliveryData = doc.data();
            const requestId = deliveryData.requestId;
            
            // Update both the delivery and the original request
            const batch = db.batch();
            
            // Update delivery status
            const deliveryRef = db.collection('deliveries').doc(deliveryId);
            batch.update(deliveryRef, {
                status: 'completed',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                completedAt: firebase.firestore.FieldValue.serverTimestamp(),
                statusHistory: firebase.firestore.FieldValue.arrayUnion({
                    status: 'completed',
                    comment: 'Delivery completed successfully',
                    timestamp: new Date().toISOString()
                })
            });
            
            // Update original request status
            const requestRef = db.collection('bloodRequests').doc(requestId);
            batch.update(requestRef, {
                status: 'completed',
                deliveryStatus: 'completed',
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                statusHistory: firebase.firestore.FieldValue.arrayUnion({
                    status: 'completed',
                    comment: 'Blood delivery completed successfully',
                    timestamp: new Date().toISOString()
                })
            });
            
            // Commit the batch update
            return batch.commit();
        })
        .then(() => {
            updateDebug('Delivery and request marked as completed');
            alert('Delivery marked as completed successfully!');
            
            // Redirect to dashboard if on delivery details page
            if (window.location.pathname.includes('delivery_details.html')) {
                window.location.href = 'dashboard.html';
            }
            // Refresh the page if on history page
            else if (window.location.pathname.includes('history.html')) {
                loadDeliveryHistory();
            }
        })
        .catch(error => {
            console.error('Error marking delivery as completed:', error);
            updateDebug(`Error: ${error.message}`);
            alert('Error marking delivery as completed. Please try again.');
        });
}

// Load delivery details for the delivery details page
function loadDeliveryDetails(deliveryId) {
    if (!currentUser) {
        updateDebug('User not authenticated');
        return;
    }
    
    updateDebug('Loading delivery details...');
    
    // Get delivery data from database
    db.collection('deliveries').doc(deliveryId).get()
        .then(doc => {
            if (!doc.exists) {
                updateDebug('Delivery not found');
                alert('Delivery not found. Redirecting to dashboard.');
                window.location.href = 'dashboard.html';
                return;
            }
            
            const deliveryData = doc.data();
            
            // Get the original blood request data
            return db.collection('bloodRequests').doc(deliveryData.requestId).get()
                .then(requestDoc => {
                    if (!requestDoc.exists) {
                        throw new Error('Original blood request not found');
                    }
                    
                    const requestData = requestDoc.data();
                    
                    // Update UI with delivery data
                    document.getElementById('blood-group').textContent = requestData.bloodGroup || 'Not available';
                    document.getElementById('blood-units').textContent = requestData.units || '1';
                    document.getElementById('request-id').textContent = deliveryData.requestId ? deliveryData.requestId.substring(0, 8) : 'Not available';
                    document.getElementById('donor-name').textContent = requestData.donorName || 'Not available';
                    document.getElementById('patient-name').textContent = requestData.patientName || 'Not available';
                    document.getElementById('pickup-address').textContent = requestData.donorAddress || requestData.donorHospital || 'Not available';
                    document.getElementById('drop-address').textContent = requestData.address || requestData.hospital || 'Not available';
                    document.getElementById('delivery-notes').textContent = deliveryData.notes || 'No notes';
                    
                    // Format dates
                    const createdAt = deliveryData.createdAt ? new Date(deliveryData.createdAt.toDate()) : new Date();
                    document.getElementById('assigned-time').textContent = createdAt.toLocaleString('en-IN');
                    document.getElementById('accepted-time').textContent = createdAt.toLocaleString('en-IN');
                    
                    // Update status badge
                    const statusBadge = document.getElementById('delivery-status-badge');
                    if (statusBadge) {
                        if (deliveryData.status === 'in_progress') {
                            statusBadge.textContent = 'In Progress';
                            statusBadge.className = 'status-badge status-in-progress';
                        } else if (deliveryData.status === 'delivered' || deliveryData.status === 'completed') {
                            statusBadge.textContent = 'Delivered';
                            statusBadge.className = 'status-badge status-completed';
                            
                            // Disable the mark as delivered button
                            const markDeliveredBtn = document.getElementById('mark-delivered-btn');
                            if (markDeliveredBtn) {
                                markDeliveredBtn.disabled = true;
                                markDeliveredBtn.textContent = 'Already Delivered';
                            }
                            
                            // Update timeline
                            const deliveredTimelineItem = document.getElementById('delivered-timeline-item');
                            if (deliveredTimelineItem) {
                                const timelineIcon = deliveredTimelineItem.querySelector('.timeline-icon');
                                if (timelineIcon) {
                                    timelineIcon.className = 'timeline-icon bg-success';
                                }
                                
                                const deliveredTime = document.getElementById('delivered-time');
                                if (deliveredTime && deliveryData.completedAt) {
                                    const completedAt = new Date(deliveryData.completedAt.toDate());
                                    deliveredTime.textContent = completedAt.toLocaleString('en-IN');
                                }
                            }
                        }
                    }
                    
                    // Set estimated distance (placeholder)
                    document.getElementById('estimated-distance').textContent = 'Calculating...';
                    
                    // Get distance between pickup and drop (if location-utils.js has this functionality)
                    if (typeof calculateDistance === 'function') {
                        try {
                            const distance = calculateDistance(
                                requestData.donorLocation?.latitude || 0,
                                requestData.donorLocation?.longitude || 0,
                                requestData.recipientLocation?.latitude || 0,
                                requestData.recipientLocation?.longitude || 0
                            );
                            document.getElementById('estimated-distance').textContent = `${distance.toFixed(1)} km`;
                        } catch (error) {
                            console.error('Error calculating distance:', error);
                            document.getElementById('estimated-distance').textContent = 'Not available';
                        }
                    } else {
                        document.getElementById('estimated-distance').textContent = 'Not available';
                    }
                    
                    updateDebug('Delivery details loaded successfully');
                });
        })
        .catch(error => {
            console.error('Error loading delivery details:', error);
            updateDebug(`Error: ${error.message}`);
            alert('Error loading delivery details. Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        });
}

// Get current location using browser's geolocation API
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            updateDebug('Geolocation is not supported by your browser. Please use a modern browser.');
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        // Show loading message
        updateDebug('Getting your location... Please allow location access when prompted.');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                updateDebug('Location obtained successfully');
                resolve(location);
            },
            (error) => {
                console.error('Error getting location:', error);
                let errorMessage = 'Unable to retrieve your location. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable. Please check your device settings.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out. Please try again.';
                        break;
                    default:
                        errorMessage += 'Please enable location services and try again.';
                }
                
                updateDebug(errorMessage);
                reject(new Error(errorMessage));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000, // Increased timeout to 10 seconds
                maximumAge: 0
            }
        );
    });
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI/180);
}
