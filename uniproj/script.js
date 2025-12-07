const API_BASE_URL = window.location.origin;
const CREATOR_WALLET = 'Hx402UniPayCreatorAddress123456789';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const appState = {
    connectedWallet: false,
    walletAddress: null,
    currentLesson: null,
    lessons: []
};


function checkPhantomSupport() {
    if (!window.solana || !window.solana.isPhantom) {
        showNotification('Please install Phantom wallet!', 'error');
        
        
        const connectButtons = document.querySelectorAll('.connect-btn');
        connectButtons.forEach(btn => {
            btn.innerHTML = '<i class="fas fa-external-link-alt"></i> Install Phantom';
            btn.onclick = () => {
                window.open('https://phantom.app/', '_blank');
            };
        });
        
        return false;
    }
    return true;
}

async function initPhantomWallet() {
    if (!checkPhantomSupport()) {
        return false;
    }

    try {
        const resp = await window.solana.connect();
        appState.walletAddress = resp.publicKey.toString();
        appState.connectedWallet = true;

        updateWalletUI();
        showNotification('Wallet connected successfully!');

       
        if (window.location.pathname.includes('lesson.html')) {
            await checkLessonAccess();
        }

        return true;
    } catch (err) {
        console.error('Wallet connection error:', err);
        if (err.code === 4001) {
            showNotification('Connection rejected by user', 'error');
        } else {
            showNotification('Failed to connect wallet', 'error');
        }
        return false;
    }
}

function updateWalletUI() {
    const connectButtons = document.querySelectorAll('.connect-btn');
    connectButtons.forEach(btn => {
        if (appState.connectedWallet && appState.walletAddress) {
            const shortAddress = `${appState.walletAddress.slice(0, 4)}...${appState.walletAddress.slice(-4)}`;
            btn.innerHTML = `<i class="fas fa-wallet"></i> ${shortAddress}`;
            btn.classList.add('connected');
            
            
            btn.onclick = disconnectWallet;
        } else {
            btn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
            btn.classList.remove('connected');
            btn.onclick = initPhantomWallet;
        }
    });
}

async function disconnectWallet() {
    try {
        if (window.solana && window.solana.disconnect) {
            await window.solana.disconnect();
        }
        appState.connectedWallet = false;
        appState.walletAddress = null;
        updateWalletUI();
        showNotification('Wallet disconnected');
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
    }
}


const MOCK_LESSONS = [
    {
        id: '1',
        title: 'Introduction to Web3 Development',
        description: 'Learn the fundamentals of Web3 development including smart contracts, wallets, and decentralized applications.',
        price: '25.00',
        content_type: 'text',
        content_data: '# Introduction to Web3 Development\n\nWelcome to the world of Web3 development! This lesson will cover:\n\n## Topics Covered\n- Blockchain fundamentals\n- Smart contracts\n- Decentralized applications (dApps)\n- Wallet integration\n- Solana basics\n\n## Learning Objectives\nBy the end of this lesson, you will understand the core concepts of Web3 development.',
        author: 'Web3 Academy',
        created_at: '2024-01-15'
    },
    {
        id: '2',
        title: 'Solana Smart Contracts 101',
        description: 'A comprehensive guide to writing and deploying smart contracts on the Solana blockchain using Rust.',
        price: '45.00',
        content_type: 'text',
        content_data: '# Solana Smart Contracts 101\n\n## Introduction to Solana\nSolana is a high-performance blockchain that supports smart contracts written in Rust.\n\n## Key Features\n- High throughput (50,000+ TPS)\n- Low transaction fees\n- Rust programming language\n- Proof of History consensus',
        author: 'Solana Masters',
        created_at: '2024-01-20'
    },
    {
        id: '3',
        title: 'Building Your First dApp',
        description: 'Step-by-step tutorial on building a complete decentralized application from scratch.',
        price: '35.00',
        content_type: 'video',
        content_data: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        author: 'dApp Builder',
        created_at: '2024-01-25'
    },
    {
        id: '4',
        title: 'Advanced DeFi Strategies',
        description: 'Learn advanced DeFi strategies including yield farming, liquidity providing, and risk management.',
        price: '60.00',
        content_type: 'pdf',
        content_data: 'defi_strategies.pdf',
        author: 'DeFi Expert',
        created_at: '2024-02-01'
    }
];


const MOCK_ACCESSES = {};

async function loadLessons() {
    const lessonsList = document.getElementById('lessons-list');
    if (!lessonsList) return;

    try {
        showLoading(lessonsList);

       
        setTimeout(() => {
            appState.lessons = MOCK_LESSONS;
            renderLessons(MOCK_LESSONS);
            updateLessonCount(MOCK_LESSONS.length);
        }, 500);

    } catch (error) {
        console.error('Error loading lessons:', error);
        showError(lessonsList, 'Failed to load lessons. Using demo data.');
        
       
        appState.lessons = MOCK_LESSONS;
        renderLessons(MOCK_LESSONS);
        updateLessonCount(MOCK_LESSONS.length);
    }
}

function renderLessons(lessons) {
    const lessonsList = document.getElementById('lessons-list');
    if (!lessonsList) return;

    lessonsList.innerHTML = '';

    lessons.forEach(lesson => {
        const lessonCard = document.createElement('div');
        lessonCard.className = 'lesson-card';
        lessonCard.dataset.id = lesson.id;

        lessonCard.innerHTML = `
            <div class="lesson-header">
                <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>
                <span class="lesson-price">${formatPrice(lesson.price)}</span>
            </div>
            <p class="lesson-description">${escapeHtml(lesson.description || 'No description')}</p>
            <div class="lesson-footer">
                <div class="lesson-author">
                    <div class="author-avatar">${getInitials(lesson.author || lesson.title)}</div>
                    <span class="author-name">${escapeHtml(lesson.author || 'Creator')}</span>
                </div>
                <div class="lesson-type">
                    <i class="${getContentTypeIcon(lesson.content_type)}"></i>
                    ${getContentTypeName(lesson.content_type)}
                </div>
            </div>
        `;

        lessonCard.addEventListener('click', () => {
            window.location.href = `lesson.html?id=${lesson.id}`;
        });

        lessonsList.appendChild(lessonCard);
    });
}

async function loadLesson(lessonId) {
    try {
       
        const lesson = MOCK_LESSONS.find(l => l.id === lessonId);
        if (!lesson) {
            throw new Error('Lesson not found');
        }

        appState.currentLesson = lesson;
        updateLessonUI(lesson);

       
        if (appState.connectedWallet) {
            await checkLessonAccess();
        }

    } catch (error) {
        console.error('Error loading lesson:', error);
        showNotification('Failed to load lesson. Redirecting to home...', 'error');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
}

async function checkLessonAccess() {
    if (!appState.currentLesson || !appState.connectedWallet || !appState.walletAddress) return;

    try {
      
        const accessKey = `${appState.walletAddress}_${appState.currentLesson.id}`;
        const hasAccess = MOCK_ACCESSES[accessKey] === true;

        if (hasAccess) {
            unlockLesson();
        }
    } catch (error) {
        console.error('Error checking access:', error);
    }
}

function unlockLesson() {
    const lockedContent = document.getElementById('locked-content');
    const unlockedContent = document.getElementById('unlocked-content');
    const lessonContent = document.getElementById('lesson-content');
    const unlockButtons = document.querySelectorAll('[id*="unlock"]');

    if (lockedContent && unlockedContent) {
        lockedContent.style.display = 'none';
        unlockedContent.style.display = 'block';

        unlockButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        if (lessonContent && appState.currentLesson) {
            if (appState.currentLesson.content_type === 'video') {
                lessonContent.innerHTML = `
                    <div class="video-container">
                        <iframe src="${appState.currentLesson.content_data}" 
                                frameborder="0" 
                                allowfullscreen></iframe>
                    </div>
                `;
            } else if (appState.currentLesson.content_type === 'pdf') {
                lessonContent.innerHTML = `
                    <div class="pdf-container">
                        <p>This lesson contains a PDF file: <strong>${appState.currentLesson.content_data}</strong></p>
                        <p>Download link will be available after purchase.</p>
                    </div>
                `;
            } else {
                lessonContent.innerHTML = marked.parse(appState.currentLesson.content_data || 'No content available');
            }
        }

        showNotification('Lesson unlocked successfully!');
    }
}

async function createLesson(formData) {
    try {
       
        if (!formData.title || !formData.price) {
            throw new Error('Title and price are required');
        }

        if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
            throw new Error('Price must be a positive number');
        }

       
        const newLesson = {
            id: (MOCK_LESSONS.length + 1).toString(),
            title: formData.title,
            description: formData.description || '',
            price: parseFloat(formData.price).toFixed(2),
            content_type: formData.content_type || 'text',
            content_data: formData.content_data || '',
            author: 'You',
            created_at: new Date().toISOString().split('T')[0]
        };

        
        MOCK_LESSONS.push(newLesson);

        showNotification('Lesson created successfully!');

        
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            renderLessons(MOCK_LESSONS);
            updateLessonCount(MOCK_LESSONS.length);
        }

        
        setTimeout(() => {
            window.location.href = `lesson.html?id=${newLesson.id}`;
        }, 1500);

    } catch (error) {
        console.error('Error creating lesson:', error);
        showNotification(error.message, 'error');
    }
}

async function processPayment() {
    if (!appState.connectedWallet) {
        showNotification('Please connect your wallet first', 'error');
        return false;
    }

    if (!appState.currentLesson) {
        showNotification('No lesson selected', 'error');
        return false;
    }

    try {
       
        showNotification('Processing payment...', 'info');

        
        await new Promise(resolve => setTimeout(resolve, 1500));

       
        const accessKey = `${appState.walletAddress}_${appState.currentLesson.id}`;
        MOCK_ACCESSES[accessKey] = true;

        
        unlockLesson();

        showNotification(`Successfully purchased "${appState.currentLesson.title}"!`, 'success');
        return true;

    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment failed. Please try again.', 'error');
        return false;
    }
}


function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getInitials(text) {
    if (!text) return '??';
    return text.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function formatPrice(price) {
    return `${parseFloat(price).toFixed(2)} USDC`;
}

function getContentTypeIcon(type) {
    const icons = {
        'text': 'fas fa-file-alt',
        'video': 'fas fa-video',
        'pdf': 'fas fa-file-pdf',
        'external_url': 'fas fa-external-link-alt'
    };
    return icons[type] || 'fas fa-file';
}

function getContentTypeName(type) {
    const names = {
        'text': 'Text',
        'video': 'Video',
        'pdf': 'PDF',
        'external_url': 'External Link'
    };
    return names[type] || 'Text';
}

function showLoading(element) {
    if (!element) return;

    element.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1;">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

function showError(element, message) {
    if (!element) return;

    element.innerHTML = `
        <div class="error-state" style="grid-column: 1 / -1;">
            <i class="fas fa-exclamation-triangle fa-2x"></i>
            <p>${message}</p>
            <button class="btn-primary" onclick="location.reload()">Try Again</button>
        </div>
    `;
}

function showNotification(message, type = 'success') {
   
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-circle' : 
                 type === 'info' ? 'info-circle' : 'bell';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `;

    document.body.appendChild(notification);

    
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateLessonCount(count) {
    const countElements = document.querySelectorAll('[id*="lesson-count"], [id*="stat-value"]');
    countElements.forEach(element => {
        element.textContent = count;
    });
}

function updateLessonUI(lesson) {
    
    document.title = `${lesson.title} | UniPay`;

    
    const elements = {
        'lesson-title': lesson.title,
        'lesson-description': lesson.description || 'No description',
        'lesson-price': formatPrice(lesson.price),
        'payment-lesson-title': lesson.title,
        'payment-price': formatPrice(lesson.price),
        'lesson-author': lesson.author || 'Creator'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });

    
    const lessonType = document.getElementById('lesson-type');
    if (lessonType) {
        lessonType.innerHTML = `
            <i class="${getContentTypeIcon(lesson.content_type)}"></i>
            ${getContentTypeName(lesson.content_type)}
        `;
    }
}

function initIndexPage() {
    
    const connectButtons = document.querySelectorAll('.connect-btn');
    connectButtons.forEach(btn => {
        btn.addEventListener('click', initPhantomWallet);
    });

    
    const lessonForm = document.getElementById('lesson-form');
    if (lessonForm) {
        lessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                title: document.getElementById('lesson-title').value,
                description: document.getElementById('lesson-description').value,
                price: document.getElementById('lesson-price').value,
                content_type: document.getElementById('content-type').value,
                content_data: document.getElementById('content-data').value
            };

            const submitBtn = lessonForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;

            await createLesson(formData);

            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            
            lessonForm.reset();
        });
    }

    
    const showCreateFormBtn = document.getElementById('show-create-form');
    const hideCreateFormBtn = document.getElementById('hide-create-form');
    const createSection = document.getElementById('create-section');

    if (showCreateFormBtn && createSection) {
        showCreateFormBtn.addEventListener('click', () => {
            createSection.style.display = 'block';
            window.scrollTo({ top: createSection.offsetTop - 100, behavior: 'smooth' });
        });
    }

    if (hideCreateFormBtn && createSection) {
        hideCreateFormBtn.addEventListener('click', () => {
            createSection.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    
    loadLessons();

    
    updateStats();
}

function updateStats() {
    const stats = {
        totalLessons: MOCK_LESSONS.length,
        totalCreators: new Set(MOCK_LESSONS.map(l => l.author)).size,
        totalEarned: MOCK_LESSONS.reduce((sum, lesson) => sum + parseFloat(lesson.price), 0) * 10 
    };

    document.querySelectorAll('.stat-item').forEach(item => {
        const label = item.querySelector('.stat-label').textContent;
        const value = item.querySelector('.stat-value');
        
        if (label.includes('Lessons')) value.textContent = stats.totalLessons;
        if (label.includes('Creators')) value.textContent = stats.totalCreators;
        if (label.includes('Earned')) value.textContent = `$${stats.totalEarned.toFixed(2)}`;
    });
}

function initLessonPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('id');

    if (!lessonId) {
        showNotification('No lesson selected. Redirecting to home...', 'error');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }

   
    const connectButtons = document.querySelectorAll('.connect-btn');
    connectButtons.forEach(btn => {
        btn.addEventListener('click', initPhantomWallet);
    });

    
    const unlockButtons = [
        document.getElementById('unlock-lesson'),
        document.getElementById('unlock-lesson-btn'),
        document.getElementById('confirm-payment')
    ].filter(Boolean);

    unlockButtons.forEach(btn => {
        if (btn.id === 'confirm-payment') {
            btn.addEventListener('click', handlePayment);
        } else {
            btn.addEventListener('click', () => {
                if (!appState.connectedWallet) {
                    showNotification('Please connect your wallet first', 'error');
                    return;
                }

                const paymentModal = document.getElementById('payment-modal');
                if (paymentModal) {
                    paymentModal.style.display = 'flex';
                }
            });
        }
    });

    
    const paymentModal = document.getElementById('payment-modal');
    const closeModalBtn = document.getElementById('close-modal');

    if (closeModalBtn && paymentModal) {
        closeModalBtn.addEventListener('click', () => {
            paymentModal.style.display = 'none';
        });
    }

    
    window.addEventListener('click', (event) => {
        const paymentModal = document.getElementById('payment-modal');
        if (paymentModal && event.target === paymentModal) {
            paymentModal.style.display = 'none';
        }
    });

    
    loadLesson(lessonId);
}

async function handlePayment() {
    const confirmPaymentBtn = document.getElementById('confirm-payment');
    if (!confirmPaymentBtn) return;

    const originalText = confirmPaymentBtn.innerHTML;
    
    confirmPaymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    confirmPaymentBtn.disabled = true;

    const success = await processPayment();

    if (success) {
        const paymentModal = document.getElementById('payment-modal');
        if (paymentModal) {
            paymentModal.style.display = 'none';
        }
    }

    confirmPaymentBtn.innerHTML = originalText;
    confirmPaymentBtn.disabled = false;
}

function initApp() {
   
    if (!document.querySelector('#app-styles')) {
        const style = document.createElement('style');
        style.id = 'app-styles';
        style.textContent = `
            .loading-state {
                text-align: center;
                padding: 60px 20px;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.1);
                border-top: 4px solid var(--primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            .error-state {
                text-align: center;
                padding: 60px 20px;
                color: var(--text-medium);
            }
            .error-state i {
                color: #ef4444;
                margin-bottom: 20px;
            }
            .connect-btn.connected {
                background: linear-gradient(135deg, #10b981, #059669);
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--bg-medium);
                border: 1px solid var(--border-light);
                border-radius: var(--radius-md);
                padding: 16px 20px;
                box-shadow: var(--shadow-lg);
                z-index: 9999;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                border-left: 4px solid var(--accent);
                backdrop-filter: blur(10px);
            }
            .notification-error {
                border-left-color: #ef4444;
            }
            .notification-info {
                border-left-color: var(--secondary);
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
                color: var(--text-dark);
                font-weight: 500;
            }
            .notification-content i {
                font-size: 20px;
            }
            .notification-success i {
                color: var(--accent);
            }
            .notification-error i {
                color: #ef4444;
            }
            .notification-info i {
                color: var(--secondary);
            }
            .hide {
                animation: slideOut 0.3s ease forwards;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .video-container {
                position: relative;
                padding-bottom: 56.25%;
                height: 0;
                overflow: hidden;
                margin: 20px 0;
                border-radius: var(--radius-md);
            }
            .video-container iframe {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: none;
            }
            .pdf-container {
                background: rgba(255, 255, 255, 0.05);
                padding: 20px;
                border-radius: var(--radius-md);
                margin: 20px 0;
            }
        `;
        document.head.appendChild(style);
    }

    
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false
        });
    }

    
    const path = window.location.pathname;
    
    if (path.includes('lesson.html')) {
        initLessonPage();
    } else {
        
        initIndexPage();
    }

    
    checkPhantomSupport();
}


document.addEventListener('DOMContentLoaded', initApp);

window.app = {
    state: appState,
    connectWallet: initPhantomWallet,
    disconnectWallet: disconnectWallet,
    loadLessons: loadLessons,
    processPayment: processPayment
};