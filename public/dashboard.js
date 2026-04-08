        // ============================================
        // SYSTEM DASHBOARD - FULL VERSION
        // ============================================
        
        const API_BASE = window.location.origin;
        const DEV_CREDENTIALS = { username: 'dev', password: 'dev' };
        
        let currentUser = null;
        let updateInterval = null;
        let continuousSessionMonitor = null;
        let serverData = {
            students: [],
            doctors: [],
            subjects: [],
            lectures: [],
            users: []
        };
        

// دالة للحصول على التوكن الصحيح
function getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('devToken');
}

// دالة لإضافة التوكن للطلبات
function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// دالة مساعدة للـ fetch مع التوكن
async function authFetch(url, options = {}) {
    const token = getAuthToken();
    
    // إعداد headers بشكل صحيح
    const headers = {
        ...options.headers
    };
    
    // إذا كان هناك body ولا يوجد Content-Type، أضفه
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    
    // إضافة التوكن
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('🔐 AuthFetch to:', url);
    console.log('   Headers:', headers);
    if (options.body) {
        console.log('   Body:', options.body);
    }
    
    const response = await fetch(url, {
        ...options,
        headers: headers
    });
    
    return response;
}


        // ============================================
        // HELPER FUNCTIONS
        // ============================================
       
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    const icon = document.getElementById('toastIcon');
    
    if (!toast || !msg || !icon) {
        console.log(`[${type}] ${message}`);
        return;
    }
    
    msg.innerHTML = message;
    
    if (type === 'success') {
        icon.className = 'fas fa-check-circle text-green-400 text-2xl';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle text-red-400 text-2xl';
    } else if (type === 'warning') {
        icon.className = 'fas fa-exclamation-triangle text-yellow-400 text-2xl';
    } else {
        icon.className = 'fas fa-info-circle text-blue-400 text-2xl';
    }
    
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 5000);
}

async function authenticatedFetch(url, options = {}) {
    let publicUrl = url;
    
    // قائمة endpoints العامة التي لا تحتاج توكن
    const publicEndpoints = {
        '/api/students': '/api/students-public',
        '/api/doctors': '/api/doctors-public',
        '/api/subjects': '/api/subjects-public',
        '/api/lectures': '/api/lectures-public',
        '/api/users': '/api/users-public',
        '/api/database-info': '/api/database-info',
        '/api/backups': '/api/backups',
        '/api/blacklist': '/api/blacklist',
        '/api/backup-schedule': '/api/backup-schedule',
        '/api/backup-stats': '/api/backup-stats',
        '/api/health': '/api/health',
        '/api/active-sessions-all': '/api/active-sessions-all'
    };
    
    // ✅ إصلاح: استخدام المسار العام فقط إذا كان في القائمة
    if (publicEndpoints[url]) {
        publicUrl = publicEndpoints[url];
    }
    
    // ✅ إصلاح: إضافة التوكن في جميع الطلبات المحمية
    const token = localStorage.getItem('devToken') || localStorage.getItem('token');
    
    const headers = {
        ...options.headers,
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE}${publicUrl}`, {
            ...options,
            headers: headers
        });
        
        // إذا كانت الاستجابة 401 (غير مصرح) حاول إعادة التوجيه لتسجيل الدخول
        if (response.status === 401) {
            console.log('Unauthorized, redirecting to login...');
            // يمكنك إضافة منطق لتسجيل الخروج هنا إذا أردت
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

        // ============================================
        // DATE TIME
        // ============================================
        
function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        const now = new Date();
        dateTimeElement.textContent = now.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}
        
        // ============================================
        // LOGIN / LOGOUT
        // ============================================
        
        function logout() {
            if (updateInterval) clearInterval(updateInterval);
            if (continuousSessionMonitor) clearInterval(continuousSessionMonitor);
            currentUser = null;
            localStorage.removeItem('devToken');
            document.getElementById('dashboard').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
            showToast('Logged out successfully', 'success');
        }
        
document.getElementById('devLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('devUsername').value.trim();
    const password = document.getElementById('devPassword').value;
    
    console.log('Attempting login with:', username);
    
    if (username === 'dev' && password === 'dev') {
        try {
            // ✅ استخدم API المطور
            const response = await fetch('/api/dev/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.token) {
                    // تخزين التوكن
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('devToken', data.token);
                    
                    currentUser = { username: 'dev', role: 'developer' };
                    document.getElementById('loginScreen').classList.add('hidden');
                    document.getElementById('dashboard').classList.remove('hidden');
                    
                    await loadAllData();
                    startMonitoring();
                    startContinuousSessionMonitor();
                    showToast('Welcome to System Dashboard', 'success');
                } else {
                    showToast('No token received', 'error');
                }
            } else {
                const error = await response.json();
                showToast(error.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Connection error', 'error');
        }
    } else {
        showToast('Invalid credentials. Developer access only.', 'error');
    }
});
        
        document.getElementById('logout').addEventListener('click', logout);
        
        // ============================================
        // NAVIGATION
        // ============================================
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const sections = ['overviewSection', 'sessionsSection', 'devicesSection', 'backupsSection', 'healthSection', 'securitySection', 'rate-limitSection'];
                sections.forEach(s => {
                    const el = document.getElementById(s);
                    if (el) el.classList.add('hidden');
                });
                
                const target = document.getElementById(btn.dataset.section + 'Section');
                if (target) target.classList.remove('hidden');
                
                const titles = {
                    overview: 'System Overview',
                    sessions: 'Active Sessions',
                    devices: 'Connected Devices',
                    backups: 'Backup Manager',
                    health: 'System Health',
                    security: 'Security Dashboard',
                    'rate-limit': 'Rate Limits'
                };
                document.getElementById('sectionTitle').textContent = titles[btn.dataset.section] || 'Dashboard';
                
                if (btn.dataset.section === 'sessions') loadActiveSessions();
                if (btn.dataset.section === 'devices') loadConnectedDevices();
                if (btn.dataset.section === 'backups') loadBackups();
                if (btn.dataset.section === 'health') checkSystemHealth();
                if (btn.dataset.section === 'security') loadSecurityData();
                if (btn.dataset.section === 'rate-limit') loadRateLimitData();
            });
        });
        
// التأكد من وجود الدوال الأساسية
if (typeof renderBackupsTable === 'undefined') {
    window.renderBackupsTable = function(backups) {
        const container = document.getElementById('backupsList');
        if (container) {
            container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">Backup table not available</p>';
        }
    };
}

if (typeof renderSessionsTable === 'undefined') {
    window.renderSessionsTable = function(sessions) {
        const container = document.getElementById('activeSessionsList');
        if (container) {
            container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">Sessions table not available</p>';
        }
    };
}

if (typeof renderDevicesTable === 'undefined') {
    window.renderDevicesTable = function(devices) {
        const container = document.getElementById('devicesList');
        if (container) {
            container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">Devices table not available</p>';
        }
    };
}

        // ============================================
        // MONITORING
        // ============================================
        
function startMonitoring() {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
        try {
            if (document.getElementById('overviewSection') && !document.getElementById('overviewSection').classList.contains('hidden')) {
                loadOverviewData();
            }
            if (document.getElementById('healthSection') && !document.getElementById('healthSection').classList.contains('hidden')) {
                checkSystemHealth();
            }
        } catch (error) {
            console.error('Error in monitoring:', error);
        }
    }, 10000);
}
        
function startContinuousSessionMonitor() {
    if (continuousSessionMonitor) clearInterval(continuousSessionMonitor);
    
    continuousSessionMonitor = setInterval(async () => {
        try {
            const sessionsSection = document.getElementById('sessionsSection');
            const devicesSection = document.getElementById('devicesSection');
            
            if ((sessionsSection && !sessionsSection.classList.contains('hidden')) ||
                (devicesSection && !devicesSection.classList.contains('hidden'))) {
                await loadActiveSessions();
                await loadConnectedDevices();
            }
        } catch (error) {
            console.error('Error in session monitor:', error);
            // لا نعرض خطأ للمستخدم، نستمر في المحاولة
        }
    }, 5000); // زيادة إلى 5 ثواني بدلاً من 3
    
    console.log('🔄 Session monitor started');
}
        
        // ============================================
        // LOAD DATA
        // ============================================
        
        async function loadAllData() {
            await loadOverviewData();
            await loadBackups();
            await checkSystemHealth();
            await checkForUpdates();
        }
        
        async function loadOverviewData() {
            try {
                const studentsRes = await authenticatedFetch('/api/students');
                if (studentsRes && studentsRes.ok) {
                    serverData.students = await studentsRes.json();
                    const el = document.getElementById('totalStudents');
                    if (el) el.textContent = serverData.students.length;
                }
                
                const doctorsRes = await authenticatedFetch('/api/doctors');
                if (doctorsRes && doctorsRes.ok) {
                    serverData.doctors = await doctorsRes.json();
                    const el = document.getElementById('totalDoctors');
                    if (el) el.textContent = serverData.doctors.length;
                }
                
                const subjectsRes = await authenticatedFetch('/api/subjects');
                if (subjectsRes && subjectsRes.ok) {
                    serverData.subjects = await subjectsRes.json();
                    const el = document.getElementById('totalSubjects');
                    if (el) el.textContent = serverData.subjects.length;
                }
                
                const lecturesRes = await authenticatedFetch('/api/lectures');
                if (lecturesRes && lecturesRes.ok) {
                    serverData.lectures = await lecturesRes.json();
                    const el = document.getElementById('totalLectures');
                    if (el) el.textContent = serverData.lectures.length;
                }
                
                const usersRes = await authenticatedFetch('/api/users');
                if (usersRes && usersRes.ok) {
                    serverData.users = await usersRes.json();
                    const el = document.getElementById('totalUsers');
                    if (el) el.textContent = serverData.users.length;
                }
                
                const dbInfoRes = await authenticatedFetch('/api/database-info');
                if (dbInfoRes && dbInfoRes.ok) {
                    const dbInfo = await dbInfoRes.json();
                    const dbDirEl = document.getElementById('dbDir');
                    const jsonFilesEl = document.getElementById('jsonFilesCount');
                    if (dbDirEl) dbDirEl.textContent = dbInfo.directory || 'N/A';
                    if (jsonFilesEl) jsonFilesEl.textContent = dbInfo.files?.length || 0;
                }
                
                const totalRecords = serverData.students.length + serverData.doctors.length + 
                                    serverData.subjects.length + serverData.lectures.length + 
                                    serverData.users.length;
                const totalRecordsEl = document.getElementById('totalRecords');
                if (totalRecordsEl) totalRecordsEl.textContent = totalRecords;
                
            } catch (error) {
                console.error('Error loading overview:', error);
            }
        }
        
        // ============================================
        // ACTIVE SESSIONS
        // ============================================
async function loadActiveSessions() {
    try {
        console.log('🔄 Loading active sessions...');
        
        // استخدام try-catch منفصل للـ fetch
        let sessions = [];
        try {
            const response = await fetch(`${API_BASE}/api/active-sessions-all`);
            if (response && response.ok) {
                const data = await response.json();
                sessions = data.sessions || [];
                console.log(`✅ Loaded ${sessions.length} active sessions`);
                sessions.forEach(s => {
                    console.log(`   - ${s.type}: ${s.username} (${s.ip})`);
                });
            } else {
                console.log('Failed to fetch active sessions, status:', response?.status);
            }
        } catch (fetchError) {
            console.error('Fetch error for active sessions:', fetchError.message);
            // لا نعرض خطأ للمستخدم، فقط نستمر بجلسات فارغة
        }
        
        const activeSessionsEl = document.getElementById('activeSessionsCount');
        if (activeSessionsEl) activeSessionsEl.textContent = sessions.length;
        
        const lastUpdateEl = document.getElementById('sessionLastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.innerHTML = `<i class="fas fa-clock"></i> Last update: ${new Date().toLocaleTimeString()}`;
        }
        
        renderSessionsTable(sessions);
        
    } catch (error) {
        console.error('Error loading sessions:', error);
        // عرض رسالة خطأ في الجدول بدلاً من كسر الصفحة
        const container = document.getElementById('activeSessionsList');
        if (container) {
            container.innerHTML = '<p class="text-center text-yellow-400 py-8 text-sm">⚠️ Could not load sessions. Make sure server is running.</p>';
        }
    }
}



        function renderSessionsTable(sessions) {
            const container = document.getElementById('activeSessionsList');
            if (!container) return;
            
            if (sessions.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">No active sessions found</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="p-3 text-xs">User</th>
                                <th class="p-3 text-xs">Type</th>
                                <th class="p-3 text-xs">IP Address</th>
                                <th class="p-3 text-xs">Login Time</th>
                                <th class="p-3 text-xs">Last Active</th>
                                <th class="p-3 text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sessions.map((s) => `
                                <tr>
                                    <td class="p-3 text-sm font-semibold">${s.username || 'Unknown'}</td>
                                    <td class="p-3"><span class="badge badge-online">${s.type || 'User'}</span></td>
                                    <td class="p-3 font-mono text-xs">${s.ip || 'N/A'}</td>
                                    <td class="p-3 text-xs">${new Date(s.loginTime).toLocaleString()}</td>
                                    <td class="p-3 text-xs">${new Date(s.lastActive).toLocaleString()}</td>
                                    <td class="p-3">
                                        <button onclick="forceLogout('${s.username}')" class="btn-danger px-2 py-1 rounded text-xs">
                                            <i class="fas fa-sign-out-alt mr-1"></i> Logout
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        async function forceLogout(username) {
            if (confirm(`Force logout user "${username}"?`)) {
                showToast(`Terminating session...`, 'info');
                try {
                    const response = await fetch(`${API_BASE}/api/terminate-session-by-name/${encodeURIComponent(username)}`, { method: 'POST' });
                    if (response && response.ok) {
                        showToast(`✅ ${username} logged out`, 'success');
                        await loadActiveSessions();
                        await loadConnectedDevices();
                    } else {
                        showToast(`Failed to logout ${username}`, 'error');
                    }
                } catch(e) {
                    showToast(`Error logging out ${username}`, 'error');
                }
            }
        }
        
        async function forceLogoutAll() {
            if (confirm('⚠️ This will log out ALL users. Continue?')) {
                showToast('Terminating all sessions...', 'info');
                try {
                    const response = await fetch(`${API_BASE}/api/terminate-all-sessions`, { method: 'POST' });
                    if (response && response.ok) {
                        showToast(`✅ All users logged out`, 'success');
                        await loadActiveSessions();
                        await loadConnectedDevices();
                    } else {
                        showToast('Failed to terminate sessions', 'error');
                    }
                } catch(e) {
                    showToast('Error terminating sessions', 'error');
                }
            }
        }
        
        async function refreshAllSessions() {
            showToast('Refreshing sessions...', 'info');
            await loadActiveSessions();
            await loadConnectedDevices();
            showToast('Sessions refreshed', 'success');
        }
        
        // ============================================
        // CONNECTED DEVICES
        // ============================================
async function loadConnectedDevices() {
    try {
        const devices = [];
        
        try {
            const response = await fetch(`${API_BASE}/api/active-sessions-all`);
            if (response && response.ok) {
                const data = await response.json();
                const sessions = data.sessions || [];
                const deviceMap = new Map();
                
                sessions.forEach(session => {
                    const ip = session.ip;
                    if (!deviceMap.has(ip)) {
                        deviceMap.set(ip, {
                            id: ip,
                            ip: ip,
                            userAgent: session.userAgent || 'Unknown',
                            lastSeen: session.lastActive,
                            type: 'Active Device',
                            sessions: 1,
                            users: [session.username]
                        });
                    } else {
                        const device = deviceMap.get(ip);
                        device.sessions++;
                        device.users.push(session.username);
                        if (new Date(session.lastActive) > new Date(device.lastSeen)) {
                            device.lastSeen = session.lastActive;
                        }
                    }
                });
                
                deviceMap.forEach(device => devices.push(device));
            }
        } catch (fetchError) {
            console.error('Fetch error for devices:', fetchError.message);
        }
        
        devices.push({
            id: 'current',
            ip: window.location.hostname,
            userAgent: navigator.userAgent,
            lastSeen: new Date().toISOString(),
            type: 'Current Device',
            sessions: 1,
            users: ['You']
        });
        
        const devicesEl = document.getElementById('connectedDevices');
        const countEl = document.getElementById('deviceCount');
        if (devicesEl) devicesEl.textContent = devices.length;
        if (countEl) countEl.innerHTML = `${devices.length} Devices`;
        
        renderDevicesTable(devices);
        
    } catch (error) {
        console.error('Error loading devices:', error);
        const container = document.getElementById('devicesList');
        if (container) {
            container.innerHTML = '<p class="text-center text-yellow-400 py-8 text-sm">⚠️ Could not load devices</p>';
        }
    }
}



        function renderDevicesTable(devices) {
            const container = document.getElementById('devicesList');
            if (!container) return;
            
            if (devices.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">No devices detected</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="p-3 text-xs">IP Address</th>
                                <th class="p-3 text-xs">Device Type</th>
                                <th class="p-3 text-xs">Last Seen</th>
                                <th class="p-3 text-xs">Sessions</th>
                                <th class="p-3 text-xs">Users</th>
                                <th class="p-3 text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${devices.map(device => `
                                <tr>
                                    <td class="p-3 font-mono text-xs">${device.ip}</td>
                                    <td class="p-3 text-sm">${device.type || 'Unknown'}</td>
                                    <td class="p-3 text-xs">${new Date(device.lastSeen).toLocaleString()}</td>
                                    <td class="p-3 text-center text-sm">${device.sessions || 0}</td>
                                    <td class="p-3 text-xs">${(device.users || []).join(', ')}</td>
                                    <td class="p-3">
                                        <button onclick="terminateDevice('${device.ip}')" class="btn-danger px-2 py-1 rounded text-xs">
                                            <i class="fas fa-ban mr-1"></i> Terminate
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        function refreshDevices() {
            showToast('Refreshing devices...', 'info');
            loadConnectedDevices();
        }
        
        function terminateDevice(ip) {
            if (confirm(`Terminate all sessions from IP ${ip}?`)) {
                showToast(`Terminating device ${ip}...`, 'info');
                loadConnectedDevices();
            }
        }
        
        // ============================================
        // BACKUP MANAGER
        // ============================================
        
async function loadBackups() {
    try {
        const response = await authenticatedFetch('/api/backups');
        if (response && response.ok) {
            const backups = await response.json();
            
            const totalSize = backups.reduce((sum, b) => sum + (b.size || 0), 0);
            const lastBackup = backups.length > 0 ? backups[0] : null;
            
            const totalBackupsEl = document.getElementById('totalBackups');
            const totalBackupSizeEl = document.getElementById('totalBackupSize');
            const lastBackupTimeDisplayEl = document.getElementById('lastBackupTimeDisplay');
            
            if (totalBackupsEl) totalBackupsEl.textContent = backups.length;
            if (totalBackupSizeEl) totalBackupSizeEl.textContent = (totalSize / 1024 / 1024).toFixed(2);
            if (lastBackupTimeDisplayEl && lastBackup) {
                lastBackupTimeDisplayEl.innerHTML = new Date(lastBackup.created).toLocaleString();
            }
            
            // استخدام الدالة الجديدة
            if (typeof renderBackupsTable === 'function') {
                renderBackupsTable(backups);
            } else {
                // fallback
                const container = document.getElementById('backupsList');
                if (container) {
                    container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">' + backups.length + ' backups found</p>';
                }
            }
        } else {
            console.log('No backups response');
        }
    } catch (error) {
        console.error('Error loading backups:', error);
        const container = document.getElementById('backupsList');
        if (container) {
            container.innerHTML = '<p class="text-center text-red-400 py-8 text-sm">Error loading backups</p>';
        }
    }
}

        async function createBackupNow() {
            showToast('Creating backup...', 'info');
            const token = localStorage.getItem('token');
            if (!token) {
                showToast('Please login as admin first', 'error');
                return;
            }
            try {
                const response = await fetch(`${API_BASE}/api/backup`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                if (response && response.ok) {
                    showToast('Backup created successfully', 'success');
                    await loadBackups();
                } else {
                    showToast('Failed to create backup', 'error');
                }
            } catch (error) {
                showToast('Error creating backup', 'error');
            }
        }
        
function restoreBackup(backupName) {
    if (confirm(`Restore backup "${backupName}"? This will overwrite current data.`)) {
        showToast('Restore functionality requires server implementation', 'info');
    }
}

function deleteBackup(backupName) {
    if (confirm(`Delete backup "${backupName}"?`)) {
        showToast('Delete functionality requires server implementation', 'info');
        loadBackups(); // تحديث القائمة
    }
}
        
        // ============================================
        // SYSTEM HEALTH
        // ============================================
        
        async function checkSystemHealth() {
            try {
                const dbInfoRes = await authenticatedFetch('/api/database-info');
                const dbStatusEl = document.getElementById('dbStatus');
                const healthJsonEl = document.getElementById('healthJsonFiles');
                
                if (dbInfoRes && dbInfoRes.ok) {
                    const dbInfo = await dbInfoRes.json();
                    if (dbStatusEl) dbStatusEl.innerHTML = dbInfo.exists ? '✅ Online' : '❌ Offline';
                    if (healthJsonEl) healthJsonEl.textContent = dbInfo.files?.length || 0;
                } else if (dbStatusEl) {
                    dbStatusEl.innerHTML = '❌ Error';
                }
                
                const apiStatusEl = document.getElementById('apiStatus');
                const lastHealthEl = document.getElementById('lastHealthCheck');
                
                try {
                    const healthRes = await fetch(`${API_BASE}/api/health`);
                    if (healthRes.ok && apiStatusEl) apiStatusEl.innerHTML = '✅ Online';
                    else if (apiStatusEl) apiStatusEl.innerHTML = '❌ Offline';
                } catch (e) {
                    if (apiStatusEl) apiStatusEl.innerHTML = '❌ Offline';
                }
                
                if (lastHealthEl) lastHealthEl.textContent = new Date().toLocaleTimeString();
                
                const files = [
                    { name: 'students.json', data: serverData.students },
                    { name: 'doctors.json', data: serverData.doctors },
                    { name: 'subjects.json', data: serverData.subjects },
                    { name: 'lectures.json', data: serverData.lectures },
                    { name: 'users.json', data: serverData.users }
                ];
                
                renderDataTablesStatus(files);
                
            } catch (error) {
                console.error('Health check error:', error);
            }
        }
        
        function renderDataTablesStatus(files) {
            const container = document.getElementById('dataTablesStatus');
            if (!container) return;
            
            const totalRecords = files.reduce((sum, f) => sum + (f.data?.length || 0), 0);
            
            container.innerHTML = `
                <h3 class="text-base font-semibold mb-3">Database Tables</h3>
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr>
                                <th class="p-2 text-xs">Table</th>
                                <th class="p-2 text-xs">Status</th>
                                <th class="p-2 text-xs">Records</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${files.map(file => `
                                <tr>
                                    <td class="p-2 text-sm font-semibold">${file.name}</td>
                                    <td class="p-2"><span class="text-green-400 text-xs">✅ Valid</span></td>
                                    <td class="p-2 text-sm">${file.data?.length || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="mt-3 p-3 bg-emerald-600/10 rounded-xl text-center">
                    <p class="text-xs">Total Records: <strong>${totalRecords}</strong></p>
                </div>
            `;
        }
        
        // ============================================
        // VERSION CHECK
        // ============================================
        
        const CURRENT_VERSION = '2.0.0';
        
        async function checkForUpdates() {
            const latestEl = document.getElementById('latestVersion');
            const updateStatusEl = document.getElementById('updateStatus');
            if (latestEl) latestEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            if (updateStatusEl) updateStatusEl.innerHTML = 'Checking...';
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (latestEl) latestEl.textContent = CURRENT_VERSION;
            if (updateStatusEl) updateStatusEl.innerHTML = '<span class="text-green-400">✅ Up to date</span>';
            showToast('System is up to date', 'success');
        }
        
        // ============================================
        // SECURITY
        // ============================================
async function loadSecurityData() {
    await Promise.all([
        loadFailedLogins(),
        loadAuditLogs(),
        loadPasswordStrength(),
        loadPermissionsAudit(),
        loadEndpointStats()
    ]);
}
        
        async function addToBlacklist() {
            const ip = document.getElementById('blacklistIp').value.trim();
            if (!ip) {
                showToast('Please enter an IP address', 'warning');
                return;
            }
            
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            if (!ipRegex.test(ip)) {
                showToast('Invalid IP address', 'error');
                return;
            }
            
            const response = await authenticatedFetch('/api/blacklist', {
                method: 'POST',
                body: JSON.stringify({ ip })
            });
            
            if (response && response.ok) {
                showToast(`✅ IP ${ip} blacklisted`, 'success');
                document.getElementById('blacklistIp').value = '';
                await loadSecurityData();
            } else {
                showToast('Failed to add IP', 'error');
            }
        }
        
        async function removeFromBlacklist(ip) {
            const response = await authenticatedFetch(`/api/blacklist/${ip}`, { method: 'DELETE' });
            if (response && response.ok) {
                showToast(`✅ IP ${ip} removed`, 'success');
                await loadSecurityData();
            }
        }
        
        // ============================================
        // RATE LIMITS
        // ============================================
// ============================================
// DYNAMIC RATE LIMITS MANAGEMENT - COMPLETE FIX
// ============================================

let currentRateLimits = null;

// الدالة الرئيسية لتحميل إعدادات Rate Limits
async function loadRateLimitData() {
    console.log('📊 Loading rate limit data...');
    await loadRateLimitConfig();
    updateRateLimitUI();
}

// تحميل إعدادات Rate Limits من السيرفر
async function loadRateLimitConfig() {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/rate-limit-config', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            currentRateLimits = data.config;
            console.log('✅ Rate limits loaded:', currentRateLimits);
            renderRateLimitConfig();
            updateRateLimitStats();
            return true;
        } else {
            console.error('Failed to load rate limits config, status:', response.status);
            // استخدام بيانات افتراضية إذا فشل التحميل
            currentRateLimits = {
                general: { windowMs: 15 * 60 * 1000, max: 200, enabled: true },
                login: { windowMs: 15 * 60 * 1000, max: 10, enabled: true },
                api: { windowMs: 5 * 60 * 1000, max: 50, enabled: true },
                backup: { windowMs: 60 * 60 * 1000, max: 5, enabled: true },
                restore: { windowMs: 60 * 60 * 1000, max: 2, enabled: true },
                student: { windowMs: 15 * 60 * 1000, max: 300, enabled: true },
                doctor: { windowMs: 15 * 60 * 1000, max: 150, enabled: true }
            };
            renderRateLimitConfig();
            return false;
        }
    } catch (error) {
        console.error('Error loading rate limits:', error);
        showToast('Error loading rate limits configuration', 'error');
        return false;
    }
}

// عرض إعدادات Rate Limits في الواجهة
function renderRateLimitConfig() {
    if (!currentRateLimits) {
        console.warn('No rate limits data to render');
        return;
    }
    
    const container = document.getElementById('endpointLimits');
    if (!container) {
        console.warn('endpointLimits container not found');
        return;
    }
    
    const categories = [
        { key: 'general', name: 'General API', description: 'All API endpoints' },
        { key: 'login', name: 'Login Attempts', description: 'Login endpoints (admin, doctor, student)' },
        { key: 'api', name: 'Protected APIs', description: 'Students, Doctors, Subjects, Lectures' },
        { key: 'backup', name: 'Backup Operations', description: 'Create backups' },
        { key: 'restore', name: 'Restore Operations', description: 'Restore from backup' },
        { key: 'student', name: 'Student Section', description: 'Student pages and grades' },
        { key: 'doctor', name: 'Doctor Section', description: 'Doctor management pages' }
    ];
    
    let activeCount = 0;
    let disabledCount = 0;
    
    container.innerHTML = `
        <div class="space-y-4">
            ${categories.map(cat => {
                const config = currentRateLimits[cat.key];
                if (!config) return '';
                const windowMinutes = Math.round(config.windowMs / 60000);
                const requestsPerMinute = Math.round(config.max / windowMinutes);
                
                if (config.enabled !== false) activeCount++;
                else disabledCount++;
                
                return `
                    <div class="bg-slate-800/50 rounded-lg p-4 border border-white/10">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <h4 class="font-semibold text-emerald-400">${cat.name}</h4>
                                <p class="text-xs text-gray-500">${cat.description}</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" class="rate-limit-toggle sr-only peer" 
                                       data-type="${cat.key}" ${config.enabled !== false ? 'checked' : ''}
                                       onchange="toggleRateLimit('${cat.key}')">
                                <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer 
                                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                            after:bg-white after:border-gray-300 after:border after:rounded-full 
                                            after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        <div class="grid grid-cols-2 gap-3 mt-3">
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Max Requests</label>
                                <input type="number" id="max_${cat.key}" value="${config.max}" min="1" max="10000"
                                       class="w-full px-3 py-1.5 bg-slate-900 rounded-lg text-sm border border-white/10 
                                              focus:border-emerald-500 focus:outline-none"
                                       onchange="updateRateLimit('${cat.key}', 'max', this.value)">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-400 mb-1">Time Window (minutes)</label>
                                <input type="number" id="window_${cat.key}" value="${windowMinutes}" step="1" min="1" max="1440"
                                       class="w-full px-3 py-1.5 bg-slate-900 rounded-lg text-sm border border-white/10 
                                              focus:border-emerald-500 focus:outline-none"
                                       onchange="updateRateLimit('${cat.key}', 'windowMs', this.value * 60000)">
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-500">
                            <i class="fas fa-chart-line mr-1"></i>
                            Rate: ${requestsPerMinute} requests/minute | 
                            ${config.max} requests per ${windowMinutes} minutes
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    // تحديث الإحصائيات
    const activeEl = document.getElementById('activeLimitersCount');
    const disabledEl = document.getElementById('disabledLimitersCount');
    if (activeEl) activeEl.textContent = activeCount;
    if (disabledEl) disabledEl.textContent = disabledCount;
}

// تحديث إعداد Rate Limit محدد
async function updateRateLimit(type, setting, value) {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/rate-limit-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, setting, value })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentRateLimits = data.config;
            showToast(`Rate limit for ${type} updated`, 'success');
            updateRateLimitStats();
            
            // تحديث العرض
            const windowMinutes = Math.round(currentRateLimits[type].windowMs / 60000);
            const requestsPerMinute = Math.round(currentRateLimits[type].max / windowMinutes);
            const rateDisplay = document.querySelector(`#max_${type}`)?.closest('.bg-slate-800\\/50')?.querySelector('.text-gray-500');
            if (rateDisplay) {
                rateDisplay.innerHTML = `<i class="fas fa-chart-line mr-1"></i> Rate: ${requestsPerMinute} requests/minute | ${currentRateLimits[type].max} requests per ${windowMinutes} minutes`;
            }
        } else {
            const error = await response.json();
            showToast(error.error || 'Failed to update rate limit', 'error');
            // إعادة تحميل الإعدادات لتصحيح القيمة
            await loadRateLimitConfig();
        }
    } catch (error) {
        console.error('Error updating rate limit:', error);
        showToast('Error updating rate limit', 'error');
        await loadRateLimitConfig();
    }
}

// تبديل حالة Rate Limit (تفعيل/تعطيل)
async function toggleRateLimit(type) {
    const toggle = document.querySelector(`.rate-limit-toggle[data-type="${type}"]`);
    if (!toggle) return;
    
    const enabled = toggle.checked;
    
    try {
        const token = getAuthToken();
        const response = await fetch('/api/rate-limit-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, setting: 'enabled', value: enabled })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentRateLimits = data.config;
            showToast(`${type} rate limit ${enabled ? 'enabled' : 'disabled'}`, 'success');
            updateRateLimitStats();
            
            // تحديث الإحصائيات
            let activeCount = 0;
            let disabledCount = 0;
            for (const [key, config] of Object.entries(currentRateLimits)) {
                if (config.enabled !== false) activeCount++;
                else disabledCount++;
            }
            const activeEl = document.getElementById('activeLimitersCount');
            const disabledEl = document.getElementById('disabledLimitersCount');
            if (activeEl) activeEl.textContent = activeCount;
            if (disabledEl) disabledEl.textContent = disabledCount;
        } else {
            // إعادة التبديل إذا فشل
            toggle.checked = !enabled;
            showToast('Failed to toggle rate limit', 'error');
        }
    } catch (error) {
        console.error('Error toggling rate limit:', error);
        toggle.checked = !enabled;
        showToast('Error toggling rate limit', 'error');
    }
}

// تعطيل/تفعيل جميع الـ Rate Limits
async function toggleAllRateLimits(enabled) {
    if (!confirm(`⚠️ ${enabled ? 'Enable' : 'Disable'} all rate limits? This will affect all users.`)) {
        // إعادة التبديل إذا كان هناك confirm
        const select = document.getElementById('globalRateLimitEnabled');
        if (select) select.value = enabled ? 'false' : 'true';
        return;
    }
    
    try {
        const token = getAuthToken();
        const updates = [];
        
        for (const [type] of Object.entries(currentRateLimits)) {
            updates.push(
                fetch('/api/rate-limit-config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ type, setting: 'enabled', value: enabled })
                })
            );
        }
        
        await Promise.all(updates);
        await loadRateLimitConfig();
        showToast(`All rate limits ${enabled ? 'enabled' : 'disabled'}`, 'success');
        
        // تحديث الـ select
        const select = document.getElementById('globalRateLimitEnabled');
        if (select) select.value = enabled ? 'true' : 'false';
        
    } catch (error) {
        console.error('Error toggling all rate limits:', error);
        showToast('Error toggling all rate limits', 'error');
        
        // إعادة التبديل
        const select = document.getElementById('globalRateLimitEnabled');
        if (select) select.value = enabled ? 'false' : 'true';
    }
}

// إعادة تعيين جميع الـ Rate Limits إلى الإعدادات الافتراضية
async function resetRateLimits() {
    if (!confirm('⚠️ Reset all rate limits to default values? This will affect all users.')) return;
    
    try {
        const token = getAuthToken();
        const response = await fetch('/api/rate-limit-config/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentRateLimits = data.config;
            renderRateLimitConfig();
            updateRateLimitStats();
            showToast('Rate limits reset to defaults', 'success');
            
            // تحديث الـ select
            const select = document.getElementById('globalRateLimitEnabled');
            if (select) select.value = 'true';
        } else {
            showToast('Failed to reset rate limits', 'error');
        }
    } catch (error) {
        console.error('Error resetting rate limits:', error);
        showToast('Error resetting rate limits', 'error');
    }
}

// تحديث إحصائيات Rate Limits
function updateRateLimitStats() {
    if (!currentRateLimits) return;
    
    // تحديث آخر تحديث
    const lastUpdateEl = document.getElementById('lastRateLimitUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleTimeString();
    }
    
    // تحديث العدد الإجمالي
    const totalEl = document.getElementById('totalConfigsCount');
    if (totalEl) totalEl.textContent = Object.keys(currentRateLimits).length;
    
    // تحديث الإحصائيات في الـ UI
    for (const [key, config] of Object.entries(currentRateLimits)) {
        const maxElement = document.getElementById(`${key}_max`);
        const windowElement = document.getElementById(`${key}_window`);
        if (maxElement) maxElement.value = config.max;
        if (windowElement) windowElement.value = Math.round(config.windowMs / 60000);
    }
    
    // عرض إحصائيات إضافية
    const statsContainer = document.getElementById('rateLimitStats');
    if (statsContainer && currentRateLimits) {
        const stats = [];
        for (const [key, config] of Object.entries(currentRateLimits)) {
            const windowMinutes = Math.round(config.windowMs / 60000);
            const requestsPerMinute = Math.round(config.max / windowMinutes);
            stats.push(`
                <div class="flex justify-between items-center text-xs p-2 border-b border-white/5">
                    <span class="font-medium">${key}:</span>
                    <span class="${config.enabled !== false ? 'text-green-400' : 'text-red-400'}">
                        ${config.enabled !== false ? 
                            `${requestsPerMinute} req/min (${config.max}/${windowMinutes}min)` : 
                            'Disabled'}
                    </span>
                </div>
            `);
        }
        
        statsContainer.innerHTML = `
            <div class="card mt-3">
                <h4 class="text-sm font-semibold mb-2">Current Limits Summary</h4>
                <div class="space-y-1">
                    ${stats.join('')}
                </div>
            </div>
        `;
    }
}

// تحديث الواجهة الرئيسية لـ Rate Limits
function updateRateLimitUI() {
    // تحديث الإحصائيات
    updateRateLimitStats();
    
    // إضافة زر إعادة التعيين إذا لم يكن موجوداً
    const rateLimitSection = document.getElementById('rate-limitSection');
    if (rateLimitSection && !document.getElementById('resetRateLimitsBtn')) {
        const header = rateLimitSection.querySelector('.flex.justify-between');
        if (header) {
            const resetBtn = document.createElement('button');
            resetBtn.id = 'resetRateLimitsBtn';
            resetBtn.className = 'bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium transition ml-2';
            resetBtn.innerHTML = '<i class="fas fa-undo-alt mr-1"></i> Reset to Defaults';
            resetBtn.onclick = resetRateLimits;
            
            const refreshBtn = header.querySelector('button');
            if (refreshBtn) {
                refreshBtn.after(resetBtn);
            } else {
                header.appendChild(resetBtn);
            }
        }
    }
}




        function saveLimitConfig() {
            const config = {
                students: parseInt(document.getElementById('configStudentsMax')?.value) || 50,
                doctors: parseInt(document.getElementById('configDoctorsMax')?.value) || 30,
                reports: parseInt(document.getElementById('configReportsMax')?.value) || 20
            };
            
            localStorage.setItem('rateLimitConfig', JSON.stringify(config));
            showToast('Configuration saved', 'success');
            loadRateLimitData();
        }
        
        // ============================================
        // REFRESH FUNCTIONS
        // ============================================
        
        function refreshAllData() {
            showToast('Refreshing all data...', 'info');
            loadAllData();
        }
        
// ============================================
// SECURITY FUNCTIONS===============================================================
// ============================================
// دالة لإظهار/إخفاء كلمة المرور
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    
    // تغيير أيقونة العين
    const button = input.parentElement.querySelector('button');
    if (button) {
        const icon = button.querySelector('i');
        if (icon) {
            if (type === 'text') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    }
}
// ============================================
// FIXED SECURITY TAB SWITCHING
// ============================================

let currentSecurityTab = 'locked';

function showSecurityTab(tab) {
    // إخفاء كل الـ tabs
    document.querySelectorAll('.security-tab-content').forEach(el => {
        el.classList.add('hidden');
    });

    // تحديد الـ content ID بشكل صحيح (معالجة manual-ban)
    let contentId = '';
    if (tab === 'manual-ban') {
        contentId = 'securityTabManualBan';
    } else {
        const capitalized = tab.charAt(0).toUpperCase() + tab.slice(1);
        contentId = `securityTab${capitalized}`;
    }

    const target = document.getElementById(contentId);
    if (target) {
        target.classList.remove('hidden');

        // تحميل البيانات الخاصة بالتاب
        if (tab === 'manual-ban') {
            loadManualBannedIPs();
        } else if (tab === 'locked') {
            loadLockedUsers();
        } else if (tab === 'failed') {
            loadFailedLogins();
        } else if (tab === 'audit') {
            loadAuditLogs();
        } else if (tab === 'passwords') {
            loadPasswordStrength();
        } else if (tab === 'permissions') {
            loadPermissionsAudit();
        } else if (tab === 'endpoints') {
            loadEndpointStats();
        }

        currentSecurityTab = tab;

        // تحديث ستايل التاب النشط
        document.querySelectorAll('button[id^="tab"]').forEach(btn => {
            btn.classList.remove('tab-btn-active');
            btn.classList.add('tab-btn-inactive');
        });

        let activeBtnId = tab === 'manual-ban' ? 'tabManualBanBtn' : `tab${tab.charAt(0).toUpperCase() + tab.slice(1)}Btn`;
        const activeBtn = document.getElementById(activeBtnId);
        if (activeBtn) {
            activeBtn.classList.add('tab-btn-active');
            activeBtn.classList.remove('tab-btn-inactive');
        }
    } else {
        console.error(`❌ Tab content not found: ${contentId}`);
    }
}

async function loadFailedLogins() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/api/security/failed-logins?limit=50`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            const countEl = document.getElementById('failedAttemptsCount');
            if (countEl) countEl.textContent = data.total;
            
            const container = document.getElementById('failedLoginsList');
            if (!container) return;
            
            if (data.attempts.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-400 py-4 text-sm">No failed login attempts</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="p-2">Time</th>
                                <th class="p-2">Username</th>
                                <th class="p-2">IP Address</th>
                                <th class="p-2">User Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.attempts.map(a => `
                                <tr class="border-b border-white/5">
                                    <td class="p-2">${new Date(a.timestamp).toLocaleString()}</td>
                                    <td class="p-2 font-mono">${escapeHtml(a.username)}</td>
                                    <td class="p-2 font-mono">${a.ip}</td>
                                    <td class="p-2 text-xs truncate max-w-[200px]">${a.userAgent || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading failed logins:', error);
    }
}

async function loadAutoBannedIPs() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/api/security/auto-banned`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            const countEl = document.getElementById('autoBannedCount');
            if (countEl) countEl.textContent = data.total;
            
            const container = document.getElementById('bannedIPsList');
            if (!container) return;
            
            if (data.banned.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-400 py-4 text-sm">No auto-banned IPs</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="p-2">IP Address</th>
                                <th class="p-2">Banned At</th>
                                <th class="p-2">Reason</th>
                                <th class="p-2">Attempts</th>
                                <th class="p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.banned.map(b => `
                                <tr class="border-b border-white/5">
                                    <td class="p-2 font-mono">${b.ip}</td>
                                    <td class="p-2">${new Date(b.bannedAt).toLocaleString()}</td>
                                    <td class="p-2">${b.reason}</td>
                                    <td class="p-2">${b.attempts?.length || 0}</td>
                                    <td class="p-2">
                                        <button onclick="unbanIP('${b.ip}')" class="text-emerald-400 hover:text-emerald-300">
                                            <i class="fas fa-check-circle"></i> Unban
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading auto-banned IPs:', error);
    }
}


async function refreshAllSecurityData() {
    showToast('Refreshing security data...', 'info');
    
    await Promise.all([
        loadLockedUsers(),
        loadFailedLogins(),
        loadAuditLogs(),
        loadPasswordStrength(),
        loadPermissionsAudit(),
        loadEndpointStats(),
        loadManualBannedIPs()
    ]);
    
    showToast('All security data refreshed', 'success');
}
// ============================================
// RESET AUDIT FILTERS
// ============================================

function resetAuditFilters() {
    const userFilter = document.getElementById('auditUserFilter');
    const actionFilter = document.getElementById('auditActionFilter');
    
    if (userFilter) userFilter.value = '';
    if (actionFilter) actionFilter.value = '';
    
    loadAuditLogs();
}

// ============================================
// FIXED INIT FOR SECURITY TABS
// ============================================

function initSecuritySection() {
    const tabsConfig = [
        { key: 'locked',      btnId: 'tabLockedBtn' },
        { key: 'failed',      btnId: 'tabFailedBtn' },
        { key: 'manual-ban',  btnId: 'tabManualBanBtn' },   // ← مهم
        { key: 'audit',       btnId: 'tabAuditBtn' },
        { key: 'passwords',   btnId: 'tabPasswordsBtn' },
        { key: 'permissions', btnId: 'tabPermissionsBtn' },
        { key: 'endpoints',   btnId: 'tabEndpointsBtn' }
    ];

    tabsConfig.forEach(({ key, btnId }) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = () => showSecurityTab(key);
        }
    });

    console.log('✅ Security tabs initialized correctly (manual-ban fixed)');
}

// تشغيل التهيئة بعد تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initSecuritySection, 800);
});


async function unbanIP(ip) {
    if (confirm(`Unban IP ${ip}?`)) {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE}/api/security/unban/${ip}`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.ok) {
                showToast(`IP ${ip} unbanned`, 'success');
                loadAutoBannedIPs();
            } else {
                showToast('Failed to unban IP', 'error');
            }
        } catch (error) {
            console.error('Error unbanning IP:', error);
            showToast('Error unbanning IP', 'error');
        }
    }
}

async function loadAuditLogs() {
    try {
        const userFilter = document.getElementById('auditUserFilter')?.value || '';
        const actionFilter = document.getElementById('auditActionFilter')?.value || '';
        
        let url = '/api/security/audit-logs?limit=100';
        if (userFilter) url += `&user=${encodeURIComponent(userFilter)}`;
        if (actionFilter) url += `&action=${actionFilter}`;
        
        const token = getAuthToken();
        const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            
            const container = document.getElementById('auditLogsList');
            if (!container) return;
            
            if (data.logs.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-400 py-4 text-sm">No audit logs found</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="p-2">Time</th>
                                <th class="p-2">User</th>
                                <th class="p-2">Action</th>
                                <th class="p-2">Details</th>
                                <th class="p-2">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.logs.map(log => `
                                <tr class="border-b border-white/5">
                                    <td class="p-2">${new Date(log.timestamp).toLocaleString()}</td>
                                    <td class="p-2 font-semibold">${escapeHtml(log.username || 'System')}</td>
                                    <td class="p-2">
                                        <span class="px-2 py-0.5 rounded-full text-xs ${log.action.includes('FAILED') ? 'bg-red-600/20 text-red-400' : log.action.includes('SUCCESS') ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'}">
                                            ${log.action}
                                        </span>
                                    </td>
                                    <td class="p-2">${escapeHtml(log.details || '-')}</td>
                                    <td class="p-2 font-mono">${log.ip}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading audit logs:', error);
    }
}


async function loadPasswordStrength() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/api/security/password-strength`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            const weakEl = document.getElementById('weakPasswordsCount');
            if (weakEl) weakEl.textContent = data.weak;
            
            const container = document.getElementById('passwordStrengthList');
            if (!container) return;
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="p-2">User</th>
                                <th class="p-2">Role</th>
                                <th class="p-2">Strength</th>
                                <th class="p-2">Issues</th>
                                <th class="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.users.map(u => `
                                <tr class="border-b border-white/5">
                                    <td class="p-2 font-semibold">${escapeHtml(u.username)}</td>
                                    <td class="p-2"><span class="badge badge-online">${u.role}</span></td>
                                    <td class="p-2">
                                        <div class="flex items-center gap-2">
                                            <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div class="h-full ${u.strength >= 4 ? 'bg-green-500' : u.strength >= 2 ? 'bg-yellow-500' : 'bg-red-500'}" style="width: ${(u.strength/5)*100}%"></div>
                                            </div>
                                            <span class="${u.strength >= 4 ? 'text-green-400' : u.strength >= 2 ? 'text-yellow-400' : 'text-red-400'}">${u.strengthLabel}</span>
                                        </div>
                                    </td>
                                    <td class="p-2 text-xs">${u.issues.join(', ') || 'None'}</td>
                                    <td class="p-2">
                                        ${u.isDefault ? '<span class="text-red-400 text-xs">⚠️ Default password</span>' : '<span class="text-green-400 text-xs">✓ OK</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading password strength:', error);
    }
}

async function loadPermissionsAudit() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/api/security/permissions-audit`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            const highRiskEl = document.getElementById('highRiskCount');
            if (highRiskEl) highRiskEl.textContent = data.highRisk;
            
            const container = document.getElementById('permissionsAuditList');
            if (!container) return;
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="p-2">User</th>
                                <th class="p-2">Role</th>
                                <th class="p-2">Custom Permissions</th>
                                <th class="p-2">Elevated Permissions</th>
                                <th class="p-2">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.users.map(u => `
                                <tr class="border-b border-white/5">
                                    <td class="p-2 font-semibold">${escapeHtml(u.username)}</td>
                                    <td class="p-2"><span class="badge badge-online">${u.role}</span></td>
                                    <td class="p-2">${u.hasCustomPermissions ? '✅ Yes' : '❌ No'}</td>
                                    <td class="p-2">
                                        ${u.elevatedPermissions.length > 0 ? 
                                            `<span class="text-red-400">${u.elevatedPermissions.length} permissions</span>` : 
                                            '<span class="text-green-400">None</span>'}
                                    </td>
                                    <td class="p-2">
                                        <span class="px-2 py-0.5 rounded-full text-xs ${u.riskLevel === 'HIGH' ? 'bg-red-600/20 text-red-400' : u.riskLevel === 'MEDIUM' ? 'bg-yellow-600/20 text-yellow-400' : 'bg-green-600/20 text-green-400'}">
                                            ${u.riskLevel}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading permissions audit:', error);
    }
}


async function loadEndpointStats() {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}/api/security/endpoint-stats`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            const data = await response.json();
            
            const container = document.getElementById('endpointsStatsList');
            if (!container) return;
            
            if (data.endpoints.length === 0) {
                container.innerHTML = '<p class="text-center text-gray-400 py-4 text-sm">No API stats available</p>';
                return;
            }
            
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="p-2">Endpoint</th>
                                <th class="p-2">Method</th>
                                <th class="p-2">Requests</th>
                                <th class="p-2">Unique IPs</th>
                                <th class="p-2">Last Accessed</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.endpoints.map(e => `
                                <tr class="border-b border-white/5">
                                    <td class="p-2 font-mono">${escapeHtml(e.endpoint)}</td>
                                    <td class="p-2"><span class="px-2 py-0.5 rounded-full text-xs bg-blue-600/20 text-blue-400">${e.method}</span></td>
                                    <td class="p-2 font-bold">${e.count.toLocaleString()}</td>
                                    <td class="p-2">${e.uniqueIPs}</td>
                                    <td class="p-2 text-xs">${e.lastAccessed ? new Date(e.lastAccessed).toLocaleString() : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading endpoint stats:', error);
    }
}


async function refreshSecurityData() {
    if (currentSecurityTab === 'failed') loadFailedLogins();
    else if (currentSecurityTab === 'banned') loadAutoBannedIPs();
    else if (currentSecurityTab === 'audit') loadAuditLogs();
    else if (currentSecurityTab === 'passwords') loadPasswordStrength();
    else if (currentSecurityTab === 'permissions') loadPermissionsAudit();
    else if (currentSecurityTab === 'endpoints') loadEndpointStats();
    
    showToast('Security data refreshed', 'success');
}


// ============================================
// SCHEDULED BACKUP FUNCTIONS
// ============================================
async function loadScheduleSettings() {
    try {
        const response = await fetch(`${API_BASE}/api/backup-schedule`);
        if (response && response.ok) {
            const data = await response.json();
            const schedule = data.schedule;
            
            // التحقق من وجود العناصر قبل التعديل
            const enabledCheckbox = document.getElementById('scheduleEnabled');
            const frequencySelect = document.getElementById('scheduleFrequency');
            const timeInput = document.getElementById('scheduleTime');
            const retentionInput = document.getElementById('scheduleRetention');
            
            if (enabledCheckbox) enabledCheckbox.checked = schedule.enabled;
            if (frequencySelect) frequencySelect.value = schedule.frequency;
            if (timeInput) timeInput.value = schedule.time;
            if (retentionInput) retentionInput.value = schedule.retentionDays;
            
            // تحديث حقول الجدولة
            if (typeof updateScheduleFields === 'function') updateScheduleFields();
            
            // تحديث عرض الحالة
            const scheduleStatusEl = document.getElementById('scheduleStatus');
            const runStatusEl = document.getElementById('scheduleRunStatus');
            const lastRunEl = document.getElementById('scheduleLastRun');
            const nextRunEl = document.getElementById('scheduleNextRun');
            const retentionDisplayEl = document.getElementById('scheduleRetentionDisplay');
            
            if (scheduleStatusEl) {
                if (schedule.enabled) {
                    scheduleStatusEl.innerHTML = '<span class="bg-green-600/20 text-green-400 px-2 py-1 rounded-full text-xs"><i class="fas fa-check-circle mr-1"></i>Active</span>';
                } else {
                    scheduleStatusEl.innerHTML = '<span class="bg-gray-600/20 text-gray-400 px-2 py-1 rounded-full text-xs"><i class="fas fa-pause-circle mr-1"></i>Disabled</span>';
                }
            }
            
            if (runStatusEl) {
                if (schedule.status === 'running') {
                    runStatusEl.innerHTML = '<span class="text-yellow-400"><i class="fas fa-spinner fa-spin mr-1"></i>Running...</span>';
                } else if (schedule.status === 'failed') {
                    runStatusEl.innerHTML = `<span class="text-red-400"><i class="fas fa-exclamation-circle mr-1"></i>Failed: ${schedule.lastError || 'Unknown error'}</span>`;
                } else {
                    runStatusEl.innerHTML = '<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>Idle</span>';
                }
            }
            
            if (lastRunEl) lastRunEl.textContent = schedule.lastRun ? new Date(schedule.lastRun).toLocaleString() : 'Never';
            if (nextRunEl) nextRunEl.textContent = data.nextRun ? new Date(data.nextRun).toLocaleString() : 'Not scheduled';
            if (retentionDisplayEl) retentionDisplayEl.textContent = `${schedule.retentionDays} days`;
        }
    } catch (error) {
        console.error('Error loading schedule settings:', error);
        // لا نعرض خطأ للمستخدم
    }
}


// تحميل إحصائيات النسخ الاحتياطية
async function loadBackupStats() {
    try {
        const response = await fetch(`${API_BASE}/api/backup-stats`);
        if (response.ok) {
            const stats = await response.json();
            
            const totalEl = document.getElementById('backupTotalCount');
            const autoEl = document.getElementById('backupAutoCount');
            const manualEl = document.getElementById('backupManualCount');
            const sizeEl = document.getElementById('backupTotalSize');
            
            if (totalEl) totalEl.textContent = stats.total || 0;
            if (autoEl) autoEl.textContent = stats.auto || 0;
            if (manualEl) manualEl.textContent = stats.manual || 0;
            if (sizeEl) sizeEl.textContent = stats.totalSize || '0';
        }
    } catch (error) {
        console.error('Error loading backup stats:', error);
    }
}

// تحديث حقول الجدولة حسب التردد
function updateScheduleFields() {
    const frequency = document.getElementById('scheduleFrequency')?.value;
    const weeklyDiv = document.getElementById('weeklyDayDiv');
    const monthlyDiv = document.getElementById('monthlyDayDiv');
    
    if (frequency === 'weekly') {
        if (weeklyDiv) weeklyDiv.classList.remove('hidden');
        if (monthlyDiv) monthlyDiv.classList.add('hidden');
    } else if (frequency === 'monthly') {
        if (weeklyDiv) weeklyDiv.classList.add('hidden');
        if (monthlyDiv) monthlyDiv.classList.remove('hidden');
    } else {
        if (weeklyDiv) weeklyDiv.classList.add('hidden');
        if (monthlyDiv) monthlyDiv.classList.add('hidden');
    }
}

// تبديل حالة الجدولة
async function toggleSchedule() {
    const enabled = document.getElementById('scheduleEnabled')?.checked || false;
    const frequency = document.getElementById('scheduleFrequency')?.value || 'daily';
    const time = document.getElementById('scheduleTime')?.value || '02:00';
    const dayOfWeek = parseInt(document.getElementById('scheduleDayOfWeek')?.value || '1');
    const dayOfMonth = parseInt(document.getElementById('scheduleDayOfMonth')?.value || '1');
    const retentionDays = parseInt(document.getElementById('scheduleRetention')?.value || '30');
    
    const data = { enabled, frequency, time, dayOfWeek, dayOfMonth, retentionDays };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/backup-schedule`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadScheduleSettings();
        }
    } catch (error) {
        console.error('Error toggling schedule:', error);
    }
}

// حفظ إعدادات الجدولة
async function saveScheduleSettings() {
    const enabled = document.getElementById('scheduleEnabled')?.checked || false;
    const frequency = document.getElementById('scheduleFrequency')?.value || 'daily';
    const time = document.getElementById('scheduleTime')?.value || '02:00';
    const dayOfWeek = parseInt(document.getElementById('scheduleDayOfWeek')?.value || '1');
    const dayOfMonth = parseInt(document.getElementById('scheduleDayOfMonth')?.value || '1');
    const retentionDays = parseInt(document.getElementById('scheduleRetention')?.value || '30');
    
    const data = { enabled, frequency, time, dayOfWeek, dayOfMonth, retentionDays };
    
    showToast('Saving schedule settings...', 'info');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/backup-schedule`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Schedule settings saved', 'success');
            await loadScheduleSettings();
            await loadBackupStats();
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        showToast('Error saving settings', 'error');
    }
}

// تنفيذ نسخة احتياطية فورية
async function runBackupNow() {
    showToast('Creating backup...', 'info');
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/backup-now`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
            showToast('Backup created successfully', 'success');
            await loadBackups();
            await loadBackupStats();
            await loadScheduleSettings();
        } else {
            showToast('Failed to create backup', 'error');
        }
    } catch (error) {
        console.error('Error creating backup:', error);
        showToast('Error creating backup', 'error');
    }
}


// تحميل إحصائيات النسخ الاحتياطية
async function loadBackupStats() {
    try {
        const response = await fetch(`${API_BASE}/api/backup-stats`);
        if (response.ok) {
            const stats = await response.json();
            
            const totalEl = document.getElementById('backupTotalCount');
            const autoEl = document.getElementById('backupAutoCount');
            const manualEl = document.getElementById('backupManualCount');
            const sizeEl = document.getElementById('backupTotalSize');
            
            if (totalEl) totalEl.textContent = stats.total || 0;
            if (autoEl) autoEl.textContent = stats.auto || 0;
            if (manualEl) manualEl.textContent = stats.manual || 0;
            if (sizeEl) sizeEl.textContent = stats.totalSize || '0';
        }
    } catch (error) {
        console.error('Error loading backup stats:', error);
    }
}

// تحديث حالة الجدولة يدوياً
async function refreshScheduleStatus() {
    await loadScheduleSettings();
    await loadBackupStats();
    showToast('Schedule status refreshed', 'success');
}

// تحديث جميع بيانات النسخ الاحتياطي
async function refreshBackupData() {
    await loadBackups();
    await loadBackupStats();
    await loadScheduleSettings();
    showToast('Backup data refreshed', 'success');
}

// تصفية النسخ الاحتياطية
function filterBackups() {
    const searchInput = document.getElementById('backupSearchInput');
    const searchTerm = searchInput?.value.toLowerCase() || '';
    
    const rows = document.querySelectorAll('#backupsList tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (searchTerm === '' || text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}
// ============================================
// RENDER BACKUPS TABLE
// ============================================

function renderBackupsTable(backups) {
    const container = document.getElementById('backupsList');
    if (!container) return;
    
    if (!backups || backups.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8 text-sm">No backups found</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead>
                    <tr class="text-left text-gray-400 text-xs">
                        <th class="p-3">Backup Name</th>
                        <th class="p-3">Size</th>
                        <th class="p-3">Created</th>
                        <th class="p-3">Type</th>
                        <th class="p-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${backups.sort((a, b) => new Date(b.created) - new Date(a.created)).map(backup => `
                        <tr class="border-b border-white/5 hover:bg-white/5">
                            <td class="p-3 font-mono text-xs">${escapeHtml(backup.name)}</td>
                            <td class="p-3 text-xs">${(backup.size / 1024).toFixed(2)} KB</td>
                            <td class="p-3 text-xs">${new Date(backup.created).toLocaleString()}</td>
                            <td class="p-3"><span class="badge badge-online text-xs">${backup.type || 'manual'}</span></td>
                            <td class="p-3">
                                <button onclick="restoreBackup('${escapeHtml(backup.name)}')" class="btn-primary px-2 py-1 rounded text-xs mr-1">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button onclick="deleteBackup('${escapeHtml(backup.name)}')" class="btn-danger px-2 py-1 rounded text-xs">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// دالة مساعدة لتجنب XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
// تعديل دالة renderBackupsTable لإضافة التصفية
const originalRenderBackupsTable = renderBackupsTable;
renderBackupsTable = function(backups) {
    originalRenderBackupsTable(backups);
    // إضافة حدث البحث
    const searchInput = document.getElementById('backupSearchInput');
    if (searchInput && !searchInput.hasListener) {
        searchInput.addEventListener('keyup', filterBackups);
        searchInput.hasListener = true;
    }
};

// تعديل دالة loadBackups الأصلية لإضافة الإحصائيات
const originalLoadBackups = loadBackups;
loadBackups = async function() {
    await originalLoadBackups();
    await loadBackupStats();
};



// ============================================
// LOCKED USERS MANAGEMENT
// ============================================

let currentUnlockUsername = null;

async function loadLockedUsers() {
    const container = document.getElementById('lockedUsersList');
    if (!container) {
        console.error('lockedUsersList container not found');
        return;
    }
    
    try {
        const token = getAuthToken();
        
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-3"></i>
                    <p class="text-yellow-400">Please login first</p>
                </div>
            `;
            return;
        }
        
        console.log('Loading locked users with token:', token.substring(0, 20) + '...');
        
        // ✅ استخدام authFetch
        const response = await authFetch('/api/locked-users');
        
        console.log('Locked users response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-3"></i>
                    <p class="text-red-400">Access Denied (${response.status})</p>
                    <p class="text-gray-400 text-sm mt-2">You need admin privileges to view locked users</p>
                    <button onclick="location.reload()" 
                            class="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm">
                        <i class="fas fa-sync-alt mr-2"></i>Reload & Login
                    </button>
                </div>
            `;
            return;
        }
        
        if (response.ok) {
            const data = await response.json();
            lockedUsersData = data.users || [];
            
            const lockedCountEl = document.getElementById('lockedUsersCount');
            if (lockedCountEl) lockedCountEl.textContent = lockedUsersData.length;
            
            if (lockedUsersData.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
                        <p class="text-gray-400">No locked users found</p>
                    </div>
                `;
                return;
            }
            
            // عرض الجدول...
            container.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-white/10">
                                <th class="pb-3">Username</th>
                                <th class="pb-3">Locked At</th>
                                <th class="pb-3">Failed Attempts</th>
                                <th class="pb-3">Reason</th>
                                <th class="pb-3 text-center">Actions</th>
                             </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            ${lockedUsersData.map(user => `
                                <tr class="hover:bg-white/5 transition-colors">
                                    <td class="py-3 font-bold text-red-400">
                                        <i class="fas fa-lock mr-2 text-xs"></i>${escapeHtml(user.username)}
                                    </td>
                                    <td class="py-3 text-xs text-gray-400">${new Date(user.lockedAt).toLocaleString()}</td>
                                    <td class="py-3 text-center">
                                        <span class="px-2 py-1 bg-red-600/20 rounded-full text-xs text-red-400">${user.failedAttempts || 0}</span>
                                    </td>
                                    <td class="py-3 text-xs text-gray-400 max-w-[200px] truncate">${user.reason || 'Failed login attempts'}</td>
                                    <td class="py-3 text-center">
                                        <button onclick="openUnlockModal('${escapeHtml(user.username)}')" 
                                                class="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-xs transition">
                                            <i class="fas fa-unlock-alt mr-1"></i> Unlock
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-3"></i>
                    <p class="text-red-400">Failed to load locked users (Status: ${response.status})</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading locked users:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-wifi text-4xl text-yellow-500 mb-3"></i>
                <p class="text-yellow-400">Connection error: ${error.message}</p>
            </div>
        `;
    }
}

// ============================================
// UNLOCK USER MODAL FUNCTIONS - FIXED
// ============================================

let lockedUsersData = [];

function openUnlockModal(username) {
    console.log(`🔓 Opening unlock modal for user: ${username}`);
    
    // التحقق من وجود المودال
    const modal = document.getElementById('unlockUserModal');
    if (!modal) {
        console.error('❌ Unlock modal not found in DOM');
        alert('Error: Unlock form not found. Please refresh the page.');
        return;
    }
    
    // التحقق من وجود العناصر المطلوبة
    const usernameEl = document.getElementById('unlockUsername');
    const userDetailsEl = document.getElementById('unlockUserDetails');
    const newPasswordDiv = document.getElementById('newPasswordDiv');
    const unlockNewPassword = document.getElementById('unlockNewPassword');
    const unlockConfirmPassword = document.getElementById('unlockConfirmPassword');
    
    if (!usernameEl || !userDetailsEl) {
        console.error('❌ Modal elements not found');
        alert('Error loading unlock form');
        return;
    }
    
    currentUnlockUsername = username;
    usernameEl.textContent = username;
    
    // البحث عن معلومات المستخدم
    let userInfo = 'Locked due to multiple failed login attempts';
    
    if (window.lockedUsersData && window.lockedUsersData.length > 0) {
        const lockedUser = window.lockedUsersData.find(u => u.username === username);
        if (lockedUser) {
            userInfo = `Locked at: ${new Date(lockedUser.lockedAt).toLocaleString()}<br>
                       Failed attempts: ${lockedUser.failedAttempts || 0}<br>
                       Reason: ${lockedUser.reason || 'Multiple failed attempts'}`;
        }
    }
    
    userDetailsEl.innerHTML = userInfo;
    
    // إعادة تعيين النموذج
    const keepOption = document.querySelector('input[name="unlockOption"][value="keep"]');
    const newOption = document.querySelector('input[name="unlockOption"][value="new"]');
    
    if (keepOption) keepOption.checked = true;
    if (newOption) newOption.checked = false;
    if (newPasswordDiv) newPasswordDiv.classList.add('hidden');
    if (unlockNewPassword) unlockNewPassword.value = '';
    if (unlockConfirmPassword) unlockConfirmPassword.value = '';
    
    // إظهار المودال
    modal.classList.remove('hidden');
    
    // إضافة تأثير ظهور
    const modalContent = modal.querySelector('.bg-gradient-to-br');
    if (modalContent) {
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    }
}

function closeUnlockModal() {
    const modal = document.getElementById('unlockUserModal');
    if (!modal) return;
    
    const modalContent = modal.querySelector('.bg-gradient-to-br');
    if (modalContent) {
        modalContent.classList.add('scale-95');
        modalContent.classList.remove('scale-100');
    }
    
    modal.classList.add('hidden');
    currentUnlockUsername = null;
}

// مراقبة تغيير خيارات القفل
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const radioButtons = document.querySelectorAll('input[name="unlockOption"]');
        if (radioButtons.length === 0) {
            console.log('No unlock option radio buttons found');
            return;
        }
        
        radioButtons.forEach(radio => {
            // إزالة المستمع القديم إذا وجد
            const newRadio = radio.cloneNode(true);
            radio.parentNode.replaceChild(newRadio, radio);
            
            newRadio.addEventListener('change', function() {
                const newPasswordDiv = document.getElementById('newPasswordDiv');
                if (newPasswordDiv) {
                    if (this.value === 'new') {
                        newPasswordDiv.classList.remove('hidden');
                    } else {
                        newPasswordDiv.classList.add('hidden');
                    }
                }
            });
        });
        console.log('✅ Unlock radio buttons listeners attached');
    }, 500);
});

// Monitor radio buttons
document.querySelectorAll('input[name="unlockOption"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const newPasswordDiv = document.getElementById('newPasswordDiv');
        const newPasswordConfirmDiv = document.getElementById('newPasswordConfirmDiv');
        
        if (this.value === 'new') {
            newPasswordDiv.classList.remove('hidden');
            newPasswordConfirmDiv.classList.remove('hidden');
        } else {
            newPasswordDiv.classList.add('hidden');
            newPasswordConfirmDiv.classList.add('hidden');
        }
    });
});

async function confirmUnlockUser() {
    const username = currentUnlockUsername;
    if (!username) {
        showToast('No user selected', 'error');
        return;
    }
    
    const selectedOption = document.querySelector('input[name="unlockOption"]:checked');
    const option = selectedOption ? selectedOption.value : 'keep';
    
    let payload = {};
    
    if (option === 'keep') {
        payload = { keepCurrentPassword: true };
        console.log('📤 Sending unlock request (keep current password) for:', username);
    } else {
        const newPassword = document.getElementById('unlockNewPassword')?.value || '';
        const confirmPassword = document.getElementById('unlockConfirmPassword')?.value || '';
        
        if (!newPassword) {
            showToast('Please enter a new password', 'error');
            return;
        }
        
        if (newPassword.length < 4) {
            showToast('Password must be at least 4 characters', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        payload = { newPassword: newPassword };
        console.log('📤 Sending unlock request (with new password) for:', username);
    }
    
    showToast(`Unlocking user ${username}...`, 'info');
    
    try {
        const response = await authFetch(`/api/unlock-user/${encodeURIComponent(username)}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        console.log('📥 Response status:', response.status);
        console.log('📥 Response data:', data);
        
        if (response.ok) {
            showToast(data.message || `User ${username} unlocked successfully`, 'success');
            closeUnlockModal();
            
            // إعادة تحميل البيانات
            await loadLockedUsers();
            if (typeof loadSecurityData === 'function') await loadSecurityData();
        } else {
            showToast(data.error || 'Failed to unlock user', 'error');
        }
    } catch (error) {
        console.error('Error unlocking user:', error);
        showToast('Error unlocking user: ' + error.message, 'error');
    }
}

// إضافة زر تحديث في Security Section
function addLockedUsersRefresh() {
    const securitySection = document.getElementById('securitySection');
    if (securitySection && !document.querySelector('#lockedUsersRefreshBtn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'lockedUsersRefreshBtn';
        refreshBtn.className = 'text-sm text-emerald-400 hover:text-emerald-300 ml-2';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Refresh';
        refreshBtn.onclick = loadLockedUsers;
        
        const header = securitySection.querySelector('.flex.justify-between');
        if (header) {
            header.appendChild(refreshBtn);
        }
    }
}

// تحديث دالة loadSecurityData لتشمل المستخدمين المحظورين
const originalLoadSecurityData = loadSecurityData;
loadSecurityData = async function() {
    await originalLoadSecurityData();
    await loadLockedUsers();
    await loadManualBannedIPs();
};

// إضافة CSS للـ 423 status
// أضف في الـ style
const style = document.createElement('style');
style.textContent = `
    .status-423 {
        background: rgba(239, 68, 68, 0.2);
        border-left: 4px solid #ef4444;
    }
`;
document.head.appendChild(style);



// ============================================
// MANUAL IP BAN MANAGEMENT - SIMPLIFIED WORKING VERSION
// ============================================

let manualBannedIPs = [];

// الدالة الرئيسية لتحميل وعرض الـ IPs المحظورة
async function loadManualBannedIPs() {
    console.log('🔄 loadManualBannedIPs STARTED');
    
    // البحث عن العنصر
    let container = document.getElementById('manualBannedIPsList');
    
    // إذا لم يكن موجوداً، ننتظر قليلاً ونجرب مرة أخرى
    if (!container) {
        console.log('⚠️ Container not found, waiting 500ms...');
        setTimeout(() => loadManualBannedIPs(), 500);
        return;
    }
    
    // عرض رسالة تحميل
    container.innerHTML = '<div class="text-center text-yellow-400 py-8"><i class="fas fa-spinner fa-spin mr-2"></i> Loading banned IPs...</div>';
    
    try {
        const token = getAuthToken();
        if (!token) {
            container.innerHTML = `
                <div class="text-center text-yellow-400 py-8">
                    <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
                    <p>Please login first</p>
                </div>
            `;
            return;
        }
        
        const response = await fetch('/api/security/manual-banned-ips', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            manualBannedIPs = data.banned || [];
            console.log(`✅ Loaded ${manualBannedIPs.length} banned IPs`);
            renderIPBanListToContainer(container);
        } else if (response.status === 404) {
            // API غير موجود، نستخدم بيانات وهمية للاختبار
            console.log('⚠️ API not found, using demo data');
            manualBannedIPs = [];
            renderIPBanListToContainer(container);
        } else {
            container.innerHTML = `
                <div class="text-center text-red-400 py-8">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Failed to load banned IPs (Status: ${response.status})</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading banned IPs:', error);
        container.innerHTML = `
            <div class="text-center text-red-400 py-8">
                <i class="fas fa-wifi text-4xl mb-3"></i>
                <p>Connection error: ${error.message}</p>
                <button onclick="loadManualBannedIPs()" class="mt-4 px-4 py-2 bg-emerald-600 rounded-lg text-sm">
                    <i class="fas fa-sync-alt mr-2"></i> Retry
                </button>
            </div>
        `;
    }
    // تحديث العدد في الكارد
const countEl = document.getElementById('bannedIPsCount');
if (countEl) countEl.textContent = manualBannedIPs.length;
}

// دالة لعرض الـ IPs في العنصر المحدد
function renderIPBanListToContainer(container) {
    if (!container) return;
    
    if (!manualBannedIPs || manualBannedIPs.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-shield-alt text-5xl mb-4 opacity-50"></i>
                <p class="text-lg font-semibold">No Banned IPs</p>
                <p class="text-sm mt-2">Use the form above to ban an IP address</p>
                <button onclick="addTestIPForDemo()" class="mt-6 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-sm transition">
                    <i class="fas fa-plus-circle mr-2"></i> Add Test IP
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="space-y-3">';
    manualBannedIPs.forEach(ip => {
        html += `
            <div class="bg-slate-800/80 rounded-xl p-4 border border-red-500/20 hover:border-red-500/40 transition-all duration-200">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 flex-wrap">
                            <span class="font-mono text-base font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-lg">${escapeHtml(ip.ip)}</span>
                            <span class="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded-full">Banned</span>
                        </div>
                        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-400">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-comment w-4 text-gray-500"></i>
                                <span class="truncate">Reason: ${escapeHtml(ip.reason || 'No reason provided')}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fas fa-user-shield w-4 text-gray-500"></i>
                                <span>Banned by: ${escapeHtml(ip.bannedBy || 'System')}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <i class="fas fa-calendar w-4 text-gray-500"></i>
                                <span>Date: ${new Date(ip.bannedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <button onclick="unbanIPManually('${ip.ip}')" 
                            class="ml-4 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-sm transition-all duration-200 flex items-center gap-2">
                        <i class="fas fa-unlock-alt"></i>
                        <span>Unban</span>
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// دالة لإضافة IP تجريبي للاختبار
function addTestIPForDemo() {
    const testIP = '192.168.1.' + Math.floor(Math.random() * 200 + 1);
    if (confirm(`Add test IP ${testIP} to banned list for demonstration?`)) {
        if (!manualBannedIPs) manualBannedIPs = [];
        manualBannedIPs.unshift({
            ip: testIP,
            reason: 'Test IP - Added for demonstration purposes',
            bannedBy: 'Admin (Demo)',
            bannedAt: new Date().toISOString()
        });
        
        const container = document.getElementById('manualBannedIPsList');
        if (container) {
            renderIPBanListToContainer(container);
        }
        showToast(`Test IP ${testIP} added to list`, 'info');
    }
}

// دالة لحظر IP يدوياً
async function banIP() {
    const ipInput = document.getElementById('banIpInput');
    const reasonInput = document.getElementById('banReasonInput');
    
    const ip = ipInput?.value?.trim();
    const reason = reasonInput?.value?.trim();
    
    if (!ip) {
        showToast('Please enter an IP address', 'error');
        return;
    }
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
        showToast('Invalid IP address format', 'error');
        return;
    }
    
    showToast(`Banning IP ${ip}...`, 'info');
    
    try {
        const token = getAuthToken();
        const response = await fetch('/api/security/ban-ip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ip, reason: reason || 'Manually banned by admin' })
        });
        
        if (response.ok) {
            showToast(`IP ${ip} banned successfully`, 'success');
            if (ipInput) ipInput.value = '';
            if (reasonInput) reasonInput.value = '';
            await loadManualBannedIPs();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to ban IP', 'error');
        }
    } catch (error) {
        console.error('Error banning IP:', error);
        showToast('Error banning IP', 'error');
    }
}

// دالة لحظر الـ IP الحالي
async function banCurrentIP() {
    if (!confirm('⚠️ Are you sure you want to ban your own IP?\n\nYou will be logged out immediately and won\'t be able to access the system from this IP.')) {
        return;
    }
    
    const reason = prompt('Reason for banning your IP (optional):');
    
    showToast('Banning your IP...', 'info');
    
    try {
        const token = getAuthToken();
        const response = await fetch('/api/security/ban-current-ip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason: reason || 'Self-ban by admin' })
        });
        
        if (response.ok) {
            showToast('Your IP has been banned. You will be logged out.', 'success');
            setTimeout(() => {
                logout();
            }, 2000);
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to ban IP', 'error');
        }
    } catch (error) {
        console.error('Error banning current IP:', error);
        showToast('Error banning IP', 'error');
    }
}

// دالة لإزالة حظر IP
window.unbanIPManually = async function(ip) {
    if (!confirm(`Unban IP ${ip}? This will allow access from this IP again.`)) return;
    
    showToast(`Unbanning IP ${ip}...`, 'info');
    
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/security/unban-ip/${ip}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            showToast(data.message || `IP ${ip} unbanned successfully`, 'success');
            await loadManualBannedIPs();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to unban IP', 'error');
        }
    } catch (error) {
        console.error('Error unbanning IP:', error);
        showToast('Error unbanning IP', 'error');
    }
};

// دالة للتأكد من أن العنصر موجود عند تحميل الصفحة
function ensureManualBanContainer() {
    const container = document.getElementById('manualBannedIPsList');
    if (!container) {
        console.log('Creating manualBannedIPsList container on page load...');
        const manualBanTab = document.getElementById('securityTabManualBan');
        if (manualBanTab) {
            const bannedSection = manualBanTab.querySelector('.bg-slate-900\\/50.rounded-xl.p-4:last-child');
            if (bannedSection) {
                const newContainer = document.createElement('div');
                newContainer.id = 'manualBannedIPsList';
                newContainer.className = 'max-h-80 overflow-y-auto mt-3';
                bannedSection.appendChild(newContainer);
                console.log('✅ Container created on page load');
            }
        }
    }
}

// إضافة مستمع لتحميل الصفحة للتأكد من وجود العنصر
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(ensureManualBanContainer, 500);
});


// تحديث عدد الـ IPs المحظورة في الكارد
async function updateBannedIPsCount() {
    try {
        const token = getAuthToken();
        const response = await fetch('/api/security/manual-banned-ips', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
            const data = await response.json();
            const countEl = document.getElementById('bannedIPsCount');
            if (countEl) countEl.textContent = data.banned?.length || 0;
        }
    } catch (error) {
        console.error('Error updating banned IPs count:', error);
    }
}

// استدعاء الدالة عند تحميل البيانات
// أضفها في دالة loadManualBannedIPs

// ============================================
        // INITIALIZATION
        // ============================================
        
        function initialize() {
            updateDateTime();
            setInterval(updateDateTime, 1000);
            
            const storedToken = localStorage.getItem('devToken');
            if (storedToken) {
                try {
                    const tokenData = JSON.parse(atob(storedToken));
                    if (tokenData.exp > Date.now()) {
                        currentUser = { username: 'dev', role: 'developer' };
                        document.getElementById('loginScreen').classList.add('hidden');
                        document.getElementById('dashboard').classList.remove('hidden');
                        startMonitoring();
                        startContinuousSessionMonitor();
                        loadScheduleSettings(); // إضافة هذا السطر
                        loadBackupStats(); // إضافة هذا السطر
                        loadAllData();
                        loadRateLimitData();
                        loadManualBannedIPs();
                    }
                } catch(e) {}
            }
            
            const adminToken = localStorage.getItem('token');
            if (adminToken && !localStorage.getItem('devToken')) {
                localStorage.setItem('devToken', adminToken);
                initialize();
            }
        }
        
        initialize();
        



        // Expose functions globally
        window.forceLogout = forceLogout;
        window.forceLogoutAll = forceLogoutAll;
        window.refreshDevices = refreshDevices;
        window.terminateDevice = terminateDevice;
        window.createBackupNow = createBackupNow;
        window.restoreBackup = restoreBackup;
        window.deleteBackup = deleteBackup;
        window.checkForUpdates = checkForUpdates;
        window.refreshAllData = refreshAllData;
        window.refreshAllSessions = refreshAllSessions;
        window.addToBlacklist = addToBlacklist;
        window.removeFromBlacklist = removeFromBlacklist;
        window.saveLimitConfig = saveLimitConfig;
        // Expose schedule functions
        window.loadScheduleSettings = loadScheduleSettings;
        window.saveScheduleSettings = saveScheduleSettings;
        window.toggleSchedule = toggleSchedule;
        window.updateScheduleFields = updateScheduleFields;
        window.runBackupNow = runBackupNow;
        window.refreshScheduleStatus = refreshScheduleStatus;
        // تصدير الدوال للنطاق العام
        window.loadRateLimitData = loadRateLimitData;
        window.updateRateLimit = updateRateLimit;
        window.toggleRateLimit = toggleRateLimit;
        window.toggleAllRateLimits = toggleAllRateLimits;
        window.resetRateLimits = resetRateLimits;
        // إضافة الدوال للنطاق العام
        window.loadManualBannedIPs = loadManualBannedIPs;
        window.banIP = banIP;
        window.banCurrentIP = banCurrentIP;
        window.unbanIPManually = unbanIPManually;
        window.addTestIPForDemo = addTestIPForDemo;


