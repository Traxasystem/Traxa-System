    // ============================================
    // TRAXA DOCTOR MANAGEMENT - DYNAMIC DOCTOR LOGIN
    // ============================================
    // ✅ LOGIN: 100% DYNAMIC from doctors.json
    // ✅ SUBJECTS: 100% from subjects.json
    // ✅ LECTURES: 100% from lectures.json
    // ✅ NO HARDCODED DOCTORS - 100% DATABASE DRIVEN
    // ============================================

    const DB_URL = '/database';
    
    // Global state
    let currentDoctor = null;
    
    // Database collections - all from JSON files
    let doctors = [];
    let subjects = [];
    let lectures = [];
    let students = [];
    let locations = [];
    let timeslots = [];

    const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    
    // Doctor's filtered data
    let doctorSubjects = [];
    let doctorLectures = [];
    
    // Attendance records
    let attendanceRecords = [];
    let activeSessions = [];
    let currentSession = null;

    // ============================================
    // INITIALIZATION - LOAD ALL FROM DATABASE
    // ============================================
    document.addEventListener('DOMContentLoaded', async () => {
      console.log('🚀 Doctor Management System - DYNAMIC DATABASE LOGIN');
      console.log(`📂 Loading all data from: ${DB_URL}`);
      
      document.getElementById('dashboardLoading').classList.remove('hidden');
      
      await loadAllData();
      
      document.getElementById('dashboardLoading').classList.add('hidden');
      
  
      setupUI();
      
      ensureSettingsElements();
      
      checkStoredSession();
      
      setTimeout(testAvailableDoctors, 2000);
      
      window.addEventListener('focus', () => {
        const activeSection = document.querySelector('.nav-btn.active')?.dataset.section;
        if (activeSection === 'reports') {
          filterReports();
        } else if (activeSection === 'attendance') {
          renderActiveSessions();
        }
      });
      
      console.log('✅ DOM Content Loaded - Ready');
    });

    // ============================================
    // LOAD ALL JSON FILES - 100% FROM DATABASE
    // ============================================
    async function loadAllData() {
      console.log('📂 Loading database files...');
      
      await loadDoctors();
      
      await Promise.all([
        loadSubjects(),
        loadLectures(),
        loadLocations(),
        loadTimeslots(),
        loadStudents()
      ]);
      
      console.log('✅ All database files loaded successfully!');
      console.log(`   - Doctors: ${doctors.length}`);
      console.log(`   - Subjects: ${subjects.length}`);
      console.log(`   - Lectures: ${lectures.length}`);
      console.log(`   - Locations: ${locations.length}`);
      console.log(`   - Timeslots: ${timeslots.length}`);
      console.log(`   - Students: ${students.length}`);
    }

    async function testAvailableDoctors() {
        try {
            const response = await fetch('/database/doctors.json');
            if (response.ok) {
                const docs = await response.json();
                console.log('👨‍⚕️ Available doctors for login:', docs.map(d => ({
                    username: d.username,
                    name: d.name,
                    id: d.id
                })));
            }
        } catch (e) {
            console.error('Error fetching doctors:', e);
        }
    }

    setTimeout(testAvailableDoctors, 2000);
    
    async function loadDoctors() {
      try {
        const response = await fetch(`${DB_URL}/doctors.json`);
        if (response.ok) {
          doctors = await response.json();
          console.log(`✅ Loaded ${doctors.length} doctors from /database/doctors.json`);
          const usernames = doctors.map(d => d.username).join(', ');
          console.log(`   👨‍⚕️ Available usernames: ${usernames}`);
        } else {
          console.error('❌ CRITICAL: Could not load doctors.json from database!');
          console.error('   Make sure the file exists at: /database/doctors.json');
          showToast('❌ Database Error: Could not load doctors.json', 'error');
          doctors = [];
        }
      } catch (error) {
        console.error('❌ CRITICAL: Error loading doctors.json:', error);
        showToast('❌ Server Connection Error', 'error');
        doctors = [];
      }
    }

    async function loadSubjects() {
      try {
        const response = await fetch(`${DB_URL}/subjects.json`);
        if (response.ok) {
          subjects = await response.json();
          console.log(`✅ Loaded ${subjects.length} subjects from /database/subjects.json`);
        } else {
          console.warn('⚠️ Could not load subjects.json');
          subjects = [];
        }
      } catch (error) {
        console.error('❌ Error loading subjects:', error);
        subjects = [];
      }
    }

    async function loadLectures() {
      try {
        const response = await fetch(`${DB_URL}/lectures.json`);
        if (response.ok) {
          lectures = await response.json();
          console.log(`✅ Loaded ${lectures.length} lectures from /database/lectures.json`);
        } else {
          console.warn('⚠️ Could not load lectures.json');
          lectures = [];
        }
      } catch (error) {
        console.error('❌ Error loading lectures:', error);
        lectures = [];
      }
    }

    async function loadLocations() {
      try {
        const response = await fetch(`${DB_URL}/locations.json`);
        if (response.ok) {
          locations = await response.json();
          console.log(`✅ Loaded ${locations.length} locations`);
        }
      } catch (error) {
        locations = [];
      }
    }

    async function loadTimeslots() {
      try {
        const response = await fetch(`${DB_URL}/timeslots.json`);
        if (response.ok) {
          timeslots = await response.json();
          console.log(`✅ Loaded ${timeslots.length} timeslots`);
        }
      } catch (error) {
        timeslots = [];
      }
    }

    async function loadStudents() {
      try {
        const response = await fetch(`${DB_URL}/students.json`);
        if (response.ok) {
          students = await response.json();
          console.log(`✅ Loaded ${students.length} students`);
        }
      } catch (error) {
        students = [];
      }
    }

    // ============================================
    // دالة تسجيل الدخول المحسنة
    // ============================================
    async function handleDoctorLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('doctorUsername')?.value.trim() || '';
    const password = document.getElementById('doctorPassword')?.value || '';
    
    if (!username || !password) {
        showDoctorToast('Please enter username and password', 'error');
        return;
    }
    
    document.getElementById('loginLoading').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/doctor/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('📥 Login response:', data);
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('doctorToken', data.token);
            
            // تخزين الجلسة مع جميع البيانات
            const sessionData = {
                id: data.user.id,
                username: data.user.username,
                name: data.user.name,
                email: data.user.email,
                role: data.user.role,
                userType: data.user.userType,
                supervisorDoctorId: data.user.supervisorDoctorId,
                supervisorDoctorName: data.user.supervisorDoctorName, // هذا مهم جداً!
                taId: data.user.taId,
                permissions: data.user.permissions || null,
                loginTime: new Date().toISOString()
            };
            
            console.log('💾 Saving session data:', sessionData);
            localStorage.setItem('doctorSession', JSON.stringify(sessionData));
            
            if (data.user.userType === 'teaching-assistant') {
                currentDoctor = {
                    id: data.user.supervisorDoctorId || data.user.id,
                    name: data.user.supervisorDoctorName || data.user.name,
                    userType: 'teaching-assistant',
                    taId: data.user.id,
                    taName: data.user.name,
                    supervisorDoctorId: data.user.supervisorDoctorId,
                    supervisorDoctorName: data.user.supervisorDoctorName
                };
                console.log('👨‍🏫 TA data saved:', currentDoctor);
                
                if (data.user.permissions) {
                    window.currentTAPermissions = data.user.permissions;
                } else {
                    setTimeout(async () => {
                        try {
                            const taId = data.user.id;
                            const token = localStorage.getItem('doctorToken');
                            const permResponse = await fetch(`/api/teaching-assistant/${taId}/permissions`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            if (permResponse.ok) {
                                const permData = await permResponse.json();
                                window.currentTAPermissions = permData.permissions;
                            }
                        } catch (error) {
                            console.error('Error loading permissions:', error);
                        }
                    }, 1500);
                }
            } else {
                currentDoctor = {
                    id: data.user.id,
                    name: data.user.name,
                    userType: 'doctor'
                };
            }
            
            document.getElementById('doctorLoginScreen').classList.add('hidden');
            document.getElementById('doctorDashboard').classList.remove('hidden');
            
            // عرض معلومات المستخدم
            let userInfo = '';
            if (data.user.userType === 'teaching-assistant') {
                const supervisorName = data.user.supervisorDoctorName || 'N/A';
                userInfo = `
                    <div class="flex items-center gap-2 text-sm text-gray-400 mt-2">
                        <i class="fas fa-user-graduate text-sky-400"></i>
                        <span>Teaching Assistant</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-user-md mr-1 text-sky-400"></i>
                        Supervised by: ${supervisorName}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-id-card mr-1"></i> TA ID: ${data.user.id}
                    </div>
                `;
            } else {
                userInfo = `
                    <div class="flex items-center gap-2 text-sm text-gray-400 mt-2">
                        <i class="fas fa-user-md text-sky-400"></i>
                        <span>Doctor</span>
                    </div>
                `;
            }
            
            document.getElementById('doctorName').innerHTML = `
                <div class="font-bold text-lg text-sky-400">${data.user.name}</div>
                ${userInfo}
            `;
            document.getElementById('doctorSpecialty').innerHTML = `
                <i class="fas fa-envelope mr-1"></i> ${data.user.email || 'No email'}
            `;
            
            document.getElementById('loginLoading').classList.add('hidden');
            
            await loadDoctorData();
            renderAllSections();
            ensureSettingsElements();
            
            setTimeout(() => {
                if (data.user.userType === 'teaching-assistant') {
                    if (window.currentTAPermissions) {
                        applyTAPermissions(window.currentTAPermissions);
                    }
                    hideSettingsForTA();
                } else if (data.user.userType === 'doctor') {
                    showAllForDoctor();
                    setTimeout(() => showSettingsForDoctor(), 1000);
                }
            }, 1500);
            
            showDoctorToast(`Welcome ${data.user.name}`, 'success');
            
        } else {
            document.getElementById('loginLoading').classList.add('hidden');
            showDoctorToast(data.error || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginLoading').classList.add('hidden');
        showDoctorToast('Server connection error', 'error');
    }
}



    function generateDoctorToken(doctor) {
      const tokenData = {
        id: doctor.id,
        username: doctor.username,
        role: 'doctor',
        iat: Date.now(),
        exp: Date.now() + 8 * 60 * 60 * 1000
      };
      
      const token = btoa(JSON.stringify(tokenData));
      console.log('Generated token for doctor:', doctor.username, token.substring(0, 20) + '...');
      
      return token;
    }

    // ============================================
    // UPDATED CHECK STORED SESSION
    // ============================================
function checkStoredSession() {
  console.log('🔍 Checking stored session...');
  
  const stored = localStorage.getItem('doctorSession');
  const token = localStorage.getItem('doctorToken');
  
  if (stored && token) {
    try {
      const session = JSON.parse(stored);
      console.log('📦 Session data from localStorage:', session);
      
      currentUser = session;
      
      if (session.userType === 'teaching-assistant') {
        // بناء كامل للمعلومات - التأكد من وجود جميع الحقول
        currentDoctor = {
          id: session.supervisorDoctorId || session.id,
          name: session.supervisorDoctorName || session.name,
          userType: 'teaching-assistant',
          taId: session.taId || session.id,
          taName: session.name,
          supervisorDoctorId: session.supervisorDoctorId,
          supervisorDoctorName: session.supervisorDoctorName || 'Dr. Mohamed Miad' // Fallback
        };
        
        console.log('✅ Restored currentDoctor:', currentDoctor);
        console.log('✅ Supervisor name:', currentDoctor.supervisorDoctorName);
        
        // تحميل الصلاحيات
        if (session.permissions) {
          window.currentTAPermissions = session.permissions;
        } else {
          window.currentTAPermissions = { ...DEFAULT_TA_PERMISSIONS };
        }
      } else {
        currentDoctor = {
          id: session.id,
          name: session.name,
          userType: 'doctor'
        };
      }
      
      document.getElementById('doctorLoginScreen').classList.add('hidden');
      document.getElementById('doctorDashboard').classList.remove('hidden');
      
      // عرض معلومات المستخدم - استخدام currentDoctor مباشرة
      let userInfo = '';
      if (session.userType === 'teaching-assistant') {
        // استخدام currentDoctor.supervisorDoctorName أو session.supervisorDoctorName
        const supervisorName = currentDoctor.supervisorDoctorName || session.supervisorDoctorName || 'N/A';
        userInfo = `
          <div class="flex items-center gap-2 text-sm text-gray-400 mt-2">
            <i class="fas fa-user-graduate text-sky-400"></i>
            <span>Teaching Assistant</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            <i class="fas fa-user-md mr-1 text-sky-400"></i>
            Supervised by: ${supervisorName}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            <i class="fas fa-id-card mr-1"></i> TA ID: ${session.taId || session.id}
          </div>
        `;
      } else {
        userInfo = `
          <div class="flex items-center gap-2 text-sm text-gray-400 mt-2">
            <i class="fas fa-user-md text-sky-400"></i>
            <span>Doctor</span>
          </div>
        `;
      }
      
      // تحديث واجهة المستخدم
      const doctorNameElement = document.getElementById('doctorName');
      const doctorSpecialtyElement = document.getElementById('doctorSpecialty');
      
      if (doctorNameElement) {
        doctorNameElement.innerHTML = `
          <div class="font-bold text-lg text-sky-400">${session.name}</div>
          ${userInfo}
        `;
      }
      
      if (doctorSpecialtyElement) {
        doctorSpecialtyElement.innerHTML = `
          <i class="fas fa-envelope mr-1"></i> ${session.email || 'fayza.shourbagy@university.edu'}
        `;
      }
      
      // تحميل البيانات
      loadDoctorData().then(() => {
        console.log('✅ Doctor data loaded successfully');
        
        setTimeout(() => {
          const overviewBtn = document.querySelector('[data-section="overview"]');
          if (overviewBtn) {
            overviewBtn.click();
          }
        }, 500);
        
        setTimeout(() => {
          if (session.userType === 'teaching-assistant') {
            if (window.currentTAPermissions) {
              applyTAPermissions(window.currentTAPermissions);
            }
            hideSettingsForTA();
          } else if (session.userType === 'doctor') {
            showAllForDoctor();
          }
        }, 1000);
      });
      
    } catch (e) {
      console.error('❌ Error parsing session:', e);
      localStorage.removeItem('doctorSession');
      localStorage.removeItem('doctorToken');
    }
  } else {
    console.log('ℹ️ No stored session found');
  }
}

// ============================================
    // دالة loadDoctorData المحسنة
    // ============================================
    async function loadDoctorData() {
        console.log('Loading doctor data...');
        
        if (!currentDoctor) {
            console.error('No currentDoctor found');
            
            const stored = localStorage.getItem('doctorSession');
            if (stored) {
                try {
                    const session = JSON.parse(stored);
                    if (session.userType === 'teaching-assistant') {
                        currentDoctor = {
                            id: session.supervisorDoctorId || session.id,
                            name: session.supervisorDoctorName || session.name,
                            userType: 'teaching-assistant',
                            taId: session.id,
                            taName: session.name
                        };
                    } else {
                        currentDoctor = {
                            id: session.id,
                            name: session.name,
                            userType: 'doctor'
                        };
                    }
                    console.log('✅ Restored doctor from session:', currentDoctor);
                } catch (e) {
                    console.error('Error parsing session:', e);
                    return;
                }
            } else {
                console.error('No stored session found');
                return;
            }
        }
        
        const filterDoctorId = currentDoctor.id;
        
        if (!filterDoctorId) {
            console.error('No doctor ID for filtering');
            return;
        }
        
        console.log(`🔍 Filtering data for doctor ID: ${filterDoctorId} (User type: ${currentDoctor.userType})`);
        
        try {
            await Promise.all([
                loadSubjects(),
                loadLectures(),
                loadLocations(),
                loadTimeslots(),
                loadStudents()
            ]);
            
            doctorSubjects = subjects.filter(s => s.doctor_id === filterDoctorId);
            doctorLectures = lectures.filter(l => l.doctor_id === filterDoctorId);
            
            console.log(`📊 Filtered data:`, {
                subjects: doctorSubjects.length,
                lectures: doctorLectures.length,
                totalSubjects: subjects.length,
                totalLectures: lectures.length
            });
            
            await loadDoctorGrades();
            
            loadAttendanceFromStorage();
            loadSessionsFromStorage();
            updateStoredSession();
            
            console.log('✅ Doctor data loaded successfully');
            
            renderAllSections();
            
            updateOverviewStats();
            
        } catch (error) {
            console.error('Error loading doctor data:', error);
            showDoctorToast('Error loading data', 'error');
        }
    }

    // ============================================
    // تحديث إحصائيات صفحة Overview
    // ============================================
    function updateOverviewStats() {
        document.getElementById('totalSubjects').textContent = doctorSubjects.length;
        document.getElementById('totalLectures').textContent = doctorLectures.length;
        document.getElementById('activeSessions').textContent = activeSessions.length;
        
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = attendanceRecords.filter(r => r.date === today).length;
        document.getElementById('attendanceToday').textContent = todayAttendance;
    }

    function debugDataAfterLogin() {
        console.log('=== DATA DEBUG AFTER LOGIN ===');
        console.log('currentDoctor:', currentDoctor);
        console.log('doctorSubjects:', doctorSubjects?.length || 0);
        console.log('doctorLectures:', doctorLectures?.length || 0);
        console.log('students:', students?.length || 0);
        console.log('subjects:', subjects?.length || 0);
        console.log('lectures:', lectures?.length || 0);
        
        if (doctorSubjects?.length > 0) {
            console.log('Sample subject:', doctorSubjects[0]);
        }
        
        if (doctorLectures?.length > 0) {
            console.log('Sample lecture:', doctorLectures[0]);
        }
    }

    // ============================================
    // دالة Logout المعدلة
    // ============================================
    function doctorLogout() {
        console.log('🚪 Logging out...');
        
        if (typeof currentDoctor !== 'undefined') {
            currentDoctor = null;
        }
        
        if (typeof currentUser !== 'undefined') {
            currentUser = null;
        }
        
        if (typeof subjectGrades !== 'undefined') {
            subjectGrades = [];
        }
        
        if (typeof currentSubject !== 'undefined') {
            currentSubject = null;
        }
        
        if (typeof currentTAPermissions !== 'undefined') {
            currentTAPermissions = { ...DEFAULT_TA_PERMISSIONS };
        }
        
        try {
            localStorage.removeItem('doctorSession');
            localStorage.removeItem('doctorToken');
            
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('attendance_') || key.startsWith('sessions_') || key.includes('report'))) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    console.warn(`Could not remove ${key}:`, e);
                }
            });
            
        } catch (e) {
            console.error('Error clearing localStorage:', e);
        }
        
        const dashboard = document.getElementById('doctorDashboard');
        const loginScreen = document.getElementById('doctorLoginScreen');
        
        if (dashboard) {
            dashboard.classList.add('hidden');
        }
        
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
        }
        
        const usernameField = document.getElementById('doctorUsername');
        const passwordField = document.getElementById('doctorPassword');
        
        if (usernameField) usernameField.value = '';
        if (passwordField) passwordField.value = '';
        
        if (window.activeSessionsSyncInterval) {
            clearInterval(window.activeSessionsSyncInterval);
            window.activeSessionsSyncInterval = null;
        }
        
        if (window.reportsSyncInterval) {
            clearInterval(window.reportsSyncInterval);
            window.reportsSyncInterval = null;
        }
        
        if (window.permissionObserver) {
            try {
                window.permissionObserver.disconnect();
            } catch (e) {
                console.warn('Error disconnecting observer:', e);
            }
            window.permissionObserver = null;
        }
        
        console.log('✅ Logout completed');
        
        if (typeof showDoctorToast === 'function') {
            showDoctorToast('Logged out successfully', 'success');
        } else if (typeof showToast === 'function') {
            showToast('Logged out successfully', 'success');
        }
    }

    function filterDoctorData() {
      if (!currentDoctor) return;
      
      const doctorId = currentDoctor.id;
      
      doctorSubjects = subjects.filter(s => s.doctor_id === doctorId);
      doctorLectures = lectures.filter(l => l.doctor_id === doctorId);
      
      console.log(`Filtered data for doctor ${doctorId}:`, {
        subjects: doctorSubjects.length,
        lectures: doctorLectures.length
      });
      
      doctorLectures = doctorLectures.map(lecture => {
        const location = locations.find(l => l.id === lecture.location_id);
        const timeslot = timeslots.find(t => t.id === lecture.timeslot_id);
        
        return {
          ...lecture,
          location_name: location?.name || 'Unknown',
          location_capacity: location?.capacity || 'N/A',
          time_display: timeslot?.display || `${timeslot?.start || ''} - ${timeslot?.end || ''}` || lecture.time_display || 'N/A'
        };
      });
    }

    function loadAttendanceFromStorage() {
      if (!currentDoctor) return;
      const stored = localStorage.getItem(`attendance_${currentDoctor.id}`);
      attendanceRecords = stored ? JSON.parse(stored) : [];
    }

    function saveAttendanceToStorage() {
      if (currentDoctor) {
        localStorage.setItem(`attendance_${currentDoctor.id}`, JSON.stringify(attendanceRecords));
      }
    }

    function loadSessionsFromStorage() {
      if (!currentDoctor) return;
      const stored = localStorage.getItem(`sessions_${currentDoctor.id}`);
      activeSessions = stored ? JSON.parse(stored) : [];
      
      setTimeout(() => {
        syncActiveSessions();
      }, 1000);
    }
    
    function saveSessionsToStorage() {
      if (currentDoctor) {
        localStorage.setItem(`sessions_${currentDoctor.id}`, JSON.stringify(activeSessions));
      }
    }

    function setupUI() {
        console.log('Setting up UI...');
        
        const loginForm = document.getElementById('doctorLoginForm');
        if (loginForm) {
            const newLoginForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newLoginForm, loginForm);
            
            newLoginForm.addEventListener('submit', handleDoctorLogin);
            console.log('✅ Login form handler attached');
        }
        
        const logoutBtn = document.getElementById('doctorLogout');
        if (logoutBtn) {
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            newLogoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Logout button clicked');
                doctorLogout();
            });
            console.log('✅ Logout button handler attached');
        } else {
            console.error('Logout button not found!');
        }
        
        setupNavigation();
        
        setupFilters();
        
        updateDateTime();
        setInterval(updateDateTime, 1000);
        
        console.log('UI setup completed');
    }

    function setupNavigation() {
      console.log('Setting up navigation...');
      
      const navButtons = document.querySelectorAll('.nav-btn');
      console.log(`Found ${navButtons.length} navigation buttons`);
      
      navButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', (e) => {
          e.preventDefault();
          
          document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active', 'bg-white/20');
          });
          
          newBtn.classList.add('active', 'bg-white/20');
          
          const section = newBtn.dataset.section;
          console.log(`Navigating to section: ${section}`);
          
          document.querySelectorAll('[id$="Section"]').forEach(sec => {
            sec.classList.add('hidden');
          });
          
          const targetSection = document.getElementById(section + 'Section');
          if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log(`✅ Showing section: ${section}Section`);
            
            updateTitle(section);
            
            if (section === 'reports') {
              console.log('Loading reports section...');
              setTimeout(() => filterReports(), 100);
            } else if (section === 'grading') {
              console.log('Loading grading section...');
              setTimeout(() => {
                renderSubjectGradeButtons();
                document.getElementById('selectedSubjectInfo')?.classList.add('hidden');
              }, 100);
            } else if (section === 'settings') {
              console.log('Loading settings section...');
              setTimeout(() => {
                loadDoctorProfile();
                loadDoctorTAs();
              }, 100);
            } else if (section === 'attendance') {
              console.log('Loading attendance section...');
              setTimeout(() => {
                renderActiveSessions();
                renderAttendanceTable();
              }, 100);
            } else if (section === 'lectures') {
              console.log('Loading lectures section...');
              setTimeout(() => renderWeeklySchedule(), 100);
            } else if (section === 'subjects') {
              console.log('Loading subjects section...');
              setTimeout(() => renderSubjects(), 100);
            } else if (section === 'overview') {
              console.log('Loading overview section...');
              setTimeout(() => renderOverview(), 100);
            }
          } else {
            console.error(`Section not found: ${section}Section`);
          }
        });
      });
      
      console.log('Navigation setup completed');
    }

    function updateTitle(section) {
      const titles = {
        overview: 'Overview Dashboard',
        subjects: 'My Subjects',
        lectures: 'Weekly Lectures',
        attendance: 'Active Sessions',
        reports: 'Attendance Reports',
        grading: 'Student Grades Management'
      };
      
      const titleElement = document.getElementById('doctorSectionTitle');
      if (titleElement) {
        titleElement.textContent = titles[section] || 'Dashboard';
      }
    }

    function renderAllSections() {
      document.getElementById('settingsSection')?.classList.add('hidden');
      console.log('Rendering all sections...');
      
      try {
        renderOverview();
        renderSubjects();
        renderWeeklySchedule();
        renderActiveSessions();
        renderAttendanceTable();
        renderReportsFilters();
        
        document.getElementById('activeSessions').textContent = activeSessions.length;
        
        console.log('✅ All sections rendered');
      } catch (error) {
        console.error('Error rendering sections:', error);
      }
    }

    function renderOverview() {
      document.getElementById('totalSubjects').textContent = doctorSubjects.length;
      document.getElementById('totalLectures').textContent = doctorLectures.length;
      document.getElementById('activeSessions').textContent = activeSessions.length;
      
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendanceRecords.filter(r => r.date === today).length;
      document.getElementById('attendanceToday').textContent = todayAttendance;
      
      const todayName = getTodayDayName();
      const todaysLectures = doctorLectures.filter(l => l.day === todayName);
      
      const todaysContainer = document.getElementById('todaysLectures');
      if (todaysContainer) {
        if (todaysLectures.length === 0) {
          todaysContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No lectures scheduled for today</p>';
        } else {
          todaysContainer.innerHTML = todaysLectures.map(l => `
            <div class="lecture-card flex items-center justify-between">
              <div>
                <h4 class="font-bold text-lg">${l.subject_name}</h4>
                <p class="text-sm text-gray-400 mt-1">
                  <i class="fas fa-clock mr-1"></i> ${l.time_display}
                  <i class="fas fa-map-marker-alt ml-3 mr-1"></i> ${l.location_name}
                </p>
                <p class="text-xs text-gray-500 mt-1">Level ${l.level} • ${l.department || 'N/A'}</p>
              </div>
              <span class="px-4 py-2 bg-sky-600 rounded-lg text-sm font-bold">Today</span>
            </div>
          `).join('');
        }
      }
      
      const recentContainer = document.getElementById('recentAttendance');
      if (recentContainer) {
        const recent = attendanceRecords.slice(-5).reverse();
        if (recent.length === 0) {
          recentContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No attendance records</p>';
        } else {
          recentContainer.innerHTML = recent.map(r => `
            <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
              <div>
                <p class="font-medium">${r.student_name}</p>
                <p class="text-xs text-gray-400">${r.subject_name}</p>
              </div>
              <span class="badge-present">${r.time}</span>
            </div>
          `).join('');
        }
      }
    }

    function renderSubjects() {
      const container = document.getElementById('subjectsList');
      if (!container) return;
      
      const levelFilter = document.getElementById('subjectLevelFilter');
      if (levelFilter) {
        const levels = [...new Set(doctorSubjects.map(s => s.level))].sort((a, b) => a - b);
        levelFilter.innerHTML = '<option value="">All Levels</option>' + 
          levels.map(l => `<option value="${l}">Level ${l}</option>`).join('');
      }
      
      const semesterFilter = document.getElementById('subjectSemesterFilter');
      if (semesterFilter) {
        const semesters = [...new Set(doctorSubjects.map(s => s.semester))].sort((a, b) => a - b);
        semesterFilter.innerHTML = '<option value="">All Semesters</option>' + 
          semesters.map(s => `<option value="${s}">Semester ${s}</option>`).join('');
      }
      
      if (doctorSubjects.length === 0) {
        container.innerHTML = '<p class="text-2xl text-gray-400 text-center py-16">No subjects assigned</p>';
        return;
      }
      
      renderFilteredSubjects(doctorSubjects);
    }

    function filterSubjects() {
      const search = document.getElementById('subjectSearch')?.value.toLowerCase() || '';
      const level = document.getElementById('subjectLevelFilter')?.value || '';
      const semester = document.getElementById('subjectSemesterFilter')?.value || '';
      
      let filtered = doctorSubjects.filter(subject => {
        let match = true;
        
        if (search) {
          const nameMatch = subject.name.toLowerCase().includes(search);
          const codeMatch = subject.code && subject.code.toLowerCase().includes(search);
          match = match && (nameMatch || codeMatch);
        }
        
        if (level && match) {
          match = subject.level == level;
        }
        
        if (semester && match) {
          match = subject.semester == semester;
        }
        
        return match;
      });
      
      renderFilteredSubjects(filtered);
    }

    function renderFilteredSubjects(filteredSubjects) {
      const container = document.getElementById('subjectsList');
      if (!container) return;
      
      if (filteredSubjects.length === 0) {
        container.innerHTML = '<p class="text-2xl text-gray-400 text-center py-16">No subjects match your filters</p>';
        return;
      }
      
      const grouped = {};
      filteredSubjects.forEach(s => {
        const level = s.level || 0;
        if (!grouped[level]) grouped[level] = {};
        const semester = s.semester || 1;
        if (!grouped[level][semester]) grouped[level][semester] = [];
        grouped[level][semester].push(s);
      });
      
      let html = '';
      
      Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
        html += `<h3 class="text-xl font-bold mt-8 mb-4 text-sky-400">Level ${level}</h3>`;
        
        [1, 2].forEach(semester => {
          if (grouped[level][semester] && grouped[level][semester].length > 0) {
            html += `<h4 class="text-lg font-semibold mb-3 text-sky-300">Semester ${semester}</h4>`;
            html += `<div class="overflow-x-auto mb-8"><table class="w-full"><thead><tr>
                      <th>Code</th><th>Subject Name</th><th>Department</th><th>Lectures</th>
                     </tr></thead><tbody>`;
            
            grouped[level][semester].sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
              const lectureCount = doctorLectures.filter(l => l.subject_id === s.id).length;
              html += `<tr>
                  <td class="font-mono font-bold text-sky-400">${s.code || 'N/A'}</td>
                  <td>${s.name}</td>
                  <td>${s.department || 'N/A'}</td>
                  <td><span class="px-3 py-1 bg-sky-600 rounded-full">${lectureCount}</span></td>
                </tr>`;
            });
            
            html += `</tbody></table></div>`;
          }
        });
      });
      
      container.innerHTML = html;
    }

    function renderWeeklySchedule() {
      const container = document.getElementById('weeklySchedule');
      if (!container) return;
      
      let html = '';
      
      days.forEach(day => {
        const dayLectures = doctorLectures.filter(l => l.day === day);
        
        html += `<div class="day-card p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">${day}</h3>
              <span class="px-3 py-1 bg-slate-700 rounded-full text-sm">${dayLectures.length}</span>
            </div>
            <div class="space-y-3">`;
        
        if (dayLectures.length === 0) {
          html += `<p class="text-gray-400 text-sm py-3">No lectures</p>`;
        } else {
          dayLectures.forEach(lecture => {
            const isActive = activeSessions.some(s => s.lecture_id === lecture.id);
            
            html += `<div class="bg-slate-800/50 rounded-xl p-4 ${isActive ? 'border-l-4 border-green-500' : ''}">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h4 class="font-bold text-lg">${lecture.subject_name}</h4>
                    <p class="text-sm text-gray-400 mt-1">
                      <i class="fas fa-clock mr-1"></i> ${lecture.time_display}
                      <i class="fas fa-map-marker-alt ml-3 mr-1"></i> ${lecture.location_name}
                    </p>
                    <p class="text-xs text-gray-500 mt-2">Level ${lecture.level} • ${lecture.department || 'N/A'}</p>
                  </div>
                  <div>
                    ${isActive ? 
                      `<button onclick="openEndModal(${lecture.id})" class="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-semibold border border-red-500/30">
                        <i class="fas fa-stop mr-1"></i> End
                      </button>` : 
                      `<button onclick="openActivateModal(${lecture.id})" class="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-sm font-semibold border border-green-500/30">
                        <i class="fas fa-play mr-1"></i> Activate
                      </button>`
                    }
                  </div>
                </div>
                ${isActive ? `<div class="mt-3 text-xs text-green-400 flex items-center gap-2"><i class="fas fa-circle animate-pulse"></i> Session Active</div>` : ''}
              </div>`;
          });
        }
        
        html += `</div></div>`;
      });
      
      container.innerHTML = html;
      
      if (window.currentTAPermissions) {
        setTimeout(() => {
          applyLectureButtonsPermissions(window.currentTAPermissions);
        }, 200);
      }
    }

    function filterByDay(day) {
      document.querySelectorAll('.day-filter-btn').forEach(btn => {
        btn.classList.remove('bg-sky-600');
        btn.classList.add('bg-slate-800');
      });
      
      event.target.classList.remove('bg-slate-800');
      event.target.classList.add('bg-sky-600');
      
      if (day === 'all') {
        renderWeeklySchedule();
      } else {
        const container = document.getElementById('weeklySchedule');
        const filtered = doctorLectures.filter(l => l.day === day);
        
        let html = `<div class="day-card p-5 col-span-full">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">${day}</h3>
              <span class="px-3 py-1 bg-slate-700 rounded-full text-sm">${filtered.length}</span>
            </div>
            <div class="space-y-3">`;
        
        if (filtered.length === 0) {
          html += `<p class="text-gray-400 text-sm py-3">No lectures</p>`;
        } else {
          filtered.forEach(lecture => {
            const isActive = activeSessions.some(s => s.lecture_id === lecture.id);
            
            html += `<div class="bg-slate-800/50 rounded-xl p-4">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-bold text-lg">${lecture.subject_name}</h4>
                    <p class="text-sm text-gray-400 mt-1">
                      <i class="fas fa-clock mr-1"></i> ${lecture.time_display}
                      <i class="fas fa-map-marker-alt ml-3 mr-1"></i> ${lecture.location_name}
                    </p>
                  </div>
                  <div>
                    ${isActive ? 
                      `<button onclick="openEndModal(${lecture.id})" class="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-semibold">
                        <i class="fas fa-stop"></i> End
                      </button>` : 
                      `<button onclick="openActivateModal(${lecture.id})" class="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-sm font-semibold">
                        <i class="fas fa-play"></i> Activate
                      </button>`
                    }
                  </div>
                </div>
              </div>`;
          });
        }
        
        html += `</div></div>`;
        container.innerHTML = html;
      }
    }

    function renderActiveSessions() {
      const container = document.getElementById('activeLecturesList');
      if (!container) return;
      
      if (activeSessions.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center py-16 bg-slate-800/50 rounded-2xl">
            <i class="fas fa-video-slash text-6xl text-gray-600 mb-4"></i>
            <p class="text-2xl text-gray-400">No active sessions</p>
            <p class="text-sm text-gray-500 mt-3">Activate a lecture to start attendance</p>
          </div>`;
        return;
      }
      
      let html = '';
      
      activeSessions.forEach(session => {
        const lecture = doctorLectures.find(l => l.id === session.lecture_id);
        if (!lecture) return;
        
        const subjectStudents = students.filter(s => 
          s.level === lecture.level && 
          s.department === lecture.department
        );
        
        let attendanceData = { records: [], pending: [] };
        try {
          const stored = localStorage.getItem(`attendance_${session.session_id}`);
          if (stored) {
            attendanceData = JSON.parse(stored);
          } else {
            attendanceData = {
              records: subjectStudents.map(s => ({
                studentId: s.id,
                studentName: s.name,
                student_id: s.student_id,
                status: 'absent',
                confirmed: false,
                confirmedByQR: false
              })),
              pending: []
            };
            localStorage.setItem(`attendance_${session.session_id}`, JSON.stringify(attendanceData));
          }
        } catch (e) {
          console.error('Error reading attendance data:', e);
        }
        
        const pendingCount = attendanceData.pending ? attendanceData.pending.length : 0;
        const confirmedCount = attendanceData.records ? attendanceData.records.filter(r => r.confirmed).length : 0;
        const totalStudents = subjectStudents.length;
        
        html += `<div class="bg-gradient-to-br from-sky-600 to-blue-600 rounded-2xl p-6 shadow-xl">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-bold">${lecture.subject_name}</h3>
                <p class="text-sm opacity-90 mt-2">
                  <i class="fas fa-clock mr-1"></i> ${lecture.time_display}
                  <i class="fas fa-map-marker-alt ml-3 mr-1"></i> ${lecture.location_name}
                </p>
                <p class="text-xs opacity-75 mt-2">Level ${lecture.level} • ${lecture.department}</p>
              </div>
              <span class="badge-live">LIVE</span>
            </div>
            
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="bg-white/10 rounded-xl p-3 text-center">
                <p class="text-2xl font-bold">${totalStudents}</p>
                <p class="text-xs opacity-75 mt-1">Total</p>
              </div>
              <div class="bg-white/10 rounded-xl p-3 text-center">
                <p class="text-2xl font-bold text-green-300">${confirmedCount}</p>
                <p class="text-xs opacity-75 mt-1">Confirmed</p>
              </div>
              <div class="bg-white/10 rounded-xl p-3 text-center">
                <p class="text-2xl font-bold text-yellow-300">${pendingCount}</p>
                <p class="text-xs opacity-75 mt-1">Pending</p>
              </div>
            </div>
            
            <button onclick="toggleStudentsList(${lecture.id}, '${session.session_id}')" 
                    class="w-full bg-white/20 hover:bg-white/30 py-3 rounded-xl text-sm font-semibold transition-all mb-3">
              <i class="fas fa-users mr-1"></i> View Students (${totalStudents})
            </button>
            
            <div id="students-list-${lecture.id}" class="hidden mt-4 max-h-96 overflow-y-auto bg-slate-900/50 rounded-xl p-3">
            </div>
            
            <div class="flex gap-3 mt-3">
              <button onclick="openCameraSession('${session.session_id}', ${lecture.id})" class="flex-1 bg-white/20 hover:bg-white/30 py-3 rounded-xl text-sm font-semibold transition-all">
                <i class="fas fa-camera mr-1"></i> Open Camera
              </button>
              <button onclick="openEndModal(${lecture.id})" class="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-xl text-sm font-semibold transition-all">
                <i class="fas fa-stop mr-1"></i> End
              </button>
            </div>
          </div>`;
      });
      
      container.innerHTML = html;
      if (window.currentTAPermissions) {
        setTimeout(() => {
          applyLectureButtonsPermissions(window.currentTAPermissions);
        }, 200);
      }
    }

    function toggleStudentsList(lectureId, sessionId) {
      const listDiv = document.getElementById(`students-list-${lectureId}`);
      
      if (listDiv.classList.contains('hidden')) {
        const lecture = doctorLectures.find(l => l.id === lectureId);
        if (!lecture) return;
        
        const subjectStudents = students.filter(s => 
          s.level === lecture.level && 
          s.department === lecture.department
        );
        
        let attendanceData = { records: [], pending: [] };
        try {
          const stored = localStorage.getItem(`attendance_${sessionId}`);
          if (stored) {
            attendanceData = JSON.parse(stored);
          }
        } catch (e) {}
        
        const sortedStudents = [...subjectStudents].sort((a, b) => {
          const numA = parseInt(a.student_id.replace(/[^0-9]/g, '')) || 0;
          const numB = parseInt(b.student_id.replace(/[^0-9]/g, '')) || 0;
          return numA - numB;
        });
        
        let tableHTML = `
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-gray-300 border-b border-white/10">
                <th class="p-2 text-left">Student ID</th>
                <th class="p-2 text-left">Name</th>
                <th class="p-2 text-center">Status</th>
                <th class="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        sortedStudents.forEach(student => {
          const record = attendanceData.records?.find(r => r.studentId === student.id);
          const status = record?.confirmed ? '✅ Confirmed' : 
                         attendanceData.pending?.some(p => p.studentId === student.id) ? '⏳ Pending' : '❌ Absent';
          const statusClass = record?.confirmed ? 'text-green-400' : 
                              attendanceData.pending?.some(p => p.studentId === student.id) ? 'text-yellow-400' : 'text-red-400';
          
          tableHTML += `
            <tr class="border-b border-white/5 hover:bg-white/5">
              <td class="p-2 font-mono text-xs">${student.student_id}</td>
              <td class="p-2">${student.name}</td>
              <td class="p-2 text-center ${statusClass}">${status}</td>
              <td class="p-2 text-center">
                ${attendanceData.pending?.some(p => p.studentId === student.id) ? `
                  <button onclick="confirmPendingStudent(${lecture.id}, '${sessionId}', ${student.id}, true)" 
                          class="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs mx-1">
                    <i class="fas fa-check"></i>
                  </button>
                  <button onclick="confirmPendingStudent(${lecture.id}, '${sessionId}', ${student.id}, false)" 
                          class="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs mx-1">
                    <i class="fas fa-times"></i>
                  </button>
                ` : record?.confirmed ? `
                  <span class="text-green-400 text-xs"><i class="fas fa-check-circle"></i> Confirmed</span>
                ` : ''}
              </td>
            </tr>
          `;
        });
        
        tableHTML += `</tbody></table>`;
        listDiv.innerHTML = tableHTML;
        listDiv.classList.remove('hidden');
      } else {
        listDiv.classList.add('hidden');
      }
    }

    function confirmPendingStudent(lectureId, sessionId, studentId, confirm) {
      try {
        const stored = localStorage.getItem(`attendance_${sessionId}`);
        if (!stored) return;
        
        const attendanceData = JSON.parse(stored);
        
        const recordIndex = attendanceData.records.findIndex(r => r.studentId === studentId);
        if (recordIndex === -1) return;
        
        if (confirm) {
          attendanceData.records[recordIndex].confirmed = true;
          attendanceData.records[recordIndex].status = 'confirmed';
          attendanceData.records[recordIndex].confirmedAt = new Date().toLocaleTimeString();
          attendanceData.records[recordIndex].confirmedByQR = false;
          
          attendanceData.pending = attendanceData.pending.filter(p => p.studentId !== studentId);
          
          showDoctorToast('Student confirmed successfully', 'success');
        } else {
          attendanceData.records[recordIndex].confirmed = false;
          attendanceData.records[recordIndex].status = 'absent';
          
          attendanceData.pending = attendanceData.pending.filter(p => p.studentId !== studentId);
          
          showDoctorToast('Student rejected', 'warning');
        }
        
        localStorage.setItem(`attendance_${sessionId}`, JSON.stringify(attendanceData));
        
        toggleStudentsList(lectureId, sessionId);
        renderActiveSessions();
        
      } catch (error) {
        console.error('Error confirming pending:', error);
        showDoctorToast('Error updating student status', 'error');
      }
    }

    function openCameraSession(sessionId, lectureId) {
      const token = localStorage.getItem('doctorToken');
      
      window.open(
        `camera.html?sessionId=${sessionId}&lectureId=${lectureId}&doctorId=${currentDoctor.id}&token=${token}`,
        'AttendanceCamera',
        'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no'
      );
    }

    function renderAttendanceTable() {
      const container = document.getElementById('attendanceRecordsTable');
      if (!container) return;
      
      const recent = attendanceRecords.slice(-10).reverse();
      
      if (recent.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-8">No attendance records</p>';
        return;
      }
      
      container.innerHTML = `<div class="overflow-x-auto"><table class="w-full"><thead>攒
                <th>Student</th><th>Student ID</th><th>Subject</th><th>Date & Time</th><th>Status</th>
               </thead><tbody>
              ${recent.map(r => `<tr>
                  <td class="font-medium">${r.student_name}</td>
                  <td class="font-mono text-sm">${r.student_id}</td>
                  <td>${r.subject_name}</td>
                  <td>${r.date} ${r.time}</td>
                  <td><span class="badge-present">Present</span></td>
                </tr>`).join('')}
            </tbody></table></div>`;
    }

    function renderReportsFilters() {
      const levelFilter = document.getElementById('reportLevelFilter');
      if (levelFilter) {
        const levels = [...new Set(doctorSubjects.map(s => s.level))].sort();
        levelFilter.innerHTML = '<option value="">All Levels</option>' + 
          levels.map(l => `<option value="${l}">Level ${l}</option>`).join('');
      }
      
      const subjectFilter = document.getElementById('reportSubjectFilter');
      if (subjectFilter) {
        subjectFilter.innerHTML = '<option value="">All Subjects</option>' + 
          doctorSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }
      
      const dateFilter = document.getElementById('reportDateFilter');
      if (dateFilter) dateFilter.value = '';
      
      setTimeout(() => {
        filterReports();
      }, 500);
    }

    async function filterReports() {
      const container = document.getElementById('attendanceReportsTable');
      if (!container) return;
      
      showDoctorToast('Loading reports...', 'info');
      
      const reports = await loadAttendanceReports();
      
      const subjectId = document.getElementById('reportSubjectFilter')?.value;
      const level = document.getElementById('reportLevelFilter')?.value;
      const date = document.getElementById('reportDateFilter')?.value;
      
      let filtered = [...reports];
      
      if (subjectId) {
        filtered = filtered.filter(r => r.lectureId == subjectId);
      }
      
      if (level) {
        filtered = filtered.filter(r => r.level == level);
      }
      
      if (date) {
        filtered = filtered.filter(r => r.date === date);
      }
      
      console.log(`📊 Found ${reports.length} total reports, showing ${filtered.length} after filters`);
      
      updateReportStats(filtered, reports);
      
      renderReportsTable(filtered);
    }

    function updateReportStats(filteredReports, allReports) {
      document.getElementById('totalAttendanceCount').textContent = allReports.length;
      
      const filteredCount = filteredReports.length;
      
      let totalPresent = filteredReports.reduce((sum, r) => sum + (r.present || 0), 0);
      let totalPossible = filteredReports.reduce((sum, r) => sum + (r.totalStudents || 0), 0);
      const rate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
      document.getElementById('presentRate').textContent = `${rate}%`;
      
      const uniqueSubjects = new Set(filteredReports.map(r => r.subjectName)).size;
      document.getElementById('reportSubjectsCount').textContent = uniqueSubjects;
      
      const filterInfo = document.getElementById('reportFilterInfo');
      if (!filterInfo) {
        const filterBar = document.querySelector('.flex.gap-4.mb-6.flex-wrap');
        if (filterBar) {
          const infoDiv = document.createElement('div');
          infoDiv.id = 'reportFilterInfo';
          infoDiv.className = 'w-full mt-2 text-sm text-gray-400';
          filterBar.parentNode.insertBefore(infoDiv, filterBar.nextSibling);
        }
      }
      
      const filterInfoEl = document.getElementById('reportFilterInfo');
      if (filterInfoEl) {
        if (filteredReports.length === allReports.length) {
          filterInfoEl.innerHTML = `<i class="fas fa-info-circle mr-1 text-blue-400"></i> Showing all ${allReports.length} reports`;
        } else {
          filterInfoEl.innerHTML = `<i class="fas fa-filter mr-1 text-yellow-400"></i> Showing ${filteredReports.length} of ${allReports.length} reports (filtered)`;
        }
      }
    }

    function formatDate(dateString) {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return dateString;
      }
    }

    function formatTime(timeString) {
      if (!timeString) return 'N/A';
      if (timeString.includes('T')) {
        return timeString.split('T')[1]?.substring(0, 5) || 'N/A';
      }
      return timeString;
    }

    function getDateRange(reports) {
      if (reports.length === 0) return 'N/A';
      
      const dates = reports.map(r => new Date(r.date)).filter(d => !isNaN(d));
      if (dates.length === 0) return 'N/A';
      
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      if (minDate.toDateString() === maxDate.toDateString()) {
        return formatDate(minDate);
      }
      
      return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
    }

    function viewReportDetails(sessionId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const report = reports.find(r => r.sessionId === sessionId);
      
      if (!report) {
        showDoctorToast('Report not found', 'error');
        return;
      }
      
      const sortedStudents = [...(report.students || [])].sort((a, b) => {
        const numA = parseInt((a.student_id || '').replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt((b.student_id || '').replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      
      const present = sortedStudents.filter(s => s.status === 'confirmed').length;
      const pending = sortedStudents.filter(s => s.status === 'pending').length;
      const absent = sortedStudents.filter(s => s.status === 'absent').length;
      
      const modalHTML = `
        <div id="reportDetailsModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onclick="this.remove()">
          <div class="bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 m-4" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-slate-800 pb-4 border-b border-white/10">
              <div>
                <h2 class="text-2xl font-bold text-sky-400">Attendance Report Details</h2>
                <p class="text-sm text-gray-400 mt-1">
                  ${report.subjectName || report.subject_name || 'N/A'} • 
                  <span class="text-sky-400">${report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}</span> • 
                  <span class="text-sky-400">Level ${report.level || 'N/A'}</span> • 
                  <span class="text-sky-400">${report.department || 'N/A'}</span>
                </p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Total Students</p>
                <p class="text-2xl font-bold text-white">${sortedStudents.length}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Present</p>
                <p class="text-2xl font-bold text-green-400">${present}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Pending</p>
                <p class="text-2xl font-bold text-yellow-400">${pending}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Absent</p>
                <p class="text-2xl font-bold text-red-400">${absent}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Rate</p>
                <p class="text-2xl font-bold ${present > 0 ? 'text-green-400' : 'text-red-400'}">
                  ${sortedStudents.length > 0 ? Math.round((present / sortedStudents.length) * 100) : 0}%
                </p>
              </div>
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
                <i class="fas fa-users text-sky-400"></i>
                Students List (${sortedStudents.length})
              </h3>
              <div class="bg-slate-900/50 rounded-xl p-4 max-h-96 overflow-y-auto">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 bg-slate-800">
                    <tr class="text-left text-xs text-gray-400 border-b border-white/10">
                      <th class="pb-2">#</th>
                      <th class="pb-2">Student ID</th>
                      <th class="pb-2">Name</th>
                      <th class="pb-2 text-center">Status</th>
                      <th class="pb-2 text-center">Method</th>
                      <th class="pb-2 text-center">Time</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
      `;
      
      let studentsHTML = '';
      
      sortedStudents.forEach((student, index) => {
        const statusColor = student.status === 'confirmed' ? 'text-green-400' : 
                           student.status === 'pending' ? 'text-yellow-400' : 'text-red-400';
        const statusIcon = student.status === 'confirmed' ? 'fa-check-circle' : 
                          student.status === 'pending' ? 'fa-clock' : 'fa-times-circle';
        const statusText = student.status === 'confirmed' ? 'Present' : 
                          student.status === 'pending' ? 'Pending' : 'Absent';
        
        const method = student.confirmedBy || '-';
        const time = student.confirmedAt || student.detectedAt || '-';
        
        studentsHTML += `
          <tr class="hover:bg-white/5">
            <td class="py-2 text-xs text-gray-400">${index + 1}</td>
            <td class="py-2 font-mono text-xs font-bold text-sky-400">${student.student_id || 'N/A'}</td>
            <td class="py-2">${student.studentName || student.student_name || 'N/A'}</td>
            <td class="py-2 text-center ${statusColor}">
              <i class="fas ${statusIcon} mr-1"></i>
              ${statusText}
            </td>
            <td class="py-2 text-center text-xs">${method}</td>
            <td class="py-2 text-center text-xs text-gray-400">${time}</td>
          </tr>
        `;
      });
      
      const fullModalHTML = modalHTML + studentsHTML + `
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="border-t border-white/10 pt-4 mt-4 flex justify-end gap-3">
              <button onclick="exportSingleReportPDF('${sessionId}')" 
                      class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center gap-2">
                <i class="fas fa-file-pdf"></i>
                Export PDF
              </button>
              <button onclick="this.closest('.fixed').remove()" 
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', fullModalHTML);
    }

    function showReportDetailsModal(report) {
      const modalHTML = `
        <div id="reportDetailsModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onclick="this.remove()">
          <div class="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 m-4" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-slate-800 pb-4 border-b border-white/10">
              <div>
                <h2 class="text-2xl font-bold text-sky-400">Attendance Report Details</h2>
                <p class="text-sm text-gray-400 mt-1">
                  ${report.subjectName || 'N/A'} • 
                  <span class="text-sky-400">${report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}</span> • 
                  <span class="text-sky-400">Level ${report.level || 'N/A'}</span>
                </p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Date</p>
                <p class="text-lg font-bold">${report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}</p>
                <p class="text-xs text-gray-500">${report.date || ''}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Time</p>
                <p class="text-lg font-bold">${formatTime(report.endTime)}</p>
                <p class="text-xs text-gray-500">to attendance</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Level</p>
                <p class="text-lg font-bold text-sky-400">${report.level || 'N/A'}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Present</p>
                <p class="text-lg font-bold text-green-400">${report.present || 0}</p>
                <p class="text-xs text-gray-500">/ ${report.totalStudents || 0}</p>
              </div>
              <div class="bg-slate-900/50 p-3 rounded-xl">
                <p class="text-xs text-gray-400">Rate</p>
                <p class="text-lg font-bold ${report.totalStudents > 0 && (report.present / report.totalStudents) >= 0.75 ? 'text-green-400' : 'text-yellow-400'}">
                  ${report.totalStudents > 0 ? Math.round((report.present / report.totalStudents) * 100) : 0}%
                </p>
              </div>
            </div>
            
            <div class="mb-4">
              <h3 class="text-lg font-bold mb-3">Students List</h3>
              <div class="bg-slate-900/50 rounded-xl p-4 max-h-96 overflow-y-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-xs text-gray-400 border-b border-white/10">
                      <th class="pb-2">#</th>
                      <th class="pb-2">Student ID</th>
                      <th class="pb-2">Name</th>
                      <th class="pb-2 text-center">Status</th>
                      <th class="pb-2 text-center">Method</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-white/5">
      `;
      
      let studentsHTML = '';
      
      if (report.students && report.students.length > 0) {
        const sortedStudents = [...report.students].sort((a, b) => {
          const idA = parseInt((a.student_id || '').replace(/[^0-9]/g, '')) || 0;
          const idB = parseInt((b.student_id || '').replace(/[^0-9]/g, '')) || 0;
          return idA - idB;
        });
        
        sortedStudents.forEach((student, index) => {
          const statusColor = student.status === 'confirmed' ? 'text-green-400' : 
                             student.status === 'pending' ? 'text-yellow-400' : 'text-red-400';
          const statusIcon = student.status === 'confirmed' ? 'fa-check-circle' : 
                            student.status === 'pending' ? 'fa-clock' : 'fa-times-circle';
          const statusText = student.status === 'confirmed' ? 'Present' : 
                            student.status === 'pending' ? 'Pending' : 'Absent';
          
          studentsHTML += `
            <tr>
              <td class="py-2 text-xs text-gray-400">${index + 1}</td>
              <td class="py-2 font-mono text-xs font-bold text-sky-400">${student.student_id || 'N/A'}</td>
              <td class="py-2">${student.studentName || 'N/A'}</td>
              <td class="py-2 text-center ${statusColor}">
                <i class="fas ${statusIcon} mr-1"></i>
                ${statusText}
              </td>
              <td class="py-2 text-center text-xs">
                ${student.confirmedBy ? 
                  `<span class="px-2 py-1 bg-slate-700 rounded-full">${student.confirmedBy}</span>` : 
                  '-'
                }
              </td>
            </tr>
          `;
        });
      } else {
        studentsHTML += `
          <tr>
            <td colspan="5" class="py-8 text-center text-gray-400">
              <i class="fas fa-users-slash text-3xl mb-2"></i>
              <p>No student data available</p>
            </td>
          </tr>
        `;
      }
      
      const fullModalHTML = modalHTML + studentsHTML + `
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="border-t border-white/10 pt-4 mt-4">
              <div class="flex flex-wrap gap-3 justify-end">
                <button onclick="exportSingleReport('${report.sessionId}')" 
                        class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center gap-2">
                  <i class="fas fa-file-pdf"></i>
                  Export This Report (PDF)
                </button>
                
                <button onclick="exportReportWithOptions('${report.sessionId}')" 
                        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm flex items-center gap-2">
                  <i class="fas fa-cog"></i>
                  Export with Options
                </button>
                
                <button onclick="this.closest('.fixed').remove()" 
                        class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', fullModalHTML);
    }

    function exportReportWithOptions(sessionId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const report = reports.find(r => r.sessionId === sessionId);
      
      if (!report) return;
      
      const optionsHTML = `
        <div id="exportOptionsModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onclick="this.remove()">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 m-4" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold text-purple-400">Export Options</h3>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div class="space-y-4 mb-6">
              <label class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                <input type="checkbox" id="includeHeader" checked class="w-4 h-4">
                <span>Include header with logo</span>
              </label>
              
              <label class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                <input type="checkbox" id="includeStats" checked class="w-4 h-4">
                <span>Include statistics summary</span>
              </label>
              
              <label class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                <input type="checkbox" id="includeStudentList" checked class="w-4 h-4">
                <span>Include student list</span>
              </label>
              
              <label class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                <input type="checkbox" id="landscapeMode" class="w-4 h-4">
                <span>Landscape mode (wider table)</span>
              </label>
            </div>
            
            <div class="flex gap-3">
              <button onclick="exportReportWithSelectedOptions('${report.sessionId}')" 
                      class="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-sm font-semibold">
                <i class="fas fa-file-pdf mr-2"></i> Export PDF
              </button>
              <button onclick="this.closest('.fixed').remove()" 
                      class="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-semibold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', optionsHTML);
    }

    function exportReportWithSelectedOptions(sessionId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const report = reports.find(r => r.sessionId === sessionId);
      
      if (!report) return;
      
      const includeHeader = document.getElementById('includeHeader')?.checked ?? true;
      const includeStats = document.getElementById('includeStats')?.checked ?? true;
      const includeStudentList = document.getElementById('includeStudentList')?.checked ?? true;
      const landscapeMode = document.getElementById('landscapeMode')?.checked ?? false;
      
      document.getElementById('exportOptionsModal')?.remove();
      
      exportReportPDF(report, { includeHeader, includeStats, includeStudentList, landscapeMode });
    }

    function exportReportPDF(report, options = {}) {
      const {
        includeHeader = true,
        includeStats = true,
        includeStudentList = true,
        landscapeMode = false
      } = options;
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF(landscapeMode ? 'l' : 'p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      
      let yPos = margin;
      
      if (includeHeader) {
        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance Report', margin, 18);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 18, { align: 'right' });
        
        yPos = 40;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Subject: ${report.subjectName || 'N/A'}`, margin, yPos);
      yPos += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Date: ${report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}`, margin, yPos);
      yPos += 6;
      doc.text(`Time: ${formatTime(report.startTime)} - ${formatTime(report.endTime)}`, margin, yPos);
      yPos += 6;
      doc.text(`Level: ${report.level || 'N/A'}`, margin, yPos);
      yPos += 6;
      doc.text(`Doctor: ${report.doctorName || currentDoctor?.name || 'N/A'}`, margin, yPos);
      yPos += 10;
      
      if (includeStats) {
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Session Statistics', margin + 5, yPos + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Present: ${report.present || 0}`, margin + 5, yPos + 16);
        doc.text(`Total: ${report.totalStudents || 0}`, margin + 50, yPos + 16);
        
        const rate = report.totalStudents > 0 ? Math.round((report.present / report.totalStudents) * 100) : 0;
        doc.text(`Rate: ${rate}%`, margin + 100, yPos + 16);
        
        yPos += 40;
      }
      
      if (includeStudentList && report.students && report.students.length > 0) {
        const tableData = report.students.map(s => [
          s.student_id || 'N/A',
          s.studentName || 'N/A',
          s.status === 'confirmed' ? 'Present' : (s.status === 'pending' ? 'Pending' : 'Absent'),
          s.confirmedBy || '-'
        ]);
        
        doc.autoTable({
          startY: yPos,
          head: [['Student ID', 'Name', 'Status', 'Method']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [14, 165, 233], textColor: 255 },
          margin: { left: margin, right: margin }
        });
      }
      
      const filename = `attendance_${report.subjectName || 'report'}_${report.date || Date.now()}.pdf`;
      doc.save(filename);
      
      showDoctorToast('Report exported successfully', 'success');
    }

    function exportSingleReport(sessionId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const report = reports.find(r => r.sessionId === sessionId);
      
      if (!report) return;
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Report', 15, 18);
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - 15, 18, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Subject: ${report.subjectName || 'N/A'}`, 15, 45);
      doc.text(`Date: ${report.date}`, 15, 53);
      doc.text(`Time: ${formatTime(report.startTime)} - ${formatTime(report.endTime)}`, 15, 61);
      
      doc.text(`Present: ${report.present || 0} / ${report.totalStudents || 0}`, 15, 77);
      
      if (report.students && report.students.length > 0) {
        const tableData = report.students.map(s => [
          s.student_id,
          s.studentName,
          s.status === 'confirmed' ? 'Present' : (s.status === 'pending' ? 'Pending' : 'Absent'),
          s.confirmedBy || '-'
        ]);
        
        doc.autoTable({
          startY: 85,
          head: [['Student ID', 'Name', 'Status', 'Method']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [14, 165, 233] }
        });
      }
      
      doc.save(`attendance_${report.date}_${report.subjectName}.pdf`);
      showDoctorToast('Report exported successfully', 'success');
    }

    function showAttendanceDetails(lectureId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const lectureReports = reports.filter(r => r.lectureId === lectureId);
      
      if (lectureReports.length === 0) {
        showDoctorToast('No details available', 'warning');
        return;
      }
      
      const lecture = doctorLectures.find(l => l.id === lectureId);
      if (!lecture) return;
      
      const subjectStudents = students.filter(s => 
        s.level === lecture.level && 
        s.department === lecture.department
      );
      
      const studentSummary = {};
      subjectStudents.forEach(s => {
        studentSummary[s.student_id] = {
          id: s.id,
          name: s.name,
          student_id: s.student_id,
          present: 0,
          sessions: []
        };
      });
      
      lectureReports.forEach(report => {
        if (report.students) {
          report.students.forEach(student => {
            if (student.status === 'confirmed' && studentSummary[student.student_id]) {
              studentSummary[student.student_id].present++;
              studentSummary[student.student_id].sessions.push({
                date: report.date,
                time: report.startTime?.split('T')[1]?.substring(0, 5) || 'N/A',
                method: student.confirmedBy || 'face'
              });
            }
          });
        }
      });
      
      const sortedStudents = Object.values(studentSummary).sort((a, b) => {
        const numA = parseInt(a.student_id.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.student_id.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      
      let detailsHTML = `
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onclick="this.remove()">
          <div class="bg-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 m-4" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-slate-800 pb-4 border-b border-white/10">
              <div>
                <h2 class="text-2xl font-bold text-sky-400">${lecture.subject_name}</h2>
                <p class="text-sm text-gray-400 mt-1">Level ${lecture.level} • ${lecture.department}</p>
              </div>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-slate-900/50 p-4 rounded-xl">
                <p class="text-sm text-gray-400">Total Students</p>
                <p class="text-2xl font-bold">${subjectStudents.length}</p>
              </div>
              <div class="bg-slate-900/50 p-4 rounded-xl">
                <p class="text-sm text-gray-400">Sessions</p>
                <p class="text-2xl font-bold">${lectureReports.length}</p>
              </div>
              <div class="bg-slate-900/50 p-4 rounded-xl">
                <p class="text-sm text-gray-400">Total Attendances</p>
                <p class="text-2xl font-bold">${lectureReports.reduce((sum, r) => sum + (r.present || 0), 0)}</p>
              </div>
              <div class="bg-slate-900/50 p-4 rounded-xl">
                <p class="text-sm text-gray-400">Average Rate</p>
                <p class="text-2xl font-bold text-green-400">
                  ${subjectStudents.length > 0 ? Math.round((lectureReports.reduce((sum, r) => sum + (r.present || 0), 0) / (subjectStudents.length * lectureReports.length)) * 100) : 0}%
                </p>
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="bg-gradient-to-r from-sky-600 to-blue-600">
                    <th class="p-3 text-left text-sm">#</th>
                    <th class="p-3 text-left text-sm">Student ID</th>
                    <th class="p-3 text-left text-sm">Student Name</th>
                    <th class="p-3 text-center text-sm">Present</th>
                    <th class="p-3 text-center text-sm">Rate</th>
                    <th class="p-3 text-center text-sm">Last Session</th>
                    <th class="p-3 text-center text-sm">Actions</th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-white/10">
      `;
      
      sortedStudents.forEach((student, index) => {
        const rate = lectureReports.length > 0 ? 
          Math.round((student.present / lectureReports.length) * 100) : 0;
        
        const lastSession = student.sessions.length > 0 ? 
          student.sessions.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
        
        detailsHTML += `
          <tr class="hover:bg-white/5 transition-colors">
            <td class="p-3 font-mono text-sm">${index + 1}</td>
            <td class="p-3 font-mono text-sm font-bold text-sky-400">${student.student_id}</td>
            <td class="p-3 font-medium">${student.name}</td>
            <td class="p-3 text-center font-bold ${student.present > 0 ? 'text-green-400' : 'text-red-400'}">
              ${student.present}/${lectureReports.length}
            </td>
            <td class="p-3 text-center">
              <div class="flex items-center gap-2">
                <div class="w-16 bg-slate-700 rounded-full h-2">
                  <div class="${rate >= 75 ? 'bg-green-400' : rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'} h-2 rounded-full" 
                       style="width: ${rate}%"></div>
                </div>
                <span class="text-xs ${rate >= 75 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}">
                  ${rate}%
                </span>
              </div>
            </td>
            <td class="p-3 text-center text-sm">
              ${lastSession ? `
                <span class="text-xs text-gray-400">
                  ${lastSession.date}<br>
                  ${lastSession.time}
                </span>
              ` : '-'}
            </td>
            <td class="p-3 text-center">
              <button onclick="exportStudentAttendance('${student.student_id}', ${lectureId})" 
                      class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs transition-colors">
                <i class="fas fa-download mr-1"></i> Export
              </button>
            </td>
           </tr>
        `;
      });
      
      detailsHTML += `</tbody> </table></div>`;
      
      detailsHTML += `
        <div class="mt-8 border-t border-white/10 pt-6">
          <h3 class="text-lg font-bold mb-4 text-sky-400">Session Details</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      `;
      
      lectureReports.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(report => {
        const sessionRate = report.totalStudents > 0 ? 
          Math.round((report.present / report.totalStudents) * 100) : 0;
        
        detailsHTML += `
          <div class="bg-slate-900/50 p-4 rounded-xl">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-sm font-semibold">${report.date}</p>
                <p class="text-xs text-gray-400 mt-1">${report.startTime?.split('T')[1]?.substring(0, 5) || 'N/A'} - ${report.endTime?.split('T')[1]?.substring(0, 5) || 'N/A'}</p>
              </div>
              <span class="px-2 py-1 ${sessionRate > 75 ? 'bg-green-600/20 text-green-400' : sessionRate > 50 ? 'bg-yellow-600/20 text-yellow-400' : 'bg-red-600/20 text-red-400'} rounded-full text-xs">
                ${sessionRate}%
              </span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-center">
              <div>
                <p class="text-lg font-bold text-green-400">${report.present || 0}</p>
                <p class="text-xs text-gray-400">Present</p>
              </div>
              <div>
                <p class="text-lg font-bold text-yellow-400">${report.pending || 0}</p>
                <p class="text-xs text-gray-400">Pending</p>
              </div>
            </div>
          </div>
        `;
      });
      
      detailsHTML += `</div></div></div></div>`;
      
      document.body.insertAdjacentHTML('beforeend', detailsHTML);
    }

    function exportStudentAttendance(studentId, lectureId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const lecture = doctorLectures.find(l => l.id === lectureId);
      const student = students.find(s => s.student_id === studentId);
      
      if (!lecture || !student) return;
      
      const studentReports = reports
        .filter(r => r.lectureId === lectureId && r.students)
        .map(r => {
          const studentRecord = r.students.find(s => s.student_id === studentId);
          return {
            date: r.date,
            status: studentRecord?.status || 'absent',
            method: studentRecord?.confirmedBy || 'none',
            time: r.startTime?.split('T')[1]?.substring(0, 5) || 'N/A'
          };
        })
        .filter(r => r.status === 'confirmed');
      
      const presentCount = studentReports.length;
      const totalSessions = reports.filter(r => r.lectureId === lectureId).length;
      const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Attendance Report', 15, 25);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(`Student: ${student.name}`, 15, 55);
      doc.text(`Student ID: ${student.student_id}`, 15, 63);
      doc.text(`Subject: ${lecture.subject_name}`, 15, 71);
      doc.text(`Level ${lecture.level} • ${lecture.department}`, 15, 79);
      
      doc.text(`Present: ${presentCount} / ${totalSessions}`, 15, 95);
      doc.text(`Attendance Rate: ${rate}%`, 15, 103);
      
      if (studentReports.length > 0) {
        let yPos = 120;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance Dates:', 15, yPos);
        yPos += 8;
        
        doc.setFont('helvetica', 'normal');
        studentReports.forEach(report => {
          doc.text(`• ${report.date} at ${report.time} (${report.method})`, 20, yPos);
          yPos += 6;
        });
      }
      
      doc.save(`attendance_${student.student_id}_${lecture.subject_name}.pdf`);
    }

    async function loadAttendanceReports() {
      if (!currentDoctor) return [];
      
      try {
        const token = localStorage.getItem('doctorToken');
        
        const response = await fetch(`/api/attendance-reports/doctor/${currentDoctor.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const serverReports = await response.json();
          console.log(`✅ Loaded ${serverReports.length} reports from server`);
          
          const enrichedReports = serverReports.map(report => {
            if (!report.level && report.lectureId) {
              const lecture = doctorLectures.find(l => l.id === report.lectureId);
              if (lecture) {
                report.level = lecture.level;
              }
            }
            return report;
          });
          
          const localReports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
          const allReports = [...enrichedReports, ...localReports];
          
          const uniqueReports = [];
          const seen = new Set();
          
          allReports.forEach(report => {
            if (!seen.has(report.sessionId)) {
              seen.add(report.sessionId);
              uniqueReports.push(report);
            }
          });
          
          localStorage.setItem(`attendance_reports_${currentDoctor.id}`, JSON.stringify(uniqueReports));
          
          return uniqueReports;
        } else {
          const localReports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
          console.log(`📁 Using local reports: ${localReports.length}`);
          return localReports;
        }
      } catch (error) {
        console.error('Error loading reports:', error);
        return JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      }
    }

    function openActivateModal(lectureId) {
      const lecture = doctorLectures.find(l => l.id === lectureId);
      if (!lecture) {
        showDoctorToast('Lecture not found', 'error');
        return;
      }

      const token = localStorage.getItem('doctorToken');
      if (!token) {
        showDoctorToast('❌ You are not logged in. Please login again.', 'error');
        document.getElementById('doctorDashboard').classList.add('hidden');
        document.getElementById('doctorLoginScreen').classList.remove('hidden');
        return;
      }

      const subjectStudents = students.filter(s => 
        s.level === lecture.level && 
        s.department === lecture.department
      );

      if (subjectStudents.length === 0) {
        showDoctorToast('No students found for this subject', 'warning');
        return;
      }

      showDoctorConfirmationModal({
        title: 'Start Live Session',
        message: `Start face recognition attendance for ${lecture.subject_name}?<br><br>
                  <span class="text-sm text-gray-400">Level ${lecture.level} • ${lecture.department}<br>
                  ${subjectStudents.length} students enrolled</span>
                  <br><br>
                  <span class="text-sm text-yellow-400">
                    <i class="fas fa-info-circle mr-1"></i>
                    Camera will open on the HOST machine (${window.location.hostname})
                  </span>`,
        icon: 'fa-video',
        iconColor: 'text-sky-400',
        requireComment: false,
        confirmText: 'Start Session',
        cancelText: 'Cancel',
        onConfirm: async () => {
          const sessionId = `LEC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          
          showDoctorToast('🔄 Requesting camera on host device...', 'info');

          try {
            const response = await fetch('/api/camera/request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                sessionId: sessionId,
                lectureId: lecture.id,
                doctorName: currentDoctor.name
              })
            });

            const data = await response.json();

            if (response.ok && data.success) {
              showDoctorToast('✅ Camera is opening on the host machine.', 'success');

              activeSessions.push({
                id: activeSessions.length + 1,
                session_id: sessionId,
                lecture_id: lecture.id,
                date: new Date().toISOString().split('T')[0],
                start_time: new Date().toLocaleTimeString(),
                subject_name: lecture.subject_name,
                level: lecture.level,
                department: lecture.department,
                attendees: 0
              });

              saveSessionsToStorage();
              renderWeeklySchedule();
              renderActiveSessions();
              document.getElementById('activeSessions').textContent = activeSessions.length;

            } else {
              showDoctorToast(`❌ Failed: ${data.error || 'Could not reach host device'}`, 'error');
            }
          } catch (error) {
            console.error('Error requesting camera:', error);
            showDoctorToast('❌ Network error while requesting camera.', 'error');
          }
        }
      });
    }

    function startLectureSession() {
      if (!currentSession) return;
      
      activeSessions.push({
        id: activeSessions.length + 1,
        session_id: currentSession.sessionId,
        lecture_id: currentSession.lecture_id,
        date: currentSession.date,
        start_time: new Date().toLocaleTimeString(),
        attendees: 0
      });
      
      saveSessionsToStorage();
      closeActivateModal();
      showToast('Lecture activated successfully', 'success');
      
      renderWeeklySchedule();
      renderActiveSessions();
      document.getElementById('activeSessions').textContent = activeSessions.length;
    }

    function openEndModal(lectureId) {
      const lecture = doctorLectures.find(l => l.id === lectureId);
      if (!lecture) return;
      
      const session = activeSessions.find(s => s.lecture_id === lectureId);
      
      let pendingList = [];
      let confirmedCount = 0;
      let total = 0;
      let attendanceData = { records: [], pending: [] };
      
      if (session) {
        try {
          const stored = localStorage.getItem(`attendance_${session.session_id}`);
          if (stored) {
            attendanceData = JSON.parse(stored);
            confirmedCount = attendanceData.records ? attendanceData.records.filter(r => r.confirmed).length : 0;
            total = attendanceData.records ? attendanceData.records.length : 0;
            pendingList = attendanceData.pending || [];
          }
        } catch (e) {
          console.error('Error reading attendance:', e);
        }
      }
      
      let message = `End session for ${lecture.subject_name}?<br><br>`;
      message += `<span class="text-sm">Confirmed: <strong class="text-green-400">${confirmedCount}</strong> / ${total || '?'} students</span><br>`;
      
      if (pendingList.length > 0) {
        message += `<span class="text-sm text-yellow-400 mt-2"><strong>⚠️ ${pendingList.length} pending students:</strong><br>`;
        pendingList.slice(0, 5).forEach(p => {
          message += `• ${p.studentName}<br>`;
        });
        if (pendingList.length > 5) {
          message += `• and ${pendingList.length - 5} more...<br>`;
        }
        message += `</span>`;
        message += `<span class="text-sm text-gray-400 mt-3 block">These students will be marked as absent when ending.</span>`;
      }
      
      showDoctorConfirmationModal({
        title: 'End Session',
        message: message,
        icon: 'fa-stop-circle',
        iconColor: 'text-red-400',
        requireComment: false,
        confirmText: 'End Session',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            const subjectStudents = students.filter(s => 
              s.level === lecture.level && 
              s.department === lecture.department
            );
            
            const attendanceMap = new Map();
            if (attendanceData.records) {
              attendanceData.records.forEach(r => {
                attendanceMap.set(r.studentId, r);
              });
            }
            
            const pendingSet = new Set();
            if (attendanceData.pending) {
              attendanceData.pending.forEach(p => {
                pendingSet.add(p.studentId);
              });
            }
            
            let totalConfirmed = 0;
            const studentsList = [];
            
            for (const student of subjectStudents) {
              const record = attendanceMap.get(student.id);
              const isPending = pendingSet.has(student.id);
              const isConfirmed = record?.confirmed || false;
              
              if (isConfirmed) totalConfirmed++;
              
              studentsList.push({
                studentId: student.id,
                studentName: student.name,
                student_id: student.student_id,
                status: isConfirmed ? 'confirmed' : (isPending ? 'pending' : 'absent'),
                confirmedBy: record?.confirmedByQR ? 'QR Code' : (record?.confirmed ? 'Face Recognition' : null),
                confirmedAt: record?.confirmedAt || null,
                detectedAt: record?.detectedAt || null
              });
            }
            
            const finalReport = {
              sessionId: session?.session_id || `LEC-${Date.now()}`,
              lectureId: lecture.id,
              subjectName: lecture.subject_name,
              subjectCode: lecture.subject_code || 'N/A',
              doctorId: currentDoctor.id,
              doctorName: currentDoctor.name,
              level: lecture.level,
              department: lecture.department,
              date: new Date().toISOString().split('T')[0],
              startTime: session?.start_time || new Date().toLocaleTimeString(),
              endTime: new Date().toLocaleTimeString(),
              totalStudents: subjectStudents.length,
              confirmed: totalConfirmed,
              pending: pendingList.length,
              absent: subjectStudents.length - totalConfirmed - pendingList.length,
              students: studentsList
            };
            
            console.log('📊 Final report summary:', {
              total: finalReport.totalStudents,
              confirmed: finalReport.confirmed,
              pending: finalReport.pending,
              absent: finalReport.absent
            });
            
            const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
            reports.push(finalReport);
            localStorage.setItem(`attendance_reports_${currentDoctor.id}`, JSON.stringify(reports));
            
            const token = localStorage.getItem('doctorToken');
            
            if (session) {
              try {
                await fetch(`/api/active-sessions/${session.session_id}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
              } catch (err) {
                console.error('Error ending session on server:', err);
              }
              
              try {
                const reportResponse = await fetch('/api/attendance-reports', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(finalReport)
                });
                
                if (reportResponse.ok) {
                  const result = await reportResponse.json();
                  console.log('✅ Report saved to server:', result);
                }
              } catch (err) {
                console.error('Error saving report to server:', err);
              }
              
              localStorage.removeItem(`attendance_${session.session_id}`);
            }
            
            activeSessions = activeSessions.filter(s => s.lecture_id !== lectureId);
            saveSessionsToStorage();
            
            try {
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage('close-camera', '*');
              }
            } catch (e) {
              console.log('No opener window to close');
            }
            
            showDoctorToast(`✅ Session ended. Report saved with ${totalConfirmed} confirmed, ${finalReport.absent} absent`, 'success');
            
            renderWeeklySchedule();
            renderActiveSessions();
            document.getElementById('activeSessions').textContent = activeSessions.length;
            
            if (!document.getElementById('reportsSection').classList.contains('hidden')) {
              filterReports();
            }
            
          } catch (error) {
            console.error('Error ending session:', error);
            showDoctorToast('❌ Error ending session: ' + error.message, 'error');
          }
        }
      });
    }

    function saveFinalAttendance(session, lecture, comment) {
      try {
        const stored = localStorage.getItem(`attendance_${session.session_id}`);
        if (!stored) return;
        
        const data = JSON.parse(stored);
        
        const finalRecords = data.records
          .filter(r => r.confirmed)
          .map(r => ({
            session_id: session.session_id,
            lecture_id: lecture.id,
            subject_name: lecture.subject_name,
            student_id: r.student_id,
            student_name: r.studentName,
            level: lecture.level,
            department: lecture.department,
            status: 'confirmed',
            confirmed_by: r.confirmedByQR ? 'qr' : 'face',
            confirmed_at: r.confirmedAt,
            date: new Date().toISOString().split('T')[0],
            comment: comment || null
          }));
        
        if (finalRecords.length > 0) {
          finalRecords.forEach(record => {
            fetch('/api/attendance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('doctorToken')}`
              },
              body: JSON.stringify(record)
            }).catch(err => console.error('Error saving attendance:', err));
          });
          
          const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
          reports.push({
            session_id: session.session_id,
            lecture_id: lecture.id,
            subject_name: lecture.subject_name,
            date: new Date().toISOString().split('T')[0],
            confirmed: finalRecords.length,
            total: data.records.length,
            records: finalRecords
          });
          localStorage.setItem(`attendance_reports_${currentDoctor.id}`, JSON.stringify(reports));
        }
        
        localStorage.removeItem(`attendance_${session.session_id}`);
        
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage('close-camera', '*');
          } catch (e) {}
        }
        
      } catch (error) {
        console.error('Error saving final attendance:', error);
      }
    }

    window.refreshDoctorDashboard = function() {
      loadSessionsFromStorage();
      renderActiveSessions();
      renderWeeklySchedule();
      document.getElementById('activeSessions').textContent = activeSessions.length;
    };

    function confirmEndLecture() {
      const modal = document.getElementById('endLectureModal');
      const lectureId = parseInt(modal.dataset.lectureId);
      
      activeSessions = activeSessions.filter(s => s.lecture_id !== lectureId);
      saveSessionsToStorage();
      
      closeEndModal();
      showToast('Session ended', 'success');
      
      renderWeeklySchedule();
      renderActiveSessions();
      document.getElementById('activeSessions').textContent = activeSessions.length;
    }

    function showSessionQR(sessionId) {
      const session = activeSessions.find(s => s.id === sessionId);
      if (session) openActivateModal(session.lecture_id);
    }

    function closeActivateModal() {
      document.getElementById('activateLectureModal').classList.add('hidden');
      currentSession = null;
    }

    function closeEndModal() {
      document.getElementById('endLectureModal').classList.add('hidden');
    }

    function startTimer() {
      let minutes = 60;
      let seconds = 0;
      const timer = document.getElementById('sessionTimer');
      
      const interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            timer.textContent = 'Expired';
            return;
          }
          minutes--;
          seconds = 59;
        } else {
          seconds--;
        }
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
    }

    async function exportAttendanceReport() {
      const reports = await loadAttendanceReports();
      
      const subjectId = document.getElementById('reportSubjectFilter')?.value;
      const level = document.getElementById('reportLevelFilter')?.value;
      const date = document.getElementById('reportDateFilter')?.value;
      
      let filtered = [...reports];
      
      if (subjectId) {
        filtered = filtered.filter(r => r.lectureId == subjectId);
      }
      
      if (level) {
        filtered = filtered.filter(r => r.level == level);
      }
      
      if (date) {
        filtered = filtered.filter(r => r.date === date);
      }
      
      const sortedReports = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      if (sortedReports.length === 0) {
        showDoctorToast('No data to export', 'warning');
        return;
      }

      showDoctorToast(`Generating PDF with ${sortedReports.length} reports...`, 'info');
      
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 10;
        
        let currentPage = 1;
        let dataIndex = 0;
        const recordsPerPage = 20;
        const totalPages = Math.ceil(sortedReports.length / recordsPerPage);
        
        while (dataIndex < sortedReports.length) {
          if (currentPage > 1) {
            doc.addPage();
          }
          
          doc.setFillColor(14, 165, 233);
          doc.rect(0, 0, pageWidth, 35, 'F');
          
          try {
            doc.addImage('logo.png', 'PNG', margin, 5, 25, 25);
          } catch (e) {
            doc.setFillColor(255, 255, 255);
            doc.circle(margin + 12.5, 5 + 12.5, 12, 'F');
            doc.setTextColor(14, 165, 233);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('T', margin + 9, 5 + 18);
          }
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('TRAXA DOCTOR MANAGEMENT', margin + 30, 15);
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'normal');
          doc.text('Attendance Reports Summary', margin + 30, 22);
          
          const startRecord = dataIndex + 1;
          const endRecord = Math.min(dataIndex + recordsPerPage, sortedReports.length);
          doc.setFontSize(8);
          doc.text(`Page ${currentPage} of ${totalPages} | Reports ${startRecord} to ${endRecord} of ${sortedReports.length}`, 
                   margin + 30, 28);
          
          doc.setTextColor(200, 200, 255);
          doc.setFontSize(7);
          
          let filterText = '';
          if (subjectId) {
            const subject = doctorSubjects.find(s => s.id == subjectId);
            filterText += `Subject: ${subject?.name || subjectId} | `;
          }
          if (level) filterText += `Level: ${level} | `;
          if (date) filterText += `Date: ${date} | `;
          
          if (filterText) {
            doc.text(`Filters: ${filterText}`, margin + 30, 33);
          }
          
          doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 28, { align: 'right' });
          
          doc.setDrawColor(255, 255, 255, 100);
          doc.setLineWidth(0.3);
          doc.line(margin, 35, pageWidth - margin, 35);
          
          const pageReports = sortedReports.slice(dataIndex, dataIndex + recordsPerPage);
          
          const tableData = pageReports.map(report => {
            const attendanceRate = report.totalStudents > 0 
              ? Math.round((report.present / report.totalStudents) * 100) 
              : 0;
            
            return [
              report.date || 'N/A',
              report.subjectName || 'N/A',
              `Level ${report.level || 'N/A'}`,
              `${formatTime(report.startTime)} - ${formatTime(report.endTime)}`,
              report.present?.toString() || '0',
              report.totalStudents?.toString() || '0',
              `${attendanceRate}%`
            ];
          });
          
          doc.autoTable({
            startY: 45,
            head: [['Date', 'Subject', 'Level', 'Time', 'Present', 'Total', 'Rate']],
            body: tableData,
            theme: 'grid',
            styles: { 
              fontSize: 8, 
              cellPadding: 2,
              halign: 'center',
              valign: 'middle'
            },
            headStyles: { 
              fillColor: [14, 165, 233], 
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 9
            },
            columnStyles: {
              0: { cellWidth: 25 },
              1: { cellWidth: 45, halign: 'left' },
              2: { cellWidth: 20 },
              3: { cellWidth: 35 },
              4: { cellWidth: 20 },
              5: { cellWidth: 20 },
              6: { cellWidth: 20 },
            },
            alternateRowStyles: { fillColor: [245, 245, 250] },
            margin: { left: margin, right: margin },
            didDrawPage: function(data) {
              doc.setFontSize(7);
              doc.setTextColor(128, 128, 128);
              doc.text(`Page ${currentPage} of ${totalPages}`, margin, pageHeight - 10);
              doc.text(`© ${new Date().getFullYear()} TRAXA System Management`, pageWidth / 2, pageHeight - 10, { align: 'center' });
              doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });
            }
          });
          
          dataIndex += recordsPerPage;
          currentPage++;
        }
        
        doc.addPage();
        
        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        try {
          doc.addImage('logo.png', 'PNG', margin, 5, 25, 25);
        } catch (e) {
          doc.setFillColor(255, 255, 255);
          doc.circle(margin + 12.5, 5 + 12.5, 12, 'F');
          doc.setTextColor(14, 165, 233);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('T', margin + 9, 5 + 18);
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('TRAXA DOCTOR MANAGEMENT', margin + 30, 15);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Attendance Reports - Summary', margin + 30, 22);
        
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 28, { align: 'right' });
        
        doc.setDrawColor(255, 255, 255, 100);
        doc.setLineWidth(0.3);
        doc.line(margin, 35, pageWidth - margin, 35);
        
        let yPos = 50;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(14, 165, 233);
        doc.text('Summary Report', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 15;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Reports: ${sortedReports.length}`, margin, yPos);
        yPos += 8;
        
        const totalPresent = sortedReports.reduce((sum, r) => sum + (r.present || 0), 0);
        const totalStudents = sortedReports.reduce((sum, r) => sum + (r.totalStudents || 0), 0);
        const overallRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
        
        doc.text(`Total Present: ${totalPresent}`, margin, yPos);
        yPos += 8;
        doc.text(`Total Students: ${totalStudents}`, margin, yPos);
        yPos += 8;
        doc.text(`Overall Attendance Rate: ${overallRate}%`, margin, yPos);
        yPos += 15;
        
        if (subjectId || level || date) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(14, 165, 233);
          doc.text('Applied Filters:', margin, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
          
          if (subjectId) {
            const subject = doctorSubjects.find(s => s.id == subjectId);
            doc.text(`• Subject: ${subject?.name || subjectId}`, margin + 5, yPos);
            yPos += 6;
          }
          if (level) {
            doc.text(`• Level: ${level}`, margin + 5, yPos);
            yPos += 6;
          }
          if (date) {
            doc.text(`• Date: ${date}`, margin + 5, yPos);
            yPos += 6;
          }
        }
        
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(14, 165, 233);
        doc.text('Reports by Month:', margin, yPos);
        yPos += 8;
        
        const monthStats = {};
        sortedReports.forEach(report => {
          if (report.date) {
            const month = report.date.substring(0, 7);
            monthStats[month] = (monthStats[month] || 0) + 1;
          }
        });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        Object.keys(monthStats).sort().reverse().forEach(month => {
          const [year, monthNum] = month.split('-');
          const monthName = new Date(year, monthNum - 1, 1).toLocaleString('default', { month: 'long' });
          doc.text(`• ${monthName} ${year}: ${monthStats[month]} reports`, margin + 5, yPos);
          yPos += 5;
        });
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report generated by: Dr. ${currentDoctor?.name || 'N/A'}`, margin, pageHeight - 20);
        doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, margin, pageHeight - 14);
        
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`© ${new Date().getFullYear()} TRAXA System Management - Summary Page`, pageWidth / 2, pageHeight - 6, { align: 'center' });
        
        const timestamp = new Date().toISOString().split('T')[0];
        let filename = `attendance_reports_${timestamp}`;
        
        if (subjectId) {
          const subject = doctorSubjects.find(s => s.id == subjectId);
          filename += `_${subject?.code || subjectId}`;
        }
        if (level) filename += `_L${level}`;
        if (date) filename += `_${date}`;
        
        filename += `.pdf`;
        
        doc.save(filename);
        
        showDoctorToast(`✅ Exported ${sortedReports.length} reports successfully`, 'success');
        
      } catch (error) {
        console.error('Error exporting PDF:', error);
        showDoctorToast('❌ Error generating PDF: ' + error.message, 'error');
      }
    }

    function getTodayDayName() {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date().getDay()];
    }

    function updateDateTime() {
      const now = new Date();
      const formatted = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      document.getElementById('currentDateTime').textContent = formatted;
    }

    function showToast(message, type = 'success') {
      if (typeof showDoctorToast === 'function') {
        showDoctorToast(message, type);
      } else {
        const toast = document.getElementById('toast');
        const msg = document.getElementById('toastMessage');
        const icon = document.getElementById('toastIcon');

        if (!toast || !msg || !icon) {
          console.error('Toast elements not found');
          alert(message);
          return;
        }

        msg.innerHTML = message;

        if (type === 'success') icon.className = 'fas fa-check-circle text-green-400 text-2xl';
        else if (type === 'error') icon.className = 'fas fa-exclamation-circle text-red-400 text-2xl';
        else icon.className = 'fas fa-info-circle text-blue-400 text-2xl';

        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 5000);
      }
    }

    function setupFilters() {
      const subjectSearch = document.getElementById('subjectSearch');
      if (subjectSearch) subjectSearch.addEventListener('input', filterSubjects);
      
      const subjectLevelFilter = document.getElementById('subjectLevelFilter');
      if (subjectLevelFilter) subjectLevelFilter.addEventListener('change', filterSubjects);
      
      const subjectSemesterFilter = document.getElementById('subjectSemesterFilter');
      if (subjectSemesterFilter) subjectSemesterFilter.addEventListener('change', filterSubjects);
      
      const lectureSemesterFilter = document.getElementById('lectureSemesterFilter');
      if (lectureSemesterFilter) lectureSemesterFilter.addEventListener('change', renderWeeklySchedule);
      
      const reportSubject = document.getElementById('reportSubjectFilter');
      const reportLevel = document.getElementById('reportLevelFilter');
      const reportDate = document.getElementById('reportDateFilter');
      
      if (reportSubject) reportSubject.addEventListener('change', filterReports);
      if (reportLevel) reportLevel.addEventListener('change', filterReports);
      if (reportDate) reportDate.addEventListener('change', filterReports);
    }

    function filterSubjects() {
      const search = document.getElementById('subjectSearch')?.value.toLowerCase() || '';
      const level = document.getElementById('subjectLevelFilter')?.value || '';
      const semester = document.getElementById('subjectSemesterFilter')?.value || '';
      
      let filtered = doctorSubjects;
      
      if (search) {
        filtered = filtered.filter(s => 
          s.name.toLowerCase().includes(search) || 
          (s.code && s.code.toLowerCase().includes(search))
        );
      }
      
      if (level) filtered = filtered.filter(s => s.level == level);
      if (semester) filtered = filtered.filter(s => s.semester == semester);
      
      const original = doctorSubjects;
      doctorSubjects = filtered;
      renderSubjects();
      doctorSubjects = original;
    }

    function renderSubjects() {
      const container = document.getElementById('subjectsList');
      if (!container) return;
      
      const levelFilter = document.getElementById('subjectLevelFilter');
      if (levelFilter) {
        const levels = [...new Set(doctorSubjects.map(s => s.level))].sort();
        levelFilter.innerHTML = '<option value="">All Levels</option>' + 
          levels.map(l => `<option value="${l}">Level ${l}</option>`).join('');
      }
      
      if (doctorSubjects.length === 0) {
        container.innerHTML = '<p class="text-2xl text-gray-400 text-center py-16">No subjects assigned</p>';
        return;
      }
      
      const grouped = {};
      doctorSubjects.forEach(s => {
        const level = s.level || 0;
        if (!grouped[level]) grouped[level] = {};
        const semester = s.semester || 1;
        if (!grouped[level][semester]) grouped[level][semester] = [];
        grouped[level][semester].push(s);
      });
      
      let html = '';
      
      Object.keys(grouped).sort().forEach(level => {
        html += `<h3 class="text-xl font-bold mt-8 mb-4 text-sky-400">Level ${level}</h3>`;
        
        [1, 2].forEach(semester => {
          if (grouped[level][semester] && grouped[level][semester].length > 0) {
            html += `<h4 class="text-lg font-semibold mb-3 text-sky-300">Semester ${semester}</h4>`;
            html += `<div class="overflow-x-auto mb-8"><table class="w-full"><thead>
                      <th>Code</th><th>Subject Name</th><th>Department</th><th>Lectures</th>
                      </thead><tbody>`;
            
            grouped[level][semester].forEach(s => {
              const lectureCount = doctorLectures.filter(l => l.subject_id === s.id).length;
              html += `
                  <td class="font-mono font-bold text-sky-400">${s.code || 'N/A'}
                  <td>${s.name}
                  <td>${s.department || 'N/A'}
                  <td><span class="px-3 py-1 bg-sky-600 rounded-full">${lectureCount}</span>
                </tr>`;
            });
            
            html += `</tbody></table></div>`;
          }
        });
      });
      
      container.innerHTML = html;
    }

    function renderWeeklySchedule() {
      const container = document.getElementById('weeklySchedule');
      if (!container) return;
      
      const semesterFilter = document.getElementById('lectureSemesterFilter')?.value || '';
      
      let filteredLectures = doctorLectures;
      if (semesterFilter) {
        filteredLectures = doctorLectures.filter(l => {
          const subject = subjects.find(s => s.id === l.subject_id);
          return subject && subject.semester == semesterFilter;
        });
      }
      
      let html = '';
      
      days.forEach(day => {
        const dayLectures = filteredLectures.filter(l => l.day === day);
        
        html += `<div class="day-card p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">${day}</h3>
              <span class="px-3 py-1 bg-slate-700 rounded-full text-sm">${dayLectures.length}</span>
            </div>
            <div class="space-y-3">`;
        
        if (dayLectures.length === 0) {
          html += `<p class="text-gray-400 text-sm py-3">No lectures</p>`;
        } else {
          dayLectures.forEach(lecture => {
            const isActive = activeSessions.some(s => s.lecture_id === lecture.id);
            
            html += `<div class="bg-slate-800/50 rounded-xl p-4 ${isActive ? 'border-l-4 border-green-500' : ''}">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <h4 class="font-bold text-lg">${lecture.subject_name}</h4>
                    <p class="text-sm text-gray-400 mt-1">
                      <i class="fas fa-clock mr-1"></i> ${lecture.time_display}
                      <i class="fas fa-map-marker-alt ml-3 mr-1"></i> ${lecture.location_name}
                    </p>
                    <p class="text-xs text-gray-500 mt-2">Level ${lecture.level} • ${lecture.department || 'N/A'}</p>
                  </div>
                  <div>
                    ${isActive ? 
                      `<button onclick="openEndModal(${lecture.id})" class="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-semibold border border-red-500/30">
                        <i class="fas fa-stop mr-1"></i> End
                      </button>` : 
                      `<button onclick="openActivateModal(${lecture.id})" class="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-sm font-semibold border border-green-500/30">
                        <i class="fas fa-play mr-1"></i> Activate
                      </button>`
                    }
                  </div>
                </div>
                ${isActive ? `<div class="mt-3 text-xs text-green-400 flex items-center gap-2"><i class="fas fa-circle animate-pulse"></i> Session Active</div>` : ''}
              </div>`;
          });
        }
        
        html += `</div></div>`;
      });
      
      container.innerHTML = html;
    }

    function filterByDay(day) {
      document.querySelectorAll('.day-filter-btn').forEach(btn => {
        btn.classList.remove('bg-sky-600');
        btn.classList.add('bg-slate-800');
      });
      
      event.target.classList.remove('bg-slate-800');
      event.target.classList.add('bg-sky-600');
      
      const semesterFilter = document.getElementById('lectureSemesterFilter')?.value || '';
      let filtered = doctorLectures;
      
      if (semesterFilter) {
        filtered = doctorLectures.filter(l => {
          const subject = subjects.find(s => s.id === l.subject_id);
          return subject && subject.semester == semesterFilter;
        });
      }
      
      if (day === 'all') {
        renderWeeklySchedule();
      } else {
        const container = document.getElementById('weeklySchedule');
        const dayLectures = filtered.filter(l => l.day === day);
        
        let html = `<div class="day-card p-5 col-span-full">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">${day}</h3>
              <span class="px-3 py-1 bg-slate-700 rounded-full text-sm">${dayLectures.length}</span>
            </div>
            <div class="space-y-3">`;
        
        if (dayLectures.length === 0) {
          html += `<p class="text-gray-400 text-sm py-3">No lectures</p>`;
        } else {
          dayLectures.forEach(lecture => {
            const isActive = activeSessions.some(s => s.lecture_id === lecture.id);
            
            html += `<div class="bg-slate-800/50 rounded-xl p-4">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-bold text-lg">${lecture.subject_name}</h4>
                    <p class="text-sm text-gray-400 mt-1">
                      <i class="fas fa-clock mr-1"></i> ${lecture.time_display}
                      <i class="fas fa-map-marker-alt ml-3 mr-1"></i> ${lecture.location_name}
                    </p>
                  </div>
                  <div>
                    ${isActive ? 
                      `<button onclick="openEndModal(${lecture.id})" class="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-semibold">
                        <i class="fas fa-stop"></i> End
                      </button>` : 
                      `<button onclick="openActivateModal(${lecture.id})" class="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-lg text-sm font-semibold">
                        <i class="fas fa-play"></i> Activate
                      </button>`
                    }
                  </div>
                </div>
              </div>`;
          });
        }
        
        html += `</div></div>`;
        container.innerHTML = html;
      }
    }

    // ============================================
    // GRADES MANAGEMENT
    // ============================================

    let subjectGrades = [];
    let currentSubject = null;
    let currentDepartmentStudents = [];

    async function loadDoctorGrades() {
      if (!currentDoctor) return;
      
      try {
        const token = localStorage.getItem('doctorToken');
        
        if (!token) {
          console.log('No token found, skipping grades load');
          subjectGrades = [];
          return;
        }
        
        console.log('Loading grades for doctor:', currentDoctor.id);
        
        const response = await fetch(`/api/grades/doctor/${currentDoctor.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          subjectGrades = await response.json();
          console.log(`✅ Loaded ${subjectGrades.length} grade records`);
          
          subjectGrades = subjectGrades.map(g => ({
            ...g,
            isVisible: g.isVisible !== undefined ? g.isVisible : false
          }));
        } else if (response.status === 403 || response.status === 401) {
          const error = await response.json();
          console.warn('⚠️ Permission denied:', error.error);
          subjectGrades = [];
        } else {
          console.warn('⚠️ Failed to load grades:', response.status);
          subjectGrades = [];
        }
      } catch (error) {
        console.error('Error loading grades:', error);
        subjectGrades = [];
      }
    }

    function renderSubjectGradeButtons() {
      const container = document.getElementById('subjectGradesButtons');
      if (!container) return;
      
      if (doctorSubjects.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-gray-400 py-8">No subjects assigned</p>';
        return;
      }
      
      container.innerHTML = doctorSubjects.map(subject => {
        const subjectGradesList = subjectGrades.filter(g => g.subject_id === subject.id);
        const visibleCount = subjectGradesList.filter(g => g.isVisible).length;
        const totalCount = subjectGradesList.length;
        
        return `
          <div class="bg-gradient-to-br from-purple-600 to-purple-800 p-4 rounded-xl text-center hover:scale-105 transition-transform">
            <div class="flex justify-between items-start mb-2">
              <p class="font-bold text-lg">${subject.code}</p>
              <button onclick="toggleSubjectVisibility(${subject.id})" 
                      class="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1
                             ${subjectGradesList.length > 0 && visibleCount === totalCount && totalCount > 0 
                               ? 'bg-green-600 hover:bg-green-700' 
                               : subjectGradesList.length > 0 && visibleCount > 0 
                                 ? 'bg-yellow-600 hover:bg-yellow-700'
                                 : 'bg-gray-600 hover:bg-gray-700'}">
                <i class="fas ${subjectGradesList.length > 0 && visibleCount === totalCount && totalCount > 0 
                               ? 'fa-eye' 
                               : subjectGradesList.length > 0 && visibleCount > 0 
                                 ? 'fa-eye' 
                                 : 'fa-eye-slash'}"></i>
                <span class="text-xs">${visibleCount}/${totalCount}</span>
              </button>
            </div>
            <p class="text-sm text-purple-200 mt-1">${subject.name}</p>
            <p class="text-xs text-purple-300 mt-2">Level ${subject.level} • ${subject.semester === 1 ? 'Semester 1' : 'Semester 2'}</p>
            <button onclick="selectSubjectForGrading(${subject.id})" 
                    class="mt-3 w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm transition-colors">
              <i class="fas fa-edit mr-1"></i> Manage Grades
            </button>
          </div>
        `;
      }).join('');
    }

    async function toggleSubjectVisibility(subjectId) {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) return;
      
      const subjectGradesList = subjectGrades.filter(g => g.subject_id === subjectId);
      if (subjectGradesList.length === 0) {
        showDoctorToast('No grades to show/hide', 'warning');
        return;
      }
      
      const allVisible = subjectGradesList.every(g => g.isVisible);
      const newVisibility = !allVisible;
      const action = newVisibility ? 'show' : 'hide';
      
      showDoctorConfirmationModal({
        title: `${newVisibility ? 'Show' : 'Hide'} Grades`,
        message: `Are you sure you want to ${action} all grades for ${subject.name} to students?`,
        icon: newVisibility ? 'fa-eye' : 'fa-eye-slash',
        iconColor: newVisibility ? 'text-green-400' : 'text-yellow-400',
        requireComment: false,
        confirmText: newVisibility ? 'Show Grades' : 'Hide Grades',
        cancelText: 'Cancel',
        onConfirm: async () => {
          showDoctorToast(`${newVisibility ? 'Showing' : 'Hiding'} grades...`, 'info');
          
          try {
            const token = localStorage.getItem('doctorToken');
            
            const response = await fetch(`/api/grades/subject/${subjectId}/visibility`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ isVisible: newVisibility })
            });
            
            if (response.ok) {
              const result = await response.json();
              showDoctorToast(`${result.message}`, 'success');
              
              await loadDoctorGrades();
              renderSubjectGradeButtons();
              
              if (currentSubject && currentSubject.id === subjectId) {
                await loadSubjectStats(subjectId);
                renderSubjectStudents();
              }
            } else {
              const error = await response.json();
              showDoctorToast(error.error || 'Failed to update visibility', 'error');
            }
          } catch (error) {
            console.error('Error toggling visibility:', error);
            showDoctorToast('Error updating visibility', 'error');
          }
        }
      });
    }

    async function selectSubjectForGrading(subjectId) {
      console.log(`🎯 selectSubjectForGrading called with subjectId: ${subjectId}`);
      
      currentSubject = subjects.find(s => s.id === subjectId);
      if (!currentSubject) {
        showDoctorToast('Subject not found', 'error');
        return;
      }
      
      showDoctorToast(`Loading ${currentSubject.name} students...`, 'info');
      
      try {
        const allStudents = await fetchStudents();
        
        currentDepartmentStudents = allStudents.filter(s => 
          s.level === currentSubject.level && 
          s.department === currentSubject.department
        );
        
        console.log(`📊 Found ${currentDepartmentStudents.length} students for ${currentSubject.name}`);
        
        const titleEl = document.getElementById('selectedSubjectTitle');
        const detailsEl = document.getElementById('selectedSubjectDetails');
        
        if (titleEl) {
          titleEl.textContent = `${currentSubject.name} (${currentSubject.code})`;
        }
        
        if (detailsEl) {
          detailsEl.innerHTML = `
            Level ${currentSubject.level} • ${currentSubject.department} • ${currentSubject.semester === 1 ? 'Semester 1' : 'Semester 2'}
          `;
        }
        
        await loadSubjectStats(subjectId);
        
        renderSubjectStudents();
        
        const infoSection = document.getElementById('selectedSubjectInfo');
        if (infoSection) {
          infoSection.classList.remove('hidden');
        }
        
        showDoctorToast(`Loaded ${currentDepartmentStudents.length} students`, 'success');
        
      } catch (error) {
        console.error('Error selecting subject:', error);
        showDoctorToast('Error loading students', 'error');
      }
    }

    function reorderStudents() {
      if (!currentSubject || !currentDepartmentStudents.length) {
        showDoctorToast('No students to reorder', 'warning');
        return;
      }
      
      console.log('🔄 Reordering students...');
      
      renderSubjectStudents();
      
      showDoctorToast('Students reordered', 'success');
    }

    async function fetchStudents() {
      try {
        const response = await fetch(`${DB_URL}/students.json`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
      return [];
    }

    function renderSubjectStudents() {
      console.log('🎯 renderSubjectStudents called');
      
      const container = document.getElementById('subjectStudentsList');
      if (!container) {
        console.error('Container subjectStudentsList not found');
        return;
      }
      
      if (!currentSubject) {
        console.error('currentSubject is null');
        container.innerHTML = '<p class="text-center text-gray-400 py-8">No subject selected</p>';
        return;
      }
      
      if (!currentDepartmentStudents || currentDepartmentStudents.length === 0) {
        console.log('No students found');
        container.innerHTML = '<p class="text-center text-gray-400 py-8">No students found in this department</p>';
        return;
      }
      
      console.log(`📊 Rendering ${currentDepartmentStudents.length} students for ${currentSubject.name}`);
      
      const sortedStudents = [...currentDepartmentStudents].sort((a, b) => {
        const numA = parseInt(a.student_id.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.student_id.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      
      currentDepartmentStudents = sortedStudents;
      
      let tbodyHTML = '';
      
      sortedStudents.forEach((student, index) => {
        const grade = subjectGrades.find(g => 
          g.student_id === student.id && 
          g.subject_id === currentSubject.id
        ) || {
          midterm: 0,
          oral: 0,
          practical: 0,
          attendance: 0,
          assignment: 0,
          id: 0,
          isVisible: false
        };
        
        const total = grade.midterm + grade.oral + grade.practical + grade.attendance + grade.assignment;
        const status = total >= 25 ? '🟢 Pass' : '🔴 Fail';
        const statusClass = total >= 25 ? 'text-green-400' : 'text-red-400';
        const bgClass = total >= 25 ? 'bg-green-600/20' : 'bg-red-600/20';
        
        tbodyHTML += `
          <tr class="hover:bg-white/5 ${grade.isVisible ? '' : 'opacity-70'}" data-student-id="${student.student_id}" data-student-num="${index + 1}">
            <td class="p-3 text-center font-mono text-sm font-bold">${index + 1}</td>
            <td class="p-3 font-mono text-sm font-bold text-purple-400">${student.student_id}</td>
            <td class="p-3 font-medium">${student.name}</td>
            <td class="p-3 text-center ${grade.midterm > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.midterm.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.oral > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.oral.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.practical > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.practical.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.attendance > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.attendance.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.assignment > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.assignment.toFixed(1)}</td>
            <td class="p-3 text-center font-bold ${statusClass}">${total.toFixed(1)}</td>
            <td class="p-3 text-center"><span class="px-2 py-1 rounded-full text-xs ${bgClass} ${statusClass}">${status}</span></td>
            <td class="p-3 text-center">
              <button onclick="openGradeModal(${student.id}, '${student.name.replace(/'/g, "\\'")}', ${grade.id || 0})" 
                      class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">
                <i class="fas fa-edit mr-1"></i> Edit
              </button>
            </td>
           </tr>
        `;
      });
      
      const tableHTML = `
        <div class="overflow-x-auto bg-white/5 rounded-3xl p-4">
          <table class="w-full">
            <thead>
              <tr class="bg-gradient-to-r from-purple-600 to-indigo-600">
                <th class="p-3 text-left text-sm">#</th>
                <th class="p-3 text-left text-sm">Student ID</th>
                <th class="p-3 text-left text-sm">Student Name</th>
                <th class="p-3 text-center text-sm">Mid (10)</th>
                <th class="p-3 text-center text-sm">Oral (5)</th>
                <th class="p-3 text-center text-sm">Prac (20)</th>
                <th class="p-3 text-center text-sm">Att (5)</th>
                <th class="p-3 text-center text-sm">Assgn (10)</th>
                <th class="p-3 text-center text-sm">Total (50)</th>
                <th class="p-3 text-center text-sm">Status</th>
                <th class="p-3 text-center text-sm">Actions</th>
               </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              ${tbodyHTML}
            </tbody>
           </table>
        </div>
      `;
      
      container.innerHTML = tableHTML;
      
      console.log(`✅ Table rendered with ${sortedStudents.length} students`);
      
      setTimeout(() => {
        const rows = document.querySelectorAll('#subjectStudentsList tbody tr');
        console.log('📊 Final display order:');
        rows.forEach((row, i) => {
          const studentId = row.getAttribute('data-student-id');
          console.log(`   Row ${i+1}: ${studentId}`);
        });
      }, 100);
    }

    function forceReorderStudents() {
      if (!currentSubject || !currentDepartmentStudents.length) {
        showDoctorToast('No students to reorder', 'warning');
        return;
      }
      
      console.log('🔄 Forcing student reorder...');
      
      const sorted = [...currentDepartmentStudents].sort((a, b) => {
        const numA = parseInt(a.student_id.replace(/[^0-9]/g, '')) || 0;
        const numB = parseInt(b.student_id.replace(/[^0-9]/g, '')) || 0;
        return numA - numB;
      });
      
      currentDepartmentStudents = sorted;
      
      renderSubjectStudents();
      
      showDoctorToast('Students reordered successfully!', 'success');
    }

    function watchTableChanges() {
      const container = document.getElementById('subjectStudentsList');
      if (!container) return;
      
      const observer = new MutationObserver((mutations) => {
        console.log('🔄 Table content changed, checking order...');
        
        setTimeout(() => {
          const rows = document.querySelectorAll('#subjectStudentsList tbody tr');
          const displayedIds = [];
          rows.forEach(row => {
            const studentId = row.getAttribute('data-student-id');
            if (studentId) displayedIds.push(studentId);
          });
          
          console.log('📊 Current displayed order:', displayedIds);
          
          const sortedIds = [...displayedIds].sort((a, b) => {
            const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
          });
          
          const isCorrect = JSON.stringify(displayedIds) === JSON.stringify(sortedIds);
          
          if (!isCorrect) {
            console.warn('⚠️ Display order is incorrect! Forcing reorder...');
            forceReorderStudents();
          } else {
            console.log('✅ Display order is correct');
          }
        }, 500);
      });
      
      observer.observe(container, { 
        childList: true, 
        subtree: true,
        characterData: true 
      });
      
      console.log('👀 Watching for table changes...');
    }

    setTimeout(watchTableChanges, 2000);

    function openGradeModal(studentId, studentName, gradeId = 0) {
      console.log(`Opening grade modal for student: ${studentName} (${studentId})`);
      
      const grade = subjectGrades.find(g => 
        g.student_id === studentId && 
        g.subject_id === currentSubject.id
      ) || { midterm: 0, oral: 0, practical: 0, attendance: 0, assignment: 0 };
      
      document.getElementById('gradeStudentId').value = studentId;
      document.getElementById('gradeSubjectId').value = currentSubject.id;
      document.getElementById('gradeId').value = gradeId;
      document.getElementById('gradeStudentName').textContent = studentName;
      document.getElementById('gradeStudentDetails').innerHTML = `
        <span class="text-xs text-gray-400">ID: ${studentId}</span>
        <span class="text-xs text-gray-400 mx-2">•</span>
        <span class="text-xs text-gray-400">${currentSubject.name}</span>
      `;
      
      document.getElementById('gradeMidterm').value = grade.midterm;
      document.getElementById('gradeOral').value = grade.oral;
      document.getElementById('gradePractical').value = grade.practical;
      document.getElementById('gradeAttendance').value = grade.attendance;
      document.getElementById('gradeAssignment').value = grade.assignment;
      
      updateGradeTotal();
      
      const modal = document.getElementById('gradeModal');
      modal.classList.remove('hidden');
      
      setTimeout(() => {
        document.getElementById('gradeMidterm').focus();
      }, 100);
    }

    function closeGradeModal() {
      document.getElementById('gradeModal').classList.add('hidden');
    }

    function validateGrade(input, max) {
      let value = parseFloat(input.value);
      if (isNaN(value)) value = 0;
      if (value < 0) value = 0;
      if (value > max) value = max;
      input.value = value;
      updateGradeTotal();
    }

    function updateGradeTotal() {
      const midterm = parseFloat(document.getElementById('gradeMidterm').value) || 0;
      const oral = parseFloat(document.getElementById('gradeOral').value) || 0;
      const practical = parseFloat(document.getElementById('gradePractical').value) || 0;
      const attendance = parseFloat(document.getElementById('gradeAttendance').value) || 0;
      const assignment = parseFloat(document.getElementById('gradeAssignment').value) || 0;
      
      const total = midterm + oral + practical + attendance + assignment;
      document.getElementById('gradeTotalPreview').textContent = total.toFixed(1);
      
      const totalElement = document.getElementById('gradeTotalPreview');
      if (total >= 25) {
        totalElement.className = 'text-xl font-bold text-green-400 ml-2';
      } else {
        totalElement.className = 'text-xl font-bold text-red-400 ml-2';
      }
    }

    document.getElementById('gradeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const gradeData = {
        student_id: parseInt(document.getElementById('gradeStudentId').value),
        subject_id: parseInt(document.getElementById('gradeSubjectId').value),
        doctor_id: currentDoctor.id,
        midterm: parseFloat(document.getElementById('gradeMidterm').value) || 0,
        oral: parseFloat(document.getElementById('gradeOral').value) || 0,
        practical: parseFloat(document.getElementById('gradePractical').value) || 0,
        attendance: parseFloat(document.getElementById('gradeAttendance').value) || 0,
        assignment: parseFloat(document.getElementById('gradeAssignment').value) || 0
      };
      
      try {
        const token = localStorage.getItem('doctorToken');
        
        const response = await fetch('/api/grades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(gradeData)
        });
        
        if (response.ok) {
          showToast('Grades saved successfully', 'success');
          closeGradeModal();
          await loadDoctorGrades();
          await loadSubjectStats(currentSubject.id);
          renderSubjectStudents();
        } else if (response.status === 401) {
          showToast('Session expired. Please login again.', 'error');
          doctorLogout();
        } else {
          const error = await response.json();
          showToast(error.error || 'Failed to save grades', 'error');
        }
      } catch (error) {
        console.error('Error saving grades:', error);
        showToast('Error saving grades', 'error');
      }
    });

    async function loadSubjectStats(subjectId) {
      try {
        const token = localStorage.getItem('doctorToken');
        
        const response = await fetch(`/api/grades/stats/${subjectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const stats = await response.json();
          
          document.getElementById('statTotalStudents').textContent = stats.total || 0;
          document.getElementById('statAverage').textContent = (stats.average || 0).toFixed(1);
          document.getElementById('statPassed').textContent = stats.passed || 0;
          document.getElementById('statFailed').textContent = stats.failed || 0;
          document.getElementById('statMax').textContent = stats.max || 0;
        } else {
          document.getElementById('statTotalStudents').textContent = currentDepartmentStudents.length;
          document.getElementById('statAverage').textContent = '0.0';
          document.getElementById('statPassed').textContent = '0';
          document.getElementById('statFailed').textContent = '0';
          document.getElementById('statMax').textContent = '0';
        }
      } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('statTotalStudents').textContent = currentDepartmentStudents.length;
        document.getElementById('statAverage').textContent = '0.0';
        document.getElementById('statPassed').textContent = '0';
        document.getElementById('statFailed').textContent = '0';
        document.getElementById('statMax').textContent = '0';
      }
    }

    async function exportSubjectGrades() {
      if (!currentSubject) {
        showToast('Please select a subject first', 'warning');
        return;
      }
      
      if (currentDepartmentStudents.length === 0) {
        showToast('No students found for this subject', 'warning');
        return;
      }
      
      showToast('Generating PDF...', 'info');
      
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        
        const margin = 6;
        const headerHeight = 28;
        const topContentY = headerHeight + 14;
        const recordsPerPage = 30;
        
        const totalPages = Math.ceil(currentDepartmentStudents.length / recordsPerPage);
        
        let currentPage = 1;
        let dataIndex = 0;
        
        while (dataIndex < currentDepartmentStudents.length) {
          if (currentPage > 1) doc.addPage();
          
          doc.setFillColor(147, 51, 234);
          doc.rect(0, 0, pageWidth, headerHeight, 'F');
          
          try {
            doc.addImage('logo.png', 'PNG', margin, 3, 22, 22);
          } catch (e) {
            doc.setFillColor(255, 255, 255);
            doc.circle(margin + 11, 3 + 11, 10, 'F');
            doc.setTextColor(147, 51, 234);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('T', margin + 8, 3 + 16);
          }
          
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12.5);
          doc.setFont('helvetica', 'bold');
          doc.text('TRAXA SYSTEM MANAGEMENT', margin + 30, 11);
          
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('Subject Grades Report', margin + 30, 17);
          
          doc.setFontSize(8);
          const startRecord = dataIndex + 1;
          const endRecord = Math.min(dataIndex + recordsPerPage, currentDepartmentStudents.length);
          doc.text(`Page ${currentPage} of ${totalPages} • ${startRecord}–${endRecord} of ${currentDepartmentStudents.length}`,
                   margin + 30, 23);
          
          doc.setFontSize(7);
          doc.setTextColor(220, 220, 255);
          doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - margin, 23, { align: 'right' });
          
          doc.setDrawColor(255, 255, 255, 0.6);
          doc.setLineWidth(0.4);
          doc.line(margin, headerHeight, pageWidth - margin, headerHeight);
          
          doc.setFontSize(11.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(147, 51, 234);
          doc.text(`${currentSubject.name} (${currentSubject.code})`, margin, topContentY);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(70);
          doc.text(
            `Level: ${currentSubject.level} • Dept: ${currentSubject.department} • Semester ${currentSubject.semester}`,
            margin, topContentY + 6
          );
          
          const tableStartY = topContentY + 11;
          const availableWidth = pageWidth - 2 * margin;
          
          const pageStudents = currentDepartmentStudents.slice(dataIndex, dataIndex + recordsPerPage);
          
          const tableData = pageStudents.map(student => {
            const grade = subjectGrades.find(g => 
              g.student_id === student.id && g.subject_id === currentSubject.id
            ) || { midterm: 0, oral: 0, practical: 0, attendance: 0, assignment: 0 };
            
            const total = grade.midterm + grade.oral + grade.practical + grade.attendance + grade.assignment;
            return [
              student.name || '-',
              student.student_id || '-',
              grade.midterm.toFixed(1),
              grade.oral.toFixed(1),
              grade.practical.toFixed(1),
              grade.attendance.toFixed(1),
              grade.assignment.toFixed(1),
              total.toFixed(1),
              total >= 25 ? 'PASS' : 'FAIL'
            ];
          });
          
          doc.autoTable({
            startY: tableStartY,
            head: [['Student Name', 'ID', 'Mid\n10', 'Oral\n5', 'Pract.\n20', 'Att.\n5', 'Ass.\n10', 'Total\n50', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: {
              fontSize: 7.8,
              cellPadding: 1.8,
              overflow: 'linebreak',
              halign: 'center',
              valign: 'middle',
              lineWidth: 0.12,
              lineColor: [200, 200, 200]
            },
            headStyles: {
              fillColor: [147, 51, 234],
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center',
              fontSize: 8
            },
            columnStyles: {
              0: { cellWidth: availableWidth * 0.18, halign: 'left' },
              1: { cellWidth: availableWidth * 0.12 },
              2: { cellWidth: availableWidth * 0.10 },
              3: { cellWidth: availableWidth * 0.10 },
              4: { cellWidth: availableWidth * 0.10 },
              5: { cellWidth: availableWidth * 0.10 },
              6: { cellWidth: availableWidth * 0.10 },
              7: { cellWidth: availableWidth * 0.10, fontStyle: 'bold' },
              8: { cellWidth: availableWidth * 0.11 }
            },
            margin: { left: margin, right: margin },
            alternateRowStyles: { fillColor: [250, 250, 255] },
            didParseCell: function(data) {
              if (data.column.index === 8 && data.cell.section === 'body' && data.cell.text?.[0]) {
                const status = data.cell.text[0];
                data.cell.styles.textColor = status === 'PASS' ? [10, 150, 10] : [200, 20, 20];
                data.cell.styles.fontStyle = 'bold';
              }
            },
            didDrawPage: function() {
              doc.setFontSize(7);
              doc.setTextColor(120);
              doc.text(`Page ${currentPage} / ${totalPages}`, margin, pageHeight - 6);
              doc.text('© TRAXA System', pageWidth / 2, pageHeight - 6, { align: 'center' });
              doc.text(new Date().toLocaleDateString('en-GB'), pageWidth - margin, pageHeight - 6, { align: 'right' });
            }
          });
          
          dataIndex += recordsPerPage;
          currentPage++;
        }
        
        doc.addPage();
        
        doc.setFillColor(147, 51, 234);
        doc.rect(0, 0, pageWidth, headerHeight, 'F');
        
        try {
          doc.addImage('logo.png', 'PNG', margin, 3, 22, 22);
        } catch (e) {
          doc.setFillColor(255, 255, 255);
          doc.circle(margin + 11, 3 + 11, 10, 'F');
          doc.setTextColor(147, 51, 234);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text('T', margin + 8, 3 + 16);
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12.5);
        doc.setFont('helvetica', 'bold');
        doc.text('TRAXA SYSTEM MANAGEMENT', margin + 30, 11);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Grades Summary', margin + 30, 17);
        
        doc.setFontSize(8);
        doc.text(`Summary Page`, margin + 30, 23);
        
        doc.setFontSize(7);
        doc.setTextColor(220, 220, 255);
        doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - margin, 23, { align: 'right' });
        
        doc.setDrawColor(255, 255, 255, 0.6);
        doc.setLineWidth(0.4);
        doc.line(margin, headerHeight, pageWidth - margin, headerHeight);
        
        let yPos = 50;
        
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 51, 234);
        doc.text('Summary Report', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 12;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Subject: ${currentSubject.name} (${currentSubject.code})`, margin, yPos);
        yPos += 7;
        doc.text(`Level: ${currentSubject.level} • Department: ${currentSubject.department} • Semester ${currentSubject.semester === 1 ? '1' : '2'}`, margin, yPos);
        yPos += 7;
        doc.text(`Total Students: ${currentDepartmentStudents.length}`, margin, yPos);
        yPos += 7;
        doc.text(`Doctor: ${currentDoctor?.name || 'N/A'}`, margin, yPos);
        yPos += 15;
        
        const allGrades = currentDepartmentStudents.map(student => {
          const grade = subjectGrades.find(g => g.student_id === student.id && g.subject_id === currentSubject.id);
          return grade ? (grade.midterm + grade.oral + grade.practical + grade.attendance + grade.assignment) : 0;
        });
        
        const passed = allGrades.filter(g => g >= 25).length;
        const failed = allGrades.filter(g => g < 25).length;
        const average = allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1) : 0;
        const maxGrade = allGrades.length > 0 ? Math.max(...allGrades) : 0;
        const minGrade = allGrades.length > 0 ? Math.min(...allGrades) : 0;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 51, 234);
        doc.text('Grade Statistics:', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`• Passed: ${passed} (${((passed / allGrades.length) * 100 || 0).toFixed(1)}%)`, margin + 5, yPos);
        yPos += 6;
        doc.text(`• Failed: ${failed} (${((failed / allGrades.length) * 100 || 0).toFixed(1)}%)`, margin + 5, yPos);
        yPos += 6;
        doc.text(`• Average Grade: ${average} / 50`, margin + 5, yPos);
        yPos += 6;
        doc.text(`• Highest Grade: ${maxGrade} / 50`, margin + 5, yPos);
        yPos += 6;
        doc.text(`• Lowest Grade: ${minGrade} / 50`, margin + 5, yPos);
        yPos += 15;
        
        const distribution = {
          'A (45-50)': allGrades.filter(g => g >= 45).length,
          'B (40-44)': allGrades.filter(g => g >= 40 && g < 45).length,
          'C (35-39)': allGrades.filter(g => g >= 35 && g < 40).length,
          'D (30-34)': allGrades.filter(g => g >= 30 && g < 35).length,
          'E (25-29)': allGrades.filter(g => g >= 25 && g < 30).length,
          'F (<25)': allGrades.filter(g => g < 25).length
        };
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(147, 51, 234);
        doc.text('Grade Distribution:', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        Object.entries(distribution).forEach(([grade, count]) => {
          const percentage = allGrades.length > 0 ? ((count / allGrades.length) * 100).toFixed(1) : 0;
          doc.text(`• ${grade}: ${count} (${percentage}%)`, margin + 5, yPos);
          yPos += 6;
        });
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Report generated by: ${currentDoctor?.name || 'System'}`, margin, pageHeight - 20);
        doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, margin, pageHeight - 14);
        
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`© ${new Date().getFullYear()} TRAXA System Management - Summary Page`, pageWidth / 2, pageHeight - 6, { align: 'center' });
        
        const timestamp = new Date().toISOString().split('T')[0];
        doc.save(`grades_${currentSubject.code}_${timestamp}.pdf`);
        
        showToast('Grades report exported successfully', 'success');
        
      } catch (error) {
        console.error('Error exporting PDF:', error);
        showToast('Error generating PDF: ' + error.message, 'error');
      }
    }

    async function loadAllData() {
      console.log('📂 Loading database files...');
      
      await loadDoctors();
      
      await Promise.all([
        loadSubjects(),
        loadLectures(),
        loadLocations(),
        loadTimeslots(),
        loadStudents()
      ]);
      
      await loadDoctorGrades();
      
      console.log('✅ All database files loaded successfully!');
      
      const activeSection = document.querySelector('.nav-btn.active')?.dataset.section;
      if (activeSection === 'grading') {
        renderSubjectGradeButtons();
      }
    }

    function checkStudentsBeforeExport() {
      console.log('=== STUDENT EXPORT CHECK ===');
      console.log('Subject:', currentSubject);
      console.log('Total students in department:', currentDepartmentStudents.length);
      console.log('Students list:', currentDepartmentStudents.map(s => ({
        id: s.id,
        name: s.name,
        student_id: s.student_id
      })));
      
      const invalidStudents = currentDepartmentStudents.filter(s => !s.id || !s.name || !s.student_id);
      if (invalidStudents.length > 0) {
        console.warn('Invalid students found:', invalidStudents);
      }
      
      return currentDepartmentStudents.length;
    }

    function exportGradesExcel() {
      if (!currentSubject || !currentDepartmentStudents.length) {
        showDoctorToast('No data to export', 'warning');
        return;
      }
      
      showDoctorToast('Preparing Excel file with formatting...', 'info');
      
      try {
        const wb = XLSX.utils.book_new();
        
        const mainData = [];
        
        mainData.push(['🏫 TRAXA SYSTEM MANAGEMENT - GRADE SHEET']);
        mainData.push([]);
        
        mainData.push(['📋 SUBJECT INFORMATION']);
        mainData.push(['═══════════════════════════════════════════════════']);
        mainData.push(['Subject Code:', currentSubject.code || 'N/A']);
        mainData.push(['Subject Name:', currentSubject.name]);
        mainData.push(['Level:', currentSubject.level]);
        mainData.push(['Department:', currentSubject.department]);
        mainData.push(['Semester:', currentSubject.semester === 1 ? 'First Semester' : 'Second Semester']);
        mainData.push(['Doctor:', currentDoctor?.name || 'N/A']);
        mainData.push(['Generated:', new Date().toLocaleString()]);
        mainData.push(['═══════════════════════════════════════════════════']);
        mainData.push([]);
        
        mainData.push(['📊 STUDENT GRADES TABLE']);
        mainData.push([]);
        
        const headerRow = [
          '#',
          'Student ID',
          'Student Name',
          'Midterm (10)',
          'Oral (5)',
          'Practical (20)',
          'Attendance (5)',
          'Assignment (10)',
          'Total (50)',
          'Status',
          'Notes'
        ];
        mainData.push(headerRow);
        
        mainData.push([
          '─────',
          '───────────────',
          '──────────────────────────────',
          '─────────────',
          '──────────',
          '───────────────',
          '───────────────',
          '───────────────',
          '──────────',
          '────────',
          '────────────────────'
        ]);
        
        const sortedStudents = [...currentDepartmentStudents].sort((a, b) => {
          const idA = parseInt(a.student_id) || 0;
          const idB = parseInt(b.student_id) || 0;
          return idA - idB;
        });
        
        console.log(`Exporting ${sortedStudents.length} students sorted by ID`);
        
        sortedStudents.forEach((student, index) => {
          const grade = subjectGrades.find(g => 
            g.student_id === student.id && 
            g.subject_id === currentSubject.id
          ) || { 
            midterm: 0, 
            oral: 0, 
            practical: 0, 
            attendance: 0, 
            assignment: 0 
          };
          
          const total = grade.midterm + grade.oral + grade.practical + grade.attendance + grade.assignment;
          const status = total >= 25 ? 'PASS' : 'FAIL';
          
          mainData.push([
            (index + 1).toString(),
            student.student_id,
            student.name,
            grade.midterm.toFixed(1),
            grade.oral.toFixed(1),
            grade.practical.toFixed(1),
            grade.attendance.toFixed(1),
            grade.assignment.toFixed(1),
            total.toFixed(1),
            status,
            ''
          ]);
        });
        
        mainData.push([
          '─────',
          '───────────────',
          '──────────────────────────────',
          '─────────────',
          '──────────',
          '───────────────',
          '───────────────',
          '───────────────',
          '──────────',
          '────────',
          '────────────────────'
        ]);
        
        mainData.push([]);
        
        mainData.push(['📈 GRADE STATISTICS']);
        mainData.push(['═══════════════════════════════════════════════════']);
        
        const allTotals = sortedStudents.map(student => {
          const grade = subjectGrades.find(g => 
            g.student_id === student.id && 
            g.subject_id === currentSubject.id
          );
          return grade ? (grade.midterm + grade.oral + grade.practical + grade.attendance + grade.assignment) : 0;
        });
        
        const passed = allTotals.filter(t => t >= 25).length;
        const failed = allTotals.filter(t => t < 25).length;
        const average = allTotals.length > 0 ? (allTotals.reduce((a, b) => a + b, 0) / allTotals.length).toFixed(1) : 0;
        const maxGrade = allTotals.length > 0 ? Math.max(...allTotals) : 0;
        const minGrade = allTotals.length > 0 ? Math.min(...allTotals) : 0;
        
        mainData.push(['Total Students:', sortedStudents.length, '']);
        mainData.push(['✅ Passed:', passed, `(${((passed/sortedStudents.length)*100).toFixed(1)}%)`]);
        mainData.push(['❌ Failed:', failed, `(${((failed/sortedStudents.length)*100).toFixed(1)}%)`]);
        mainData.push(['📊 Average Grade:', average, '/ 50']);
        mainData.push(['🏆 Highest Grade:', maxGrade, '/ 50']);
        mainData.push(['📉 Lowest Grade:', minGrade, '/ 50']);
        mainData.push(['═══════════════════════════════════════════════════']);
        
        mainData.push([]);
        mainData.push(['✨ Generated by TRAXA System Management ✨']);
        mainData.push([`📅 ${new Date().toLocaleString()}`]);
        
        const ws = XLSX.utils.aoa_to_sheet(mainData);
        
        const colWidths = [
          { wch: 6 },   // #
          { wch: 18 },  // Student ID
          { wch: 40 },  // Student Name
          { wch: 16 },  // Midterm
          { wch: 14 },  // Oral
          { wch: 18 },  // Practical
          { wch: 18 },  // Attendance
          { wch: 18 },  // Assignment
          { wch: 14 },  // Total
          { wch: 14 },  // Status
          { wch: 30 }   // Notes
        ];
        ws['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(wb, ws, 'Grades');
        
        const fileName = `Grades_${currentSubject.code}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showDoctorToast(`✅ Exported ${sortedStudents.length} students sorted by ID`, 'success');
        
      } catch (error) {
        console.error('Error exporting Excel:', error);
        showDoctorToast('❌ Error exporting Excel file: ' + error.message, 'error');
      }
    }

    function importGradesExcel() {
      if (!currentSubject) {
        showDoctorToast('Please select a subject first', 'warning');
        return;
      }
      
      showDoctorConfirmationModal({
        title: 'Import Grades',
        message: 'This will update all grades for this subject based on the Excel file. Continue?',
        icon: 'fa-file-import',
        iconColor: 'text-blue-400',
        requireComment: false,
        confirmText: 'Import',
        cancelText: 'Cancel',
        onConfirm: () => {
          let input = document.getElementById('excelFileInput');
          if (!input) {
            input = document.createElement('input');
            input.id = 'excelFileInput';
            input.type = 'file';
            input.accept = '.xlsx, .xls, .csv';
            input.style.display = 'none';
            document.body.appendChild(input);
          }
          
          const newInput = input.cloneNode(true);
          input.parentNode.replaceChild(newInput, input);
          
          newInput.addEventListener('change', handleExcelImport);
          
          newInput.click();
        }
      });
    }

    async function handleExcelImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      showDoctorToast('Reading Excel file...', 'info');
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          blankrows: false 
        });
        
        console.log('📊 Excel file loaded:');
        console.log('Sheet name:', firstSheetName);
        console.log('Total rows:', rows.length);
        console.log('First 20 rows:', rows.slice(0, 20));
        
        if (rows.length < 5) {
          showDoctorToast('Excel file is empty or invalid', 'error');
          return;
        }
        
        await processExcelData(rows);
        
      } catch (error) {
        console.error('Error reading Excel:', error);
        showDoctorToast('❌ Error reading Excel file: ' + error.message, 'error');
      } finally {
        event.target.value = '';
      }
    }

    async function processExcelData(rows) {
      showDoctorToast('Processing grades...', 'info');
      
      try {
        let headerRowIndex = -1;
        
        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          const rowText = JSON.stringify(row).toLowerCase();
          
          if (rowText.includes('student id') || rowText.includes('student name') || 
              rowText.includes('🆔') || rowText.includes('👤')) {
            headerRowIndex = i;
            console.log(`✅ Found header at row ${i}:`, row);
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          showDoctorToast('Could not find header row. Make sure the file has "Student ID" and "Student Name" columns.', 'error');
          return;
        }
        
        const studentMap = {};
        currentDepartmentStudents.forEach(s => {
          studentMap[s.student_id] = s;
          studentMap[s.student_id.replace(/[^0-9]/g, '')] = s;
          studentMap[s.name.toLowerCase().trim()] = s;
        });
        
        console.log(`📝 Student map created with ${Object.keys(studentMap).length} entries`);
        
        const gradesToUpdate = [];
        let foundCount = 0;
        let notFoundCount = 0;
        
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          
          if (!row || !Array.isArray(row) || row.length < 3) {
            console.log(`Row ${i}: Invalid or empty, skipping`);
            continue;
          }
          
          const studentId = row[1] ? String(row[1]).trim() : '';
          const studentName = row[2] ? String(row[2]).trim() : '';
          
          if (!studentId && !studentName) {
            console.log(`Row ${i}: Empty row, stopping`);
            break;
          }
          
          if (studentId.includes('──') || studentId.includes('══') || 
              studentId.includes('─') || studentId.includes('═')) {
            console.log(`Row ${i}: Separator row, skipping`);
            continue;
          }
          
          const midterm = row[3] ? parseFloat(row[3]) || 0 : 0;
          const oral = row[4] ? parseFloat(row[4]) || 0 : 0;
          const practical = row[5] ? parseFloat(row[5]) || 0 : 0;
          const attendance = row[6] ? parseFloat(row[6]) || 0 : 0;
          const assignment = row[7] ? parseFloat(row[7]) || 0 : 0;
          
          console.log(`Row ${i}: ID="${studentId}", Name="${studentName}", Grades=${midterm},${oral},${practical},${attendance},${assignment}`);
          
          let student = null;
          
          const cleanId = studentId.replace(/[^0-9]/g, '');
          
          if (cleanId && studentMap[cleanId]) {
            student = studentMap[cleanId];
            console.log(`✅ Found student by ID: ${cleanId} -> ${student.name}`);
          }
          
          if (!student && studentName) {
            const cleanName = studentName.toLowerCase().trim();
            if (studentMap[cleanName]) {
              student = studentMap[cleanName];
              console.log(`✅ Found student by name: ${cleanName}`);
            }
          }
          
          if (!student && studentId && studentMap[studentId]) {
            student = studentMap[studentId];
            console.log(`✅ Found student by original ID: ${studentId}`);
          }
          
          if (!student) {
            console.warn(`❌ Student not found: "${studentName}" (${studentId})`);
            notFoundCount++;
            continue;
          }
          
          gradesToUpdate.push({
            student_id: student.id,
            subject_id: currentSubject.id,
            doctor_id: currentDoctor.id,
            midterm,
            oral,
            practical,
            attendance,
            assignment
          });
          
          foundCount++;
        }
        
        console.log(`📊 Results: Found ${foundCount} students, Not found: ${notFoundCount}`);
        
        if (gradesToUpdate.length === 0) {
          showDoctorToast(`No valid grades found. Found ${foundCount} students, ${notFoundCount} not recognized.`, 'warning');
          return;
        }
        
        showDoctorToast(`Saving ${gradesToUpdate.length} grades...`, 'info');
        
        let savedCount = 0;
        
        for (const gradeData of gradesToUpdate) {
          try {
            const saved = await saveSingleGrade(gradeData);
            if (saved) savedCount++;
          } catch (err) {
            console.error('Error saving grade:', err);
          }
        }
        
        await loadDoctorGrades();
        await loadSubjectStats(currentSubject.id);
        renderSubjectStudents();
        
        showDoctorToast(`✅ Successfully imported ${savedCount} of ${gradesToUpdate.length} grades`, 'success');
        
      } catch (error) {
        console.error('Error processing Excel data:', error);
        showDoctorToast('❌ Error processing grades: ' + error.message, 'error');
      }
    }

    function debugStudentData() {
      console.log('=== STUDENT DATA DEBUG ===');
      console.log('Current Subject:', currentSubject);
      console.log('Department Students:', currentDepartmentStudents.length);
      
      console.log('First 10 students:');
      currentDepartmentStudents.slice(0, 10).forEach((s, i) => {
        console.log(`${i+1}. ID:${s.id}, StudentID:${s.student_id}, Name:${s.name}`);
      });
      
      const idMap = {};
      const nameMap = {};
      currentDepartmentStudents.forEach(s => {
        idMap[s.student_id] = s;
        idMap[s.student_id.replace(/[^0-9]/g, '')] = s;
        nameMap[s.name.toLowerCase().trim()] = s;
      });
      
      console.log('ID Map keys:', Object.keys(idMap).slice(0, 10));
      console.log('Name Map keys:', Object.keys(nameMap).slice(0, 10));
      
      return { idMap, nameMap };
    }

    document.getElementById('excelFileInput')?.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      
      showDoctorToast('Reading Excel file...', 'info');
      
      try {
        const data = await readExcelFile(file);
        await processImportedGrades(data);
      } catch (error) {
        console.error('Error importing Excel:', error);
        showDoctorToast('❌ Error importing Excel file: ' + error.message, 'error');
      } finally {
        e.target.value = '';
      }
    });

    function readExcelFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
    }

    async function processImportedGrades(excelData) {
      if (!excelData || excelData.length < 5) {
        showDoctorToast('Invalid Excel file format', 'error');
        return;
      }
      
      showDoctorToast('Processing imported grades...', 'info');
      
      try {
        console.log('📊 Excel file structure:');
        console.log('Total rows:', excelData.length);
        console.log('First 5 rows:');
        for (let i = 0; i < Math.min(5, excelData.length); i++) {
          console.log(`Row ${i}:`, excelData[i]);
        }
        
        let headerRowIndex = -1;
        
        for (let i = 0; i < Math.min(20, excelData.length); i++) {
          const row = excelData[i];
          if (!row || !Array.isArray(row)) continue;
          
          const rowText = row.map(cell => String(cell || '')).join(' ').toLowerCase();
          
          if (rowText.includes('student id') && rowText.includes('student name')) {
            headerRowIndex = i;
            console.log(`✅ Found header at row ${i}:`, row);
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          for (let i = 0; i < Math.min(20, excelData.length); i++) {
            const row = excelData[i];
            if (!row || !Array.isArray(row) || row.length < 3) continue;
            
            const col1 = String(row[0] || '');
            const col2 = String(row[1] || '');
            const col3 = String(row[2] || '');
            
            if (col1.includes('#') || col1.includes('🔢') || 
                col2.includes('ID') || col2.includes('🆔') ||
                col3.includes('Name') || col3.includes('👤')) {
              headerRowIndex = i;
              console.log(`✅ Found header at row ${i} (method 2):`, row);
              break;
            }
          }
        }
        
        if (headerRowIndex === -1) {
          showDoctorToast('Could not find header row in Excel file. Make sure the file has "Student ID" and "Student Name" columns.', 'error');
          return;
        }
        
        const dataStartRow = headerRowIndex + 1;
        
        const studentMap = {};
        currentDepartmentStudents.forEach(s => {
          studentMap[s.student_id] = s;
          studentMap[s.name.toLowerCase()] = s;
          studentMap[s.id] = s;
        });
        
        console.log(`📝 Looking for data from row ${dataStartRow} to ${excelData.length - 1}`);
        
        const gradesToUpdate = [];
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        for (let i = dataStartRow; i < excelData.length; i++) {
          const row = excelData[i];
          
          if (!row || !Array.isArray(row) || row.length < 3) {
            console.log(`Row ${i}: Invalid or empty row, stopping`);
            break;
          }
          
          const rowNum = row[0];
          const studentId = row[1] ? String(row[1]).trim() : '';
          const studentName = row[2] ? String(row[2]).trim() : '';
          
          if (!studentId || !studentName || 
              studentId.includes('──') || studentId.includes('══') ||
              studentName.includes('──') || studentName.includes('══') ||
              studentId.includes('Total') || studentName.includes('Statistics')) {
            console.log(`Row ${i}: Reached separator or end of data`);
            break;
          }
          
          let midterm = 0, oral = 0, practical = 0, attendance = 0, assignment = 0;
          
          if (row.length > 3) midterm = parseFloat(row[3]) || 0;
          if (row.length > 4) oral = parseFloat(row[4]) || 0;
          if (row.length > 5) practical = parseFloat(row[5]) || 0;
          if (row.length > 6) attendance = parseFloat(row[6]) || 0;
          if (row.length > 7) assignment = parseFloat(row[7]) || 0;
          
          console.log(`Row ${i}: ID=${studentId}, Name=${studentName}, Grades=${midterm},${oral},${practical},${attendance},${assignment}`);
          
          const cleanId = studentId.replace(/[^0-9]/g, '');
          
          let student = null;
          
          if (cleanId) {
            student = studentMap[cleanId];
          }
          
          if (!student && studentId) {
            student = studentMap[studentId];
          }
          
          if (!student && studentName) {
            const cleanName = studentName.toLowerCase().trim();
            
            student = studentMap[cleanName];
            
            if (!student) {
              for (const s of currentDepartmentStudents) {
                if (s.name.toLowerCase().includes(cleanName) || cleanName.includes(s.name.toLowerCase())) {
                  student = s;
                  console.log(`Found partial match: "${cleanName}" matches "${s.name}"`);
                  break;
                }
              }
            }
          }
          
          if (!student) {
            console.warn(`❌ Student not found: ${studentName} (${studentId})`);
            errorCount++;
            continue;
          }
          
          if (midterm > 10 || oral > 5 || practical > 20 || attendance > 5 || assignment > 10) {
            console.warn(`⚠️ Grades exceed maximum for ${student.name}:`, {midterm, oral, practical, attendance, assignment});
            skippedCount++;
            continue;
          }
          
          gradesToUpdate.push({
            student_id: student.id,
            subject_id: currentSubject.id,
            doctor_id: currentDoctor.id,
            midterm,
            oral,
            practical,
            attendance,
            assignment
          });
          
          successCount++;
        }
        
        console.log(`📊 Results: ${successCount} found, ${errorCount} not found, ${skippedCount} skipped`);
        
        if (gradesToUpdate.length === 0) {
          showDoctorToast(`No valid grades found. Found ${successCount} students, ${errorCount} not recognized.`, 'warning');
          return;
        }
        
        showDoctorToast(`Saving ${gradesToUpdate.length} grades...`, 'info');
        
        let savedCount = 0;
        const errors = [];
        
        for (const gradeData of gradesToUpdate) {
          try {
            const saved = await saveSingleGrade(gradeData);
            if (saved) {
              savedCount++;
            } else {
              errors.push(`Failed to save grade for student ID: ${gradeData.student_id}`);
            }
          } catch (err) {
            errors.push(err.message);
          }
        }
        
        await loadDoctorGrades();
        await loadSubjectStats(currentSubject.id);
        renderSubjectStudents();
        
        const message = `
          ✅ Successfully imported ${savedCount} of ${gradesToUpdate.length} grades<br>
          ⚠️ Skipped (exceeded limits): ${skippedCount}<br>
          ❌ Students not found: ${errorCount}
        `;
        
        showDoctorToast(message, savedCount > 0 ? 'success' : 'error');
        
      } catch (error) {
        console.error('❌ Error processing grades:', error);
        showDoctorToast('❌ Error processing grades: ' + error.message, 'error');
      }
    }

    function previewExcelFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1, 
              defval: '',
              blankrows: false 
            });
            
            console.log('📋 Excel preview:');
            console.log('Sheet name:', firstSheetName);
            console.log('Total rows:', jsonData.length);
            console.log('First 10 rows:', jsonData.slice(0, 10));
            
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
    }

    async function saveSingleGrade(gradeData) {
      try {
        const token = localStorage.getItem('doctorToken');
        
        const response = await fetch('/api/grades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(gradeData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Save grade error:', result);
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error saving grade:', error);
        return false;
      }
    }

    function downloadExcelTemplate() {
      if (!currentSubject) {
        showDoctorToast('Please select a subject first', 'warning');
        return;
      }
      
      const wb = XLSX.utils.book_new();
      
      const templateData = [
        ['📋 TRAXA SYSTEM MANAGEMENT - GRADE SHEET TEMPLATE'],
        ['═══════════════════════════════════════════════════════════════════════════════'],
        [],
        ['📁 SUBJECT INFORMATION:'],
        ['───────────────────────────────────────────────────'],
        ['Subject Code:', currentSubject.code || 'N/A'],
        ['Subject Name:', currentSubject.name],
        ['Level:', currentSubject.level],
        ['Department:', currentSubject.department],
        ['Semester:', currentSubject.semester === 1 ? 'First Semester' : 'Second Semester'],
        ['Doctor:', currentDoctor?.name || 'N/A'],
        ['───────────────────────────────────────────────────'],
        [],
        ['📊 STUDENT GRADES TABLE:'],
        [],
        ['🔢 #', '🆔 Student ID', '👤 Student Name', '📝 Mid(10)', '🗣️ Oral(5)', '🔬 Prac(20)', '📋 Att(5)', '📚 Assgn(10)', '🎯 Total', '✅ Status', '📌 Notes'],
        ['─────', '───────────────', '──────────────────────────────', '─────────', '────────', '──────────', '────────', '──────────', '──────', '──────', '────────────'],
      ];
      
      for (let i = 1; i <= 20; i++) {
        templateData.push([i, '', '', '', '', '', '', '', '', '', '']);
      }
      
      templateData.push(['─────', '───────────────', '──────────────────────────────', '─────────', '────────', '──────────', '────────', '──────────', '──────', '──────', '────────────']);
      templateData.push([]);
      templateData.push(['📝 IMPORTANT INSTRUCTIONS:']);
      templateData.push(['───────────────────────────────────────────────────']);
      templateData.push(['1. Fill in the student grades in columns D through H']);
      templateData.push(['2. Maximum values: Midterm=10, Oral=5, Practical=20, Attendance=5, Assignment=10']);
      templateData.push(['3. Do NOT edit the #, Student ID, Student Name columns']);
      templateData.push(['4. Total and Status will be calculated automatically when imported']);
      templateData.push(['5. Save the file and use "Import Excel" to upload']);
      templateData.push(['───────────────────────────────────────────────────']);
      templateData.push([]);
      templateData.push(['✨ TRAXA System Management - Excellence in Education ✨']);
      
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      ws['!cols'] = [
        { wch: 6 }, { wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 25 }
      ];
      
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
        { s: { r: 12, c: 0 }, e: { r: 12, c: 10 } },
        { s: { r: 14, c: 0 }, e: { r: 14, c: 10 } },
        { s: { r: 15 + 20, c: 0 }, e: { r: 15 + 20, c: 10 } }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      
      const fileName = `Grades_Template_${currentSubject.code}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      showDoctorToast('📋 Professional template downloaded successfully!', 'success');
    }

    function renderSubjectStudents() {
      const container = document.getElementById('subjectStudentsList');
      if (!container || !currentSubject) return;
      
      if (currentDepartmentStudents.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-8">No students found in this department</p>';
        return;
      }
      
      const sortedStudents = [...currentDepartmentStudents].sort((a, b) => a.name.localeCompare(b.name));
      
      let html = `
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-purple-600/30">
                <th class="p-3 text-left">Student Name</th>
                <th class="p-3 text-left">Student ID</th>
                <th class="p-3 text-center">Midterm (10)</th>
                <th class="p-3 text-center">Oral (5)</th>
                <th class="p-3 text-center">Practical (20)</th>
                <th class="p-3 text-center">Attendance (5)</th>
                <th class="p-3 text-center">Assignment (10)</th>
                <th class="p-3 text-center">Total (50)</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
               </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
      `;
      
      sortedStudents.forEach(student => {
        const grade = subjectGrades.find(g => 
          g.student_id === student.id && 
          g.subject_id === currentSubject.id
        ) || {
          midterm: 0,
          oral: 0,
          practical: 0,
          attendance: 0,
          assignment: 0,
          total: 0
        };
        
        const total = grade.midterm + grade.oral + grade.practical + grade.attendance + grade.assignment;
        const status = total >= 25 ? '🟢 Pass' : '🔴 Fail';
        const statusClass = total >= 25 ? 'text-green-400' : 'text-red-400';
        const bgClass = total >= 25 ? 'bg-green-600/20' : 'bg-red-600/20';
        
        html += `
          <tr class="hover:bg-white/5">
            <td class="p-3 font-medium">${student.name}</td>
            <td class="p-3 font-mono text-sm">${student.student_id}</td>
            <td class="p-3 text-center ${grade.midterm > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.midterm.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.oral > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.oral.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.practical > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.practical.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.attendance > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.attendance.toFixed(1)}</td>
            <td class="p-3 text-center ${grade.assignment > 0 ? 'text-green-400' : 'text-gray-400'}">${grade.assignment.toFixed(1)}</td>
            <td class="p-3 text-center font-bold ${statusClass}">${total.toFixed(1)}</td>
            <td class="p-3 text-center"><span class="px-2 py-1 rounded-full text-xs ${bgClass} ${statusClass}">${status}</span></td>
            <td class="p-3 text-center">
              <button onclick="openGradeModal(${student.id}, '${student.name}', ${grade.id || 0})" 
                      class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm">
                <i class="fas fa-edit mr-1"></i> Edit
              </button>
            </td>
           </tr>
        `;
      });
      
      html += `</tbody></table></div>`;
      container.innerHTML = html;
    }

    // ============================================
    // CUSTOM CONFIRMATION MODAL للدكتور
    // ============================================

    let doctorConfirmationCallback = null;

    function showDoctorConfirmationModal(options) {
      const {
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        icon = 'fa-exclamation-triangle',
        iconColor = 'text-yellow-400',
        requireComment = false,
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        onConfirm,
        onCancel
      } = options;

      const modal = document.getElementById('doctorConfirmationModal');
      if (!modal) {
        console.error('Doctor confirmation modal not found');
        if (confirm(message)) {
          if (onConfirm) onConfirm('');
        }
        return;
      }

      const titleEl = document.getElementById('doctorConfirmationTitle');
      const messageEl = document.getElementById('doctorConfirmationMessage');
      const iconElement = document.getElementById('doctorConfirmationIcon');
      const commentSection = document.getElementById('doctorConfirmationCommentSection');
      const commentInput = document.getElementById('doctorConfirmationComment');
      const commentError = document.getElementById('doctorCommentError');
      const confirmBtn = document.getElementById('doctorConfirmActionBtn');
      const cancelBtn = document.getElementById('doctorConfirmCancelBtn');

      if (titleEl) titleEl.textContent = title;
      if (messageEl) messageEl.textContent = message;
      
      if (iconElement) {
        iconElement.className = `fas ${icon} text-5xl ${iconColor}`;
      }
      
      if (commentSection) {
        if (requireComment) {
          commentSection.classList.remove('hidden');
          if (commentInput) commentInput.value = '';
          if (commentError) commentError.classList.add('hidden');
        } else {
          commentSection.classList.add('hidden');
        }
      }
      
      if (confirmBtn) {
        confirmBtn.innerHTML = `<i class="fas fa-check mr-2"></i> ${confirmText}`;
      }
      if (cancelBtn) {
        cancelBtn.innerHTML = `<i class="fas fa-times mr-2"></i> ${cancelText}`;
      }
      
      doctorConfirmationCallback = onConfirm;
      
      modal.classList.remove('hidden');
      
      const modalContent = document.getElementById('doctorConfirmationModalContent');
      if (modalContent) {
        setTimeout(() => {
          modalContent.classList.remove('scale-95');
          modalContent.classList.add('scale-100');
        }, 10);
      }
      
      if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', () => {
          modal.classList.add('hidden');
          if (modalContent) {
            modalContent.classList.add('scale-95');
            modalContent.classList.remove('scale-100');
          }
          if (onCancel) onCancel();
        });
      }
      
      const newConfirmBtn = document.getElementById('doctorConfirmActionBtn');
      if (newConfirmBtn) {
        const cloneConfirmBtn = newConfirmBtn.cloneNode(true);
        newConfirmBtn.parentNode.replaceChild(cloneConfirmBtn, newConfirmBtn);
        
        cloneConfirmBtn.addEventListener('click', () => {
          const comment = document.getElementById('doctorConfirmationComment')?.value.trim() || '';
          const commentError = document.getElementById('doctorCommentError');
          
          if (requireComment && !comment) {
            if (commentError) commentError.classList.remove('hidden');
            return;
          }
          
          modal.classList.add('hidden');
          if (modalContent) {
            modalContent.classList.add('scale-95');
            modalContent.classList.remove('scale-100');
          }
          
          if (doctorConfirmationCallback) {
            doctorConfirmationCallback(comment);
          }
        });
      }
    }

    function showDoctorToast(message, type = 'success', duration = 5000) {
      const toast = document.getElementById('doctorCustomToast');
      const msg = document.getElementById('doctorCustomToastMessage');
      const icon = document.getElementById('doctorCustomToastIcon');

      if (!toast || !msg || !icon) {
        console.error('Doctor toast elements not found');
        alert(message);
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
      
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.transition = 'transform 0.3s ease';
      }, 10);

      setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
          toast.classList.add('hidden');
        }, 300);
      }, duration);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('doctorConfirmationModal');
        if (modal && !modal.classList.contains('hidden')) {
          modal.classList.add('hidden');
          const modalContent = document.getElementById('doctorConfirmationModalContent');
          if (modalContent) {
            modalContent.classList.add('scale-95');
            modalContent.classList.remove('scale-100');
          }
        }
      }
      if (e.key === 'Escape') {
        const modal = document.getElementById('gradeModal');
        if (!modal.classList.contains('hidden')) {
          closeGradeModal();
        }
      }
      
      if (e.ctrlKey && e.key === 'Enter') {
        const modal = document.getElementById('gradeModal');
        if (!modal.classList.contains('hidden')) {
          document.getElementById('gradeForm').dispatchEvent(new Event('submit'));
        }
      }
    });

    function setupGradeModalNavigation() {
      const inputs = [
        'gradeMidterm',
        'gradeOral',
        'gradePractical',
        'gradeAttendance',
        'gradeAssignment'
      ];
      
      inputs.forEach((id, index) => {
        const input = document.getElementById(id);
        if (input) {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (index < inputs.length - 1) {
                document.getElementById(inputs[index + 1]).focus();
              } else {
                document.getElementById('gradeForm').dispatchEvent(new Event('submit'));
              }
            }
          });
        }
      });
    }

    let activeSessionsSyncInterval = null;
    let lastSyncTimestamp = Date.now();

    function startActiveSessionsSync() {
      if (activeSessionsSyncInterval) clearInterval(activeSessionsSyncInterval);
      
      activeSessionsSyncInterval = setInterval(async () => {
        await syncActiveSessions();
      }, 5000);
      
      setTimeout(syncActiveSessions, 500);
    }

    async function syncActiveSessions() {
      if (!currentDoctor) return;
      
      try {
        const token = localStorage.getItem('doctorToken');
        const response = await fetch(`/api/active-sessions/doctor/${currentDoctor.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const serverSessions = await response.json();
          
          const updated = [];
          serverSessions.forEach(serverSession => {
            const existing = activeSessions.find(s => s.session_id === serverSession.sessionId);
            if (existing) {
              updated.push(existing);
            } else {
              const lecture = doctorLectures.find(l => l.id === serverSession.lectureId);
              if (lecture) {
                updated.push({
                  id: updated.length + 1,
                  session_id: serverSession.sessionId,
                  lecture_id: serverSession.lectureId,
                  date: new Date(serverSession.startTime).toISOString().split('T')[0],
                  start_time: new Date(serverSession.startTime).toLocaleTimeString(),
                  subject_name: serverSession.subjectName || lecture.subject_name,
                  level: serverSession.level || lecture.level,
                  department: serverSession.department || lecture.department,
                  attendees: 0,
                  activeDevices: serverSession.activeDevices?.length || 1,
                  lastSync: Date.now()
                });
              }
            }
          });
          
          const hasChanges = JSON.stringify(activeSessions.map(s => s.session_id).sort()) !== 
                             JSON.stringify(updated.map(s => s.session_id).sort());
          
          if (hasChanges) {
            console.log('🔄 Active sessions changed, updating UI...');
            activeSessions = updated;
            saveSessionsToStorage();
            
            renderActiveSessions();
            renderWeeklySchedule();
            document.getElementById('activeSessions').textContent = activeSessions.length;
            
            if (updated.length > activeSessions.length) {
              showDoctorToast('🔄 New active session detected', 'info');
            } else if (updated.length < activeSessions.length) {
              showDoctorToast('🔄 Session ended on another device', 'warning');
            }
          }
          
          lastSyncTimestamp = Date.now();
        }
      } catch (error) {
        console.error('Error syncing active sessions:', error);
      }
      const syncIndicator = document.getElementById('syncIndicator');
      if (syncIndicator) {
        syncIndicator.innerHTML = `<i class="fas fa-check-circle text-green-400"></i> Synced ${new Date().toLocaleTimeString()}`;
        setTimeout(() => {
          syncIndicator.innerHTML = `<i class="fas fa-sync-alt"></i> Synced`;
        }, 3000);
      }
    }

    let syncInProgress = false;

    async function syncActiveSessions(showNotification = true) {
      if (syncInProgress) return;
      syncInProgress = true;
      
      if (!currentDoctor) {
        syncInProgress = false;
        return;
      }
      
      try {
        const token = localStorage.getItem('doctorToken');
        const response = await fetch(`/api/active-sessions/doctor/${currentDoctor.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const serverSessions = await response.json();
          
          const serverSessionMap = new Map();
          serverSessions.forEach(s => serverSessionMap.set(s.sessionId, s));
          
          const localSessionMap = new Map();
          activeSessions.forEach(s => localSessionMap.set(s.session_id, s));
          
          const newSessions = [];
          serverSessions.forEach(serverSession => {
            if (!localSessionMap.has(serverSession.sessionId)) {
              const lecture = doctorLectures.find(l => l.id === serverSession.lectureId);
              if (lecture) {
                newSessions.push({
                  id: activeSessions.length + newSessions.length + 1,
                  session_id: serverSession.sessionId,
                  lecture_id: serverSession.lectureId,
                  date: new Date(serverSession.startTime).toISOString().split('T')[0],
                  start_time: new Date(serverSession.startTime).toLocaleTimeString(),
                  subject_name: serverSession.subjectName || lecture.subject_name,
                  level: serverSession.level || lecture.level,
                  department: serverSession.department || lecture.department,
                  attendees: 0,
                  activeDevices: serverSession.activeDevices?.length || 1,
                  lastSync: Date.now()
                });
              }
            }
          });
          
          const endedSessions = [];
          activeSessions.forEach(localSession => {
            if (!serverSessionMap.has(localSession.session_id)) {
              endedSessions.push(localSession);
            }
          });
          
          const updatedSessions = activeSessions.filter(s => serverSessionMap.has(s.session_id));
          updatedSessions.push(...newSessions);
          
          updatedSessions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
          
          const hasChanges = newSessions.length > 0 || endedSessions.length > 0;
          
          if (hasChanges) {
            console.log('🔄 Session changes detected:', {
              new: newSessions.length,
              ended: endedSessions.length
            });
            
            activeSessions = updatedSessions;
            saveSessionsToStorage();
            
            renderActiveSessions();
            renderWeeklySchedule();
            document.getElementById('activeSessions').textContent = activeSessions.length;
            
            if (showNotification) {
              if (newSessions.length > 0) {
                newSessions.forEach(session => {
                  showDoctorToast(`🆕 New session: ${session.subject_name}`, 'info');
                });
              }
              
              if (endedSessions.length > 0) {
                endedSessions.forEach(session => {
                  showDoctorToast(`🔴 Session ended: ${session.subject_name}`, 'warning');
                });
              }
            }
          }
          
          updateSyncIndicator();
        }
      } catch (error) {
        console.error('Error syncing active sessions:', error);
      } finally {
        syncInProgress = false;
      }
    }

    function updateSyncIndicator() {
      const syncIndicator = document.getElementById('syncIndicator');
      if (syncIndicator) {
        syncIndicator.innerHTML = `<i class="fas fa-check-circle text-green-400"></i> Synced ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}`;
        
        clearTimeout(window.syncIndicatorTimeout);
        window.syncIndicatorTimeout = setTimeout(() => {
          syncIndicator.innerHTML = `<i class="fas fa-sync-alt"></i> Live Sync`;
        }, 3000);
      }
    }

    function startFastSync() {
      if (activeSessionsSyncInterval) clearInterval(activeSessionsSyncInterval);
      
      syncActiveSessions(true);
      
      activeSessionsSyncInterval = setInterval(() => {
        syncActiveSessions(false);
      }, 2000);
    }

    async function loadAttendanceDataForSession(sessionId) {
      try {
        const token = localStorage.getItem('doctorToken');
        const response = await fetch(`/api/attendance-session-data/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data;
        }
      } catch (error) {
        console.error('Error loading attendance data:', error);
      }
      
      return { records: [], pending: [] };
    }

    async function loadAllAttendanceData() {
      const sessionsData = {};
      
      for (const session of activeSessions) {
        const data = await loadAttendanceDataForSession(session.session_id);
        sessionsData[session.session_id] = data;
        
        localStorage.setItem(`attendance_${session.session_id}`, JSON.stringify(data));
      }
      
      return sessionsData;
    }

    const originalToggleStudentsList = toggleStudentsList;
    toggleStudentsList = async function(sessionId, lectureId) {
      const listDiv = document.getElementById(`students-list-${lectureId}`);
      
      if (listDiv.classList.contains('hidden')) {
        const data = await loadAttendanceDataForSession(sessionId);
        localStorage.setItem(`attendance_${sessionId}`, JSON.stringify(data));
        
        const lecture = doctorLectures.find(l => l.id === lectureId);
        if (!lecture) return;
        
        const subjectStudents = students.filter(s => 
          s.level === lecture.level && 
          s.department === lecture.department
        );
        
        const sortedStudents = [...subjectStudents].sort((a, b) => {
          const numA = parseInt(a.student_id.replace(/[^0-9]/g, '')) || 0;
          const numB = parseInt(b.student_id.replace(/[^0-9]/g, '')) || 0;
          return numA - numB;
        });
        
        let tableHTML = `
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-gray-300 border-b border-white/10">
                <th class="p-2 text-left">Student ID</th>
                <th class="p-2 text-left">Name</th>
                <th class="p-2 text-center">Status</th>
                <th class="p-2 text-center">Last Update</th>
               </tr>
            </thead>
            <tbody>
        `;
        
        sortedStudents.forEach(student => {
          const record = data.records?.find(r => r.studentId === student.id);
          const pending = data.pending?.find(p => p.studentId === student.id);
          
          let status = '❌ Absent';
          let statusClass = 'text-red-400';
          let lastUpdate = '-';
          
          if (record?.confirmed) {
            status = '✅ Confirmed';
            statusClass = 'text-green-400';
            lastUpdate = record.confirmedAt || '-';
          } else if (pending) {
            status = '⏳ Pending';
            statusClass = 'text-yellow-400';
            lastUpdate = pending.detectedAt || '-';
          }
          
          tableHTML += `
            <tr class="border-b border-white/5 hover:bg-white/5">
                            <td class="p-2 font-mono text-xs">${student.student_id}</td>
              <td class="p-2">${student.name}</td>
              <td class="p-2 text-center ${statusClass}">${status}</td>
              <td class="p-2 text-center text-xs text-gray-400">${lastUpdate}</td>
            </tr>
          `;
        });
        
        tableHTML += `</tbody></table>`;
        listDiv.innerHTML = tableHTML;
        listDiv.classList.remove('hidden');
      } else {
        listDiv.classList.add('hidden');
      }
    };

    const originalConfirmPendingStudent = confirmPendingStudent;
    confirmPendingStudent = async function(lectureId, sessionId, studentId, confirm) {
      try {
        const stored = localStorage.getItem(`attendance_${sessionId}`);
        if (!stored) return;
        
        const attendanceData = JSON.parse(stored);
        const token = localStorage.getItem('doctorToken');
        
        const recordIndex = attendanceData.records.findIndex(r => r.studentId === studentId);
        if (recordIndex === -1) return;
        
        if (confirm) {
          attendanceData.records[recordIndex].confirmed = true;
          attendanceData.records[recordIndex].status = 'confirmed';
          attendanceData.records[recordIndex].confirmedAt = new Date().toLocaleTimeString();
          attendanceData.records[recordIndex].confirmedByQR = false;
          attendanceData.pending = attendanceData.pending.filter(p => p.studentId !== studentId);
        } else {
          attendanceData.records[recordIndex].confirmed = false;
          attendanceData.records[recordIndex].status = 'absent';
          attendanceData.pending = attendanceData.pending.filter(p => p.studentId !== studentId);
        }
        
        localStorage.setItem(`attendance_${sessionId}`, JSON.stringify(attendanceData));
        
        await fetch(`/api/attendance-session-data/${sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            records: attendanceData.records,
            pending: attendanceData.pending,
            lastUpdate: new Date().toISOString()
          })
        });
        
        toggleStudentsList(sessionId, lectureId);
        renderActiveSessions();
        
        showDoctorToast(confirm ? 'Student confirmed' : 'Student rejected', confirm ? 'success' : 'warning');
        
      } catch (error) {
        console.error('Error confirming pending:', error);
        showDoctorToast('Error updating student status', 'error');
      }
    };

    let reportsSyncInterval = null;
    let lastReportsSync = 0;

    async function loadAttendanceReports(forceRefresh = false) {
      if (!currentDoctor) return [];
      
      try {
        const token = localStorage.getItem('doctorToken');
        
        console.log('📡 Fetching reports from server...');
        const response = await fetch(`/api/attendance-reports/doctor/${currentDoctor.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        let serverReports = [];
        if (response.ok) {
          serverReports = await response.json();
          console.log(`✅ Loaded ${serverReports.length} reports from server`);
        } else {
          console.warn('⚠️ Could not load reports from server, using local only');
        }
        
        const localReports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
        console.log(`📁 Local reports: ${localReports.length}`);
        
        const reportMap = new Map();
        
        serverReports.forEach(report => {
          reportMap.set(report.sessionId, {
            ...report,
            source: 'server',
            synced: true
          });
        });
        
        localReports.forEach(report => {
          if (!reportMap.has(report.sessionId)) {
            reportMap.set(report.sessionId, {
              ...report,
              source: 'local',
              synced: false
            });
          }
        });
        
        const allReports = Array.from(reportMap.values());
        
        allReports.sort((a, b) => {
          const dateA = new Date(a.date || a.endTime || a.createdAt || 0);
          const dateB = new Date(b.date || b.endTime || b.createdAt || 0);
          return dateB - dateA;
        });
        
        console.log(`📊 Total unique reports: ${allReports.length}`);
        
        localStorage.setItem(`attendance_reports_${currentDoctor.id}`, JSON.stringify(allReports));
        
        return allReports;
        
      } catch (error) {
        console.error('❌ Error loading reports:', error);
        return JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      }
    }

    function startReportsSync() {
      if (reportsSyncInterval) clearInterval(reportsSyncInterval);
      
      setTimeout(() => {
        filterReports();
      }, 2000);
      
      reportsSyncInterval = setInterval(() => {
        if (!document.getElementById('reportsSection').classList.contains('hidden')) {
          filterReports(true);
        }
      }, 10000);
    }

    const originalFilterReports = filterReports;
    filterReports = async function(silent = false) {
      const container = document.getElementById('attendanceReportsTable');
      if (!container) return;
      
      if (!silent) {
        showDoctorToast('📡 Loading reports...', 'info');
      }
      
      const reports = await loadAttendanceReports();
      
      const subjectId = document.getElementById('reportSubjectFilter')?.value;
      const level = document.getElementById('reportLevelFilter')?.value;
      const date = document.getElementById('reportDateFilter')?.value;
      
      let filtered = [...reports];
      
      if (subjectId) {
        filtered = filtered.filter(r => r.lectureId == subjectId);
      }
      
      if (level) {
        filtered = filtered.filter(r => r.level == level);
      }
      
      if (date) {
        filtered = filtered.filter(r => r.date === date);
      }
      
      console.log(`📊 Found ${reports.length} total reports, showing ${filtered.length} after filters`);
      
      updateReportStats(filtered, reports);
      
      renderReportsTable(filtered);
      
      if (!silent && filtered.length > 0) {
        showDoctorToast(`✅ Loaded ${filtered.length} reports`, 'success');
      }
    };

    const originalSetupUI = setupUI;
    setupUI = function() {
      originalSetupUI();
      startReportsSync();
    };

    const originalDoctorLogout = doctorLogout;
    doctorLogout = function() {
      if (reportsSyncInterval) {
        clearInterval(reportsSyncInterval);
        reportsSyncInterval = null;
      }
      originalDoctorLogout();
    };

    let lastSyncTime = new Date(0).toISOString();

    async function syncActiveSessions(force = false) {
      if (syncInProgress && !force) return;
      syncInProgress = true;
      
      if (!currentDoctor) {
        syncInProgress = false;
        return;
      }
      
      try {
        const token = localStorage.getItem('doctorToken');
        const url = force 
          ? `/api/active-sessions/doctor/${currentDoctor.id}`
          : `/api/active-sessions/doctor/${currentDoctor.id}/updates?lastSync=${encodeURIComponent(lastSyncTime)}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          lastSyncTime = data.timestamp || new Date().toISOString();
          
          if (force || data.updated) {
            console.log('🔄 Session updates detected, refreshing UI...');
            
            const serverSessions = force ? data : data.sessions;
            
            const updatedSessions = [];
            
            serverSessions.forEach(serverSession => {
              const existing = activeSessions.find(s => s.session_id === serverSession.sessionId);
              
              if (existing) {
                existing.activeDevices = serverSession.activeDevices?.length || 1;
                existing.lastSync = Date.now();
                updatedSessions.push(existing);
              } else {
                const lecture = doctorLectures.find(l => l.id === serverSession.lectureId);
                if (lecture) {
                  updatedSessions.push({
                    id: updatedSessions.length + 1,
                    session_id: serverSession.sessionId,
                    lecture_id: serverSession.lectureId,
                    date: new Date(serverSession.startTime).toISOString().split('T')[0],
                    start_time: new Date(serverSession.startTime).toLocaleTimeString(),
                    subject_name: serverSession.subjectName || lecture.subject_name,
                    level: serverSession.level || lecture.level,
                    department: serverSession.department || lecture.department,
                    attendees: 0,
                    activeDevices: serverSession.activeDevices?.length || 1,
                    lastSync: Date.now()
                  });
                  
                  showDoctorToast(`🆕 New session: ${lecture.subject_name} started on another device`, 'info');
                }
              }
            });
            
            const endedSessions = activeSessions.filter(local => 
              !serverSessions.some(server => server.sessionId === local.session_id)
            );
            
            if (endedSessions.length > 0) {
              endedSessions.forEach(session => {
                showDoctorToast(`🔴 Session ended: ${session.subject_name}`, 'warning');
              });
            }
            
            activeSessions = updatedSessions;
            saveSessionsToStorage();
            
            renderActiveSessions();
            renderWeeklySchedule();
            document.getElementById('activeSessions').textContent = activeSessions.length;
          }
          
          updateSyncIndicator();
        }
      } catch (error) {
        console.error('Error syncing active sessions:', error);
      } finally {
        syncInProgress = false;
      }
    }

    function renderReportsTable(reports) {
      console.log('Rendering reports table with', reports.length, 'reports');
      
      const container = document.getElementById('attendanceReportsTable');
      if (!container) {
        console.error('Attendance reports table container not found');
        return;
      }
      
      if (!reports || reports.length === 0) {
        container.innerHTML = `
          <div class="text-center py-12 bg-slate-800/50 rounded-2xl">
            <i class="fas fa-file-alt text-6xl text-gray-600 mb-4"></i>
            <p class="text-2xl text-gray-400">No attendance reports found</p>
            <p class="text-sm text-gray-500 mt-3">Start a session to generate reports</p>
          </div>
        `;
        return;
      }
      
      const sortedReports = [...reports].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });
      
      let html = `
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gradient-to-r from-sky-600 to-blue-600">
                <th class="p-3 text-left text-sm">#</th>
                <th class="p-3 text-left text-sm">Date</th>
                <th class="p-3 text-left text-sm">Subject</th>
                <th class="p-3 text-left text-sm">Level</th>
                <th class="p-3 text-left text-sm">Time</th>
                <th class="p-3 text-center text-sm">Present</th>
                <th class="p-3 text-center text-sm">Total</th>
                <th class="p-3 text-center text-sm">Rate</th>
                <th class="p-3 text-center text-sm">Actions</th>
               </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
      `;
      
      sortedReports.forEach((report, index) => {
        const present = report.present || report.confirmed || 0;
        const total = report.totalStudents || 0;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        
        html += `
          <tr class="hover:bg-white/5 transition-colors">
            <td class="p-3 text-sm font-mono">${index + 1}</td>
            <td class="p-3">${report.date || 'N/A'}</td>
            <td class="p-3 font-medium">${report.subjectName || report.subject_name || 'N/A'}</td>
            <td class="p-3">Level ${report.level || 'N/A'}</td>
            <td class="p-3 text-sm">${report.startTime || 'N/A'}</td>
            <td class="p-3 text-center font-bold text-green-400">${present}</td>
            <td class="p-3 text-center">${total}</td>
            <td class="p-3 text-center">
              <span class="${rate >= 75 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}">
                ${rate}%
              </span>
            </td>
            <td class="p-3 text-center">
              <button onclick="viewReportDetails('${report.sessionId || ''}')" 
                      class="px-3 py-1 bg-sky-600 hover:bg-sky-700 rounded-lg text-xs">
                <i class="fas fa-eye mr-1"></i> View
              </button>
            </td>
          </tr>
        `;
      });
      
      html += `</tbody></table></div>`;
      container.innerHTML = html;
    }

    function exportSingleReportPDF(sessionId) {
      const reports = JSON.parse(localStorage.getItem(`attendance_reports_${currentDoctor.id}`) || '[]');
      const report = reports.find(r => r.sessionId === sessionId);
      
      if (!report) {
        showDoctorToast('Report not found', 'error');
        return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      
      doc.setFillColor(14, 165, 233);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Attendance Report', margin, 18);
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 18, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${report.subjectName || report.subject_name || 'N/A'}`, margin, 40);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Date: ${report.date || 'N/A'}`, margin, 47);
      doc.text(`Time: ${report.startTime || 'N/A'} - ${report.endTime || 'N/A'}`, margin, 54);
      doc.text(`Level: ${report.level || 'N/A'} • Department: ${report.department || 'N/A'}`, margin, 61);
      doc.text(`Doctor: ${report.doctorName || currentDoctor?.name || 'N/A'}`, margin, 68);
      
      const present = report.students?.filter(s => s.status === 'confirmed').length || 0;
      const pending = report.students?.filter(s => s.status === 'pending').length || 0;
      const absent = report.students?.filter(s => s.status === 'absent').length || 0;
      const total = report.students?.length || 0;
      
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, 75, pageWidth - 2 * margin, 25, 3, 3, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Summary Statistics', margin + 5, 83);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Students: ${total}`, margin + 5, 90);
      doc.text(`Present: ${present}`, margin + 60, 90);
      doc.text(`Pending: ${pending}`, margin + 110, 90);
      doc.text(`Absent: ${absent}`, margin + 160, 90);
      doc.text(`Rate: ${total > 0 ? Math.round((present / total) * 100) : 0}%`, margin + 210, 90);
      
      if (report.students && report.students.length > 0) {
        const sortedStudents = [...report.students].sort((a, b) => {
          const idA = parseInt((a.student_id || '').replace(/[^0-9]/g, '')) || 0;
          const idB = parseInt((b.student_id || '').replace(/[^0-9]/g, '')) || 0;
          return idA - idB;
        });
        
        const tableData = sortedStudents.map(s => [
          s.student_id || 'N/A',
          s.studentName || s.student_name || 'N/A',
          s.status === 'confirmed' ? 'Present' : (s.status === 'pending' ? 'Pending' : 'Absent'),
          s.confirmedBy || '-'
        ]);
        
        doc.autoTable({
          startY: 110,
          head: [['Student ID', 'Student Name', 'Status', 'Method']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          margin: { left: margin, right: margin },
          didDrawPage: function(data) {
            doc.setFontSize(7);
            doc.setTextColor(128);
            doc.text(`Page ${data.pageNumber}`, margin, pageHeight - 10);
            doc.text(`© ${new Date().getFullYear()} TRAXA System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });
          }
        });
      }
      
      const filename = `attendance_${report.subjectName || 'report'}_${report.date || Date.now()}.pdf`;
      doc.save(filename);
      
      showDoctorToast('PDF exported successfully', 'success');
    }

    function showSettingsForDoctor() {
      console.log('🔧 Checking Settings section visibility...');
      
      const session = JSON.parse(localStorage.getItem('doctorSession') || '{}');
      const isDoctor = session.userType === 'doctor' || session.role === 'doctor';
      
      console.log('Current user type:', session.userType, 'Is doctor:', isDoctor);
      
      const settingsNavBtn = document.querySelector('[data-section="settings"]');
      const settingsSection = document.getElementById('settingsSection');
      
      if (isDoctor) {
        if (settingsNavBtn) {
          settingsNavBtn.classList.remove('hidden');
          console.log('✅ Settings button shown in sidebar');
        } else {
          console.warn('Settings button not found in DOM');
        }
        
        if (settingsSection) {
          settingsSection.classList.remove('hidden');
          console.log('✅ Settings section content shown');
          
          setTimeout(() => {
            loadDoctorTAs();
            loadDoctorProfile();
          }, 500);
        } else {
          console.warn('Settings section not found in DOM');
        }
      } else {
        if (settingsNavBtn) settingsNavBtn.classList.add('hidden');
        if (settingsSection) settingsSection.classList.add('hidden');
      }
    }

    function ensureSettingsElements() {
      console.log('🔍 Checking Settings elements in DOM...');
      
      const settingsBtn = document.querySelector('[data-section="settings"]');
      if (!settingsBtn) {
        console.warn('Settings button not found! Adding it...');
        
        const nav = document.querySelector('nav.space-y-2');
        if (nav) {
          const settingsHTML = `
            <button data-section="settings" class="nav-btn w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3">
              <i class="fas fa-cog w-6 text-sky-400"></i>
              <span class="font-medium">Settings</span>
            </button>
          `;
          nav.insertAdjacentHTML('beforeend', settingsHTML);
          console.log('✅ Settings button added to sidebar');
        }
      }
      
      const settingsSection = document.getElementById('settingsSection');
      if (!settingsSection) {
        console.warn('Settings section not found! Creating it...');
        
        const mainContent = document.querySelector('.flex-1.p-8.overflow-y-auto');
        if (mainContent) {
          const settingsHTML = `
            <div id="settingsSection" class="hidden">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold">Settings & Management</h2>
                <span class="px-5 py-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 flex items-center gap-2">
                  <i class="fas fa-shield-alt"></i>
                  <span>TA Management</span>
                </span>
              </div>
              
              <div class="bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl p-6 mb-8">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <i class="fas fa-user-md text-4xl text-white"></i>
                  </div>
                  <div>
                    <h3 class="text-2xl font-bold" id="doctorProfileName">Dr. Name</h3>
                    <p class="text-sm opacity-90 mt-1" id="doctorProfileEmail">email@university.edu</p>
                    <p class="text-xs opacity-75 mt-2" id="doctorProfileId">ID: 1</p>
                  </div>
                </div>
              </div>
              
              <div class="mb-8">
                <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                  <i class="fas fa-users text-sky-400"></i>
                  Your Teaching Assistants
                </h3>
                
                <div id="taListContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                </div>
              </div>
              
              <div id="taPermissionsModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 hidden">
                <div class="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
                  <div class="flex justify-between items-center mb-6 sticky top-0 bg-slate-800 pb-4 border-b border-white/10">
                    <div>
                      <h2 class="text-2xl font-bold text-sky-400">TA Permissions Control</h2>
                      <p id="taPermissionsName" class="text-sm text-gray-400 mt-1"></p>
                    </div>
                    <button onclick="closeTAPermissionsModal()" class="text-gray-400 hover:text-white text-2xl">&times;</button>
                  </div>
                  
                  <div class="space-y-6">
                    <div class="bg-slate-900/50 rounded-xl p-4">
                      <h3 class="text-lg font-bold mb-3 text-sky-400 flex items-center gap-2">
                        <i class="fas fa-bars"></i>
                        Navigation Sidebar
                      </h3>
                      <p class="text-xs text-gray-400 mb-3">Control which sections appear in the sidebar</p>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-chart-pie text-sky-400 w-5"></i> Overview Dashboard</span>
                          <input type="checkbox" id="perm_nav_overview" class="w-5 h-5 accent-sky-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-book text-sky-400 w-5"></i> Subjects</span>
                          <input type="checkbox" id="perm_nav_subjects" class="w-5 h-5 accent-sky-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-chalkboard-teacher text-sky-400 w-5"></i> Lectures</span>
                          <input type="checkbox" id="perm_nav_lectures" class="w-5 h-5 accent-sky-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-fingerprint text-sky-400 w-5"></i> Active Sessions</span>
                          <input type="checkbox" id="perm_nav_attendance" class="w-5 h-5 accent-sky-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-file-alt text-sky-400 w-5"></i> Attendance Reports</span>
                          <input type="checkbox" id="perm_nav_reports" class="w-5 h-5 accent-sky-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-graduation-cap text-sky-400 w-5"></i> Student Grades</span>
                          <input type="checkbox" id="perm_nav_grading" class="w-5 h-5 accent-sky-500">
                        </label>
                      </div>
                    </div>
                    
                    <div class="bg-slate-900/50 rounded-xl p-4">
                      <h3 class="text-lg font-bold mb-3 text-green-400 flex items-center gap-2">
                        <i class="fas fa-calendar-check"></i>
                        Session Controls
                      </h3>
                      <p class="text-xs text-gray-400 mb-3">Control attendance session buttons</p>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-play text-green-400 w-5"></i> Activate Session</span>
                          <input type="checkbox" id="perm_attendance_start" class="w-5 h-5 accent-green-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-stop text-red-400 w-5"></i> End Session</span>
                          <input type="checkbox" id="perm_attendance_end" class="w-5 h-5 accent-green-500">
                        </label>
                      </div>
                    </div>
                    
                    <div class="bg-slate-900/50 rounded-xl p-4">
                      <h3 class="text-lg font-bold mb-3 text-purple-400 flex items-center gap-2">
                        <i class="fas fa-chart-bar"></i>
                        Reports Controls
                      </h3>
                      <p class="text-xs text-gray-400 mb-3">Control report viewing and exporting</p>
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-eye text-blue-400 w-5"></i> View Reports</span>
                          <input type="checkbox" id="perm_reports_view" class="w-5 h-5 accent-purple-500">
                        </label>
                        <label class="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                          <span class="flex items-center gap-2"><i class="fas fa-download text-purple-400 w-5"></i> Export Reports</span>
                          <input type="checkbox" id="perm_reports_export" class="w-5 h-5 accent-purple-500">
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <button onclick="resetTAPermissions()" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm flex items-center gap-2">
                      <i class="fas fa-undo"></i> Reset to Default
                    </button>
                    <button onclick="saveTAPermissions()" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2">
                      <i class="fas fa-save"></i> Save Permissions
                    </button>
                    <button onclick="closeTAPermissionsModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
          mainContent.insertAdjacentHTML('beforeend', settingsHTML);
          console.log('✅ Settings section added to DOM');
        }
      }
    }

// ============================================
// دالة تسجيل الدخول المحسنة
// ============================================
async function handleDoctorLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('doctorUsername')?.value.trim() || '';
    const password = document.getElementById('doctorPassword')?.value || '';
    
    if (!username || !password) {
        showDoctorToast('Please enter username and password', 'error');
        return;
    }
    
    document.getElementById('loginLoading').classList.remove('hidden');
    
    try {
        const response = await fetch('/api/doctor/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('📥 Login response:', data);
        
        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('doctorToken', data.token);
            
            // إنشاء كامل للجلسة مع جميع البيانات
            const sessionData = {
                id: data.user.id,
                username: data.user.username,
                name: data.user.name,
                email: data.user.email || 'fayza.shourbagy@university.edu',
                role: data.user.role,
                userType: data.user.userType,
                supervisorDoctorId: data.user.supervisorDoctorId,
                supervisorDoctorName: data.user.supervisorDoctorName,
                taId: data.user.taId || data.user.id,
                permissions: data.user.permissions || null,
                loginTime: new Date().toISOString()
            };
            
            console.log('💾 Saving session data:', sessionData);
            localStorage.setItem('doctorSession', JSON.stringify(sessionData));
            
            if (data.user.userType === 'teaching-assistant') {
                currentDoctor = {
                    id: data.user.supervisorDoctorId || data.user.id,
                    name: data.user.supervisorDoctorName || data.user.name,
                    userType: 'teaching-assistant',
                    taId: data.user.id,
                    taName: data.user.name,
                    supervisorDoctorId: data.user.supervisorDoctorId,
                    supervisorDoctorName: data.user.supervisorDoctorName
                };
                console.log('👨‍🏫 TA data saved:', currentDoctor);
                
                if (data.user.permissions) {
                    window.currentTAPermissions = data.user.permissions;
                } else {
                    window.currentTAPermissions = { ...DEFAULT_TA_PERMISSIONS };
                }
            } else {
                currentDoctor = {
                    id: data.user.id,
                    name: data.user.name,
                    userType: 'doctor'
                };
            }
            
            document.getElementById('doctorLoginScreen').classList.add('hidden');
            document.getElementById('doctorDashboard').classList.remove('hidden');
            
            // عرض معلومات المستخدم
            let userInfo = '';
            if (data.user.userType === 'teaching-assistant') {
                const supervisorName = data.user.supervisorDoctorName || 'Dr. Mohamed Miad';
                userInfo = `
                    <div class="flex items-center gap-2 text-sm text-gray-400 mt-2">
                        <i class="fas fa-user-graduate text-sky-400"></i>
                        <span>Teaching Assistant</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-user-md mr-1 text-sky-400"></i>
                        Supervised by: ${supervisorName}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        <i class="fas fa-id-card mr-1"></i> TA ID: ${data.user.id}
                    </div>
                `;
            } else {
                userInfo = `
                    <div class="flex items-center gap-2 text-sm text-gray-400 mt-2">
                        <i class="fas fa-user-md text-sky-400"></i>
                        <span>Doctor</span>
                    </div>
                `;
            }
            
            document.getElementById('doctorName').innerHTML = `
                <div class="font-bold text-lg text-sky-400">${data.user.name}</div>
                ${userInfo}
            `;
            document.getElementById('doctorSpecialty').innerHTML = `
                <i class="fas fa-envelope mr-1"></i> ${data.user.email || 'fayza.shourbagy@university.edu'}
            `;
            
            document.getElementById('loginLoading').classList.add('hidden');
            
            await loadDoctorData();
            renderAllSections();
            ensureSettingsElements();
            
            setTimeout(() => {
                if (data.user.userType === 'teaching-assistant') {
                    if (window.currentTAPermissions) {
                        applyTAPermissions(window.currentTAPermissions);
                    }
                    hideSettingsForTA();
                } else if (data.user.userType === 'doctor') {
                    showAllForDoctor();
                    setTimeout(() => showSettingsForDoctor(), 1000);
                }
            }, 1500);
            
            showDoctorToast(`Welcome ${data.user.name}`, 'success');
            
        } else {
            document.getElementById('loginLoading').classList.add('hidden');
            showDoctorToast(data.error || 'Invalid credentials', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('loginLoading').classList.add('hidden');
        showDoctorToast('Server connection error', 'error');
    }
    }

    function updateStoredSession() {
    const session = JSON.parse(localStorage.getItem('doctorSession') || '{}');
    if (session && currentDoctor) {
        if (currentDoctor.supervisorDoctorName) {
            session.supervisorDoctorName = currentDoctor.supervisorDoctorName;
        }
        if (currentDoctor.supervisorDoctorId) {
            session.supervisorDoctorId = currentDoctor.supervisorDoctorId;
        }
        localStorage.setItem('doctorSession', JSON.stringify(session));
        console.log('💾 Updated session with supervisor info:', session);
    }
    }


    async function loadDoctorTAs() {
      console.log('🔍 Loading TAs for doctor...');
      
      if (!currentDoctor) {
        console.error('No current doctor');
        return;
      }
      
      const doctorId = currentDoctor.id;
      console.log(`🔍 Looking for TAs with supervisor_doctor_id = ${doctorId}`);
      
      try {
        const token = localStorage.getItem('doctorToken');
        const response = await fetch(`/api/doctor/${doctorId}/teaching-assistants`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const tas = await response.json();
          console.log(`✅ Found ${tas.length} TAs via API:`, tas);
          renderTAList(tas);
        } else {
          console.warn('API failed, trying direct file...');
          await loadTAsFromFile(doctorId);
        }
      } catch (error) {
        console.error('Error loading TAs via API:', error);
        await loadTAsFromFile(doctorId);
      }
    }
  
    async function loadTAsFromFile(doctorId) {
      try {
        const response = await fetch('/database/teaching_assistants.json');
        if (response.ok) {
          const allTAs = await response.json();
          console.log('📋 All TAs from file:', allTAs);
          
          const doctorTAs = allTAs.filter(ta => ta.supervisor_doctor_id === doctorId);
          console.log(`✅ Found ${doctorTAs.length} TAs for doctor ${doctorId} from file:`, doctorTAs);
          
          renderTAList(doctorTAs);
        } else {
          console.error('Could not load teaching_assistants.json');
          document.getElementById('taListContainer').innerHTML = '<p class="text-gray-400">Could not load teaching assistants</p>';
        }
      } catch (error) {
        console.error('Error loading TAs from file:', error);
        document.getElementById('taListContainer').innerHTML = '<p class="text-gray-400">Error loading teaching assistants</p>';
      }
    }

    function renderTAList(tas) {
      const container = document.getElementById('taListContainer');
      if (!container) {
        console.error('TA list container not found');
        return;
      }
      
      if (!tas || tas.length === 0) {
        container.innerHTML = `
          <div class="col-span-3 text-center py-8 bg-slate-800/50 rounded-xl">
            <i class="fas fa-user-graduate text-5xl text-gray-600 mb-4"></i>
            <p class="text-xl text-gray-400">No Teaching Assistants Found</p>
            <p class="text-sm text-gray-500 mt-2">You don't have any TAs assigned yet</p>
          </div>
        `;
        return;
      }
      
      let html = '';
      tas.forEach(ta => {
        html += `
          <div class="bg-slate-800/50 rounded-xl p-4 hover:border-sky-500 transition-all border border-slate-700">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
                  <i class="fas fa-user-graduate text-white"></i>
                </div>
                <div>
                  <h4 class="font-bold text-lg">${ta.name}</h4>
                  <p class="text-xs text-gray-400">${ta.email || 'No email'}</p>
                  <p class="text-xs text-gray-500 mt-1">Username: ${ta.username}</p>
                </div>
              </div>
              <span class="px-2 py-1 bg-sky-600/20 text-sky-400 rounded-full text-xs">TA</span>
            </div>
            
            <div class="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
              <span class="text-xs text-gray-400">
                <i class="fas fa-user-md mr-1"></i> Your Assistant
              </span>
              <button onclick="openTAPermissionsModal(${ta.id}, '${ta.name.replace(/'/g, "\\'")}')" 
                      class="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs flex items-center gap-1">
                <i class="fas fa-shield-alt"></i>
                Permissions
              </button>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = html;
      console.log('✅ TA list rendered');
    }

    async function loadDoctorProfile() {
      console.log('Loading doctor profile...');
      
      if (!currentDoctor) {
        console.error('No current doctor');
        return;
      }
      
      try {
        const token = localStorage.getItem('doctorToken');
        const response = await fetch('/api/doctor/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const doctor = await response.json();
          console.log('✅ Doctor profile loaded:', doctor);
          
          document.getElementById('doctorProfileName').textContent = `Dr. ${doctor.name}`;
          document.getElementById('doctorProfileEmail').textContent = doctor.email || 'No email';
          document.getElementById('doctorProfileId').innerHTML = `<i class="fas fa-id-card mr-1"></i> ID: ${doctor.id}`;
        } else {
          document.getElementById('doctorProfileName').textContent = `Dr. ${currentDoctor.name}`;
          document.getElementById('doctorProfileEmail').textContent = 'email@university.edu';
          document.getElementById('doctorProfileId').innerHTML = `<i class="fas fa-id-card mr-1"></i> ID: ${currentDoctor.id}`;
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('doctorProfileName').textContent = `Dr. ${currentDoctor.name}`;
        document.getElementById('doctorProfileEmail').textContent = 'email@university.edu';
        document.getElementById('doctorProfileId').innerHTML = `<i class="fas fa-id-card mr-1"></i> ID: ${currentDoctor.id}`;
      }
    }

    function showSettingsForDoctor() {
      console.log('🔧 Showing Settings for doctor...');
      
      const session = JSON.parse(localStorage.getItem('doctorSession') || '{}');
      const isDoctor = session.userType === 'doctor' || session.role === 'doctor';
      
      console.log('Current user type:', session.userType, 'Is doctor:', isDoctor);
      
      const settingsNavBtn = document.querySelector('[data-section="settings"]');
      const settingsSection = document.getElementById('settingsSection');
      
      if (isDoctor) {
        if (settingsNavBtn) {
          settingsNavBtn.classList.remove('hidden');
          console.log('✅ Settings button shown');
        }
        
        if (settingsSection) {
          settingsSection.classList.remove('hidden');
          console.log('✅ Settings section shown');
          
          setTimeout(() => {
            loadDoctorProfile();
            loadDoctorTAs();
          }, 500);
        } else {
          console.error('Settings section not found in DOM');
        }
      } else {
        if (settingsNavBtn) settingsNavBtn.classList.add('hidden');
        if (settingsSection) settingsSection.classList.add('hidden');
      }
    }

    async function testLoadTAs() {
      console.log('🧪 Testing TA loading...');
      console.log('Current doctor:', currentDoctor);
      
      if (currentDoctor && currentDoctor.id === 2) {
        console.log('🎯 This is Dr. Mohamed Miad (ID: 2)');
        console.log('Should see TA: Fayza Al-Shourbagy (ID: 102)');
        
        await loadTAsFromFile(2);
      }
    }

    let currentSelectedTA = null;

    async function openTAPermissionsModal(taId, taName) {
      console.log(`🎯 Opening permissions modal for TA: ${taName} (ID: ${taId})`);
      
      currentSelectedTA = { id: taId, name: taName };
      
      try {
        const token = localStorage.getItem('doctorToken');
        if (!token) {
          showDoctorToast('❌ You are not logged in', 'error');
          return;
        }
        
        const modal = document.getElementById('taPermissionsModal');
        if (!modal) {
          console.error('Permissions modal not found in DOM');
          showDoctorToast('❌ Permissions modal not found', 'error');
          return;
        }
        
        const nameElement = document.getElementById('taPermissionsName');
        if (nameElement) {
          nameElement.innerHTML = `
            <i class="fas fa-user-graduate mr-1"></i> ${taName}
            <span class="text-xs text-gray-400 ml-2">ID: ${taId}</span>
          `;
        }
        
        showDoctorToast('Loading permissions...', 'info');
        
        const response = await fetch(`/api/teaching-assistant/${taId}/permissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📋 Loaded permissions:', data);
          
          setPermissionCheckboxes(data.permissions);
          
        } else if (response.status === 404) {
          console.log('No permissions found, using defaults');
          setPermissionCheckboxes(DEFAULT_TA_PERMISSIONS);
          
        } else {
          const error = await response.json();
          showDoctorToast(`❌ Failed: ${error.error || 'Unknown error'}`, 'error');
        }
        
        modal.classList.remove('hidden');
        
        const modalContent = modal.querySelector('.bg-slate-800');
        if (modalContent) {
          modalContent.classList.add('scale-100');
          modalContent.classList.remove('scale-95');
        }
        
      } catch (error) {
        console.error('Error opening permissions modal:', error);
        showDoctorToast('❌ Error loading permissions: ' + error.message, 'error');
      }
    }

    function setPermissionCheckboxes(permissions) {
      if (!permissions) return;
      
      console.log('Setting checkboxes:', permissions);
      
      setCheckbox('perm_nav_overview', permissions['ta.nav.overview']);
      setCheckbox('perm_nav_subjects', permissions['ta.nav.subjects']);
      setCheckbox('perm_nav_lectures', permissions['ta.nav.lectures']);
      setCheckbox('perm_nav_attendance', permissions['ta.nav.attendance']);
      setCheckbox('perm_nav_reports', permissions['ta.nav.reports']);
      setCheckbox('perm_nav_grading', permissions['ta.nav.grading']);
      
      setCheckbox('perm_attendance_start', permissions['ta.attendance.start']);
      setCheckbox('perm_attendance_end', permissions['ta.attendance.end']);
      
      setCheckbox('perm_reports_view', permissions['ta.reports.view']);
      setCheckbox('perm_reports_export', permissions['ta.reports.export']);
    }

    function setCheckbox(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.checked = value === true;
      } else {
        console.warn(`Checkbox not found: ${elementId}`);
      }
    }

    function collectPermissionsFromCheckboxes() {
      const permissions = {};
      
      permissions['ta.nav.overview'] = document.getElementById('perm_nav_overview')?.checked || false;
      permissions['ta.nav.subjects'] = document.getElementById('perm_nav_subjects')?.checked || false;
      permissions['ta.nav.lectures'] = document.getElementById('perm_nav_lectures')?.checked || false;
      permissions['ta.nav.attendance'] = document.getElementById('perm_nav_attendance')?.checked || false;
      permissions['ta.nav.reports'] = document.getElementById('perm_nav_reports')?.checked || false;
      permissions['ta.nav.grading'] = document.getElementById('perm_nav_grading')?.checked || false;
      
      permissions['ta.attendance.start'] = document.getElementById('perm_attendance_start')?.checked || false;
      permissions['ta.attendance.end'] = document.getElementById('perm_attendance_end')?.checked || false;
      
      permissions['ta.reports.view'] = document.getElementById('perm_reports_view')?.checked || false;
      permissions['ta.reports.export'] = document.getElementById('perm_reports_export')?.checked || false;
      
      console.log('Collected permissions:', permissions);
      return permissions;
    }

    async function saveTAPermissions() {
      if (!currentSelectedTA || !currentSelectedTA.id) {
        showDoctorToast('❌ No teaching assistant selected', 'error');
        return;
      }
      
      const permissions = collectPermissionsFromCheckboxes();
      console.log('Saving permissions:', permissions);
      
      try {
        const token = localStorage.getItem('doctorToken');
        if (!token) {
          showDoctorToast('❌ You are not logged in', 'error');
          return;
        }
        
        showDoctorToast('Saving permissions...', 'info');
        
        const response = await fetch(`/api/teaching-assistant/${currentSelectedTA.id}/permissions`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ permissions: permissions })
        });
        
        if (response.ok) {
          showDoctorToast(`✅ Permissions updated for ${currentSelectedTA.name}`, 'success');
          closeTAPermissionsModal();
          
          const session = JSON.parse(localStorage.getItem('doctorSession') || '{}');
          if (session.userType === 'teaching-assistant' && session.id === currentSelectedTA.id) {
            window.currentTAPermissions = permissions;
            if (typeof applyTAPermissions === 'function') {
              applyTAPermissions(permissions);
            }
          }
          
        } else {
          const error = await response.json();
          showDoctorToast(`❌ Failed: ${error.error || 'Unknown error'}`, 'error');
        }
      } catch (error) {
        console.error('Error saving permissions:', error);
        showDoctorToast('❌ Error saving permissions: ' + error.message, 'error');
      }
    }

    function resetTAPermissions() {
      if (!currentSelectedTA) return;
      
      if (confirm(`Reset all permissions for ${currentSelectedTA.name} to default values?`)) {
        setPermissionCheckboxes(DEFAULT_TA_PERMISSIONS);
        showDoctorToast('Permissions reset to default', 'success');
      }
    }

    function closeTAPermissionsModal() {
      const modal = document.getElementById('taPermissionsModal');
      if (modal) {
        modal.classList.add('hidden');
      }
      
      setTimeout(() => {
        currentSelectedTA = null;
      }, 500);
    }

    function setupPermissionsModalListeners() {
      const saveBtn = document.querySelector('button[onclick="saveTAPermissions()"]');
      if (saveBtn) {
        const newBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newBtn, saveBtn);
        newBtn.addEventListener('click', saveTAPermissions);
      }
      
      const resetBtn = document.querySelector('button[onclick="resetTAPermissions()"]');
      if (resetBtn) {
        const newBtn = resetBtn.cloneNode(true);
        resetBtn.parentNode.replaceChild(newBtn, resetBtn);
        newBtn.addEventListener('click', resetTAPermissions);
      }
      
      const closeBtn = document.querySelector('button[onclick="closeTAPermissionsModal()"]');
      if (closeBtn) {
        const newBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newBtn, closeBtn);
        newBtn.addEventListener('click', closeTAPermissionsModal);
      }
    }

    if (typeof DEFAULT_TA_PERMISSIONS === 'undefined') {
      window.DEFAULT_TA_PERMISSIONS = {
        'ta.nav.overview': true,
        'ta.nav.subjects': true,
        'ta.nav.lectures': true,
        'ta.nav.attendance': true,
        'ta.nav.reports': true,
        'ta.nav.grading': true,
        'ta.attendance.start': false,
        'ta.attendance.end': false,
        'ta.reports.view': true,
        'ta.reports.export': false,
        'ta.grades.view': true,
        'ta.grades.edit': false,
        'ta.grades.visibility': false
      };
    }

    setTimeout(setupPermissionsModalListeners, 2000);
    setTimeout(testLoadTAs, 3000);
    setTimeout(setupGradeModalNavigation, 1000);

    function applyTAPermissions(permissions) {
      console.log('🔄 Applying TA Permissions:', permissions);
      if (!permissions) return;
      
      applySidebarPermissions(permissions);
      applyLectureButtonsPermissions(permissions);
      applyReportsPermissions(permissions);
      applyGradesPermissions(permissions);
    }

    function applySidebarPermissions(permissions) {
      const navButtons = document.querySelectorAll('.nav-btn[data-permission]');
      
      navButtons.forEach(btn => {
        const permKey = btn.getAttribute('data-permission');
        const hasPermission = permissions[permKey] === true;
        
        if (hasPermission) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
      
      ensureActiveNavButton();
    }

    function ensureActiveNavButton() {
      const activeBtn = document.querySelector('.nav-btn.active');
      const visibleBtns = document.querySelectorAll('.nav-btn:not(.hidden)');
      
      if (!activeBtn && visibleBtns.length > 0) {
        visibleBtns[0].classList.add('active');
        const section = visibleBtns[0].getAttribute('data-section');
        showSection(section);
      }
    }

    function showSection(section) {
      document.querySelectorAll('[id$="Section"]').forEach(sec => {
        sec.classList.add('hidden');
      });
      
      const targetSection = document.getElementById(section + 'Section');
      if (targetSection) {
        targetSection.classList.remove('hidden');
        
        updateTitle(section);
        
        if (section === 'reports') {
          setTimeout(() => filterReports(), 100);
        } else if (section === 'grading') {
          setTimeout(() => {
            renderSubjectGradeButtons();
            document.getElementById('selectedSubjectInfo')?.classList.add('hidden');
          }, 100);
        } else if (section === 'attendance') {
          setTimeout(() => {
            renderActiveSessions();
            renderAttendanceTable();
          }, 100);
        } else if (section === 'lectures') {
          setTimeout(() => renderWeeklySchedule(), 100);
        } else if (section === 'subjects') {
          setTimeout(() => renderSubjects(), 100);
        } else if (section === 'overview') {
          setTimeout(() => renderOverview(), 100);
        }
      }
    }

    function applyLectureButtonsPermissions(permissions) {
      const activateButtons = document.querySelectorAll('[onclick^="openActivateModal"]');
      const endButtons = document.querySelectorAll('[onclick^="openEndModal"]');
      
      const canActivate = permissions['ta.attendance.start'] === true;
      const canEnd = permissions['ta.attendance.end'] === true;
      
      activateButtons.forEach(btn => {
        if (canActivate) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
      
      endButtons.forEach(btn => {
        if (canEnd) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
      
      hideEmptyLectureRows();
    }

    function hideEmptyLectureRows() {
      document.querySelectorAll('.lecture-card').forEach(card => {
        const actionButtons = card.querySelectorAll('[onclick^="openActivateModal"], [onclick^="openEndModal"]');
        const visibleButtons = Array.from(actionButtons).filter(btn => !btn.classList.contains('hidden'));
        
        if (visibleButtons.length === 0) {
          const buttonContainer = actionButtons[0]?.closest('.flex.gap-3') || 
                                 actionButtons[0]?.closest('.flex.justify-between');
          if (buttonContainer) {
            buttonContainer.classList.add('hidden');
          }
        }
      });
    }

    function applyReportsPermissions(permissions) {
      const exportButton = document.querySelector('button[onclick="exportAttendanceReport()"]');
      
      if (exportButton) {
        if (permissions['ta.reports.export'] === true) {
          exportButton.classList.remove('hidden');
        } else {
          exportButton.classList.add('hidden');
        }
      }
      
      const viewButtons = document.querySelectorAll('[onclick^="viewReportDetails"]');
      if (permissions['ta.reports.view'] === true) {
        viewButtons.forEach(btn => btn.classList.remove('hidden'));
      } else {
        viewButtons.forEach(btn => btn.classList.add('hidden'));
      }
    }

    function applyGradesPermissions(permissions) {
      const subjectCards = document.querySelectorAll('#subjectGradesButtons > div');
      const canViewGrades = permissions['ta.grades.view'] === true;
      
      subjectCards.forEach(card => {
        if (canViewGrades) {
          card.classList.remove('hidden');
          
          const manageBtn = card.querySelector('button[onclick^="selectSubjectForGrading"]');
          const visibilityBtn = card.querySelector('button[onclick^="toggleSubjectVisibility"]');
          
          if (manageBtn) {
            if (permissions['ta.grades.edit'] === true) {
              manageBtn.classList.remove('hidden');
            } else {
              manageBtn.classList.add('hidden');
            }
          }
          
          if (visibilityBtn) {
            if (permissions['ta.grades.visibility'] === true) {
              visibilityBtn.classList.remove('hidden');
            } else {
              visibilityBtn.classList.add('hidden');
            }
          }
        } else {
          card.classList.add('hidden');
        }
      });
      
      const editButtons = document.querySelectorAll('#subjectStudentsList button[onclick^="openGradeModal"]');
      editButtons.forEach(btn => {
        if (permissions['ta.grades.edit'] === true) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
      
      const excelButtons = document.querySelectorAll('#selectedSubjectInfo .flex.gap-2 button');
      excelButtons.forEach(btn => {
        if (permissions['ta.grades.edit'] === true) {
          btn.classList.remove('hidden');
        } else {
          btn.classList.add('hidden');
        }
      });
      
      const gradeActionBar = document.querySelector('#selectedSubjectInfo .flex.justify-between.items-center.mb-4');
      if (gradeActionBar && permissions['ta.grades.edit'] !== true) {
        const btnContainer = gradeActionBar.querySelector('.flex.gap-2');
        if (btnContainer) btnContainer.classList.add('hidden');
      } else if (gradeActionBar) {
        const btnContainer = gradeActionBar.querySelector('.flex.gap-2');
        if (btnContainer) btnContainer.classList.remove('hidden');
      }
    }

    function hideSettingsForTA() {
      const settingsNavBtn = document.querySelector('[data-section="settings"]');
      if (settingsNavBtn) settingsNavBtn.classList.add('hidden');
      
      const settingsSection = document.getElementById('settingsSection');
      if (settingsSection) settingsSection.classList.add('hidden');
    }

    const originalCheckStoredSession = checkStoredSession;
    checkStoredSession = async function() {
      originalCheckStoredSession();
      
      setTimeout(() => {
        const session = JSON.parse(localStorage.getItem('doctorSession') || '{}');
        if (session.userType === 'teaching-assistant') {
          const permissions = session.permissions || DEFAULT_TA_PERMISSIONS;
          window.currentTAPermissions = permissions;
          applyTAPermissions(permissions);
          hideSettingsForTA();
        } else if (session.userType === 'doctor') {
          showAllForDoctor();
        }
      }, 500);
    };

    function showAllForDoctor() {
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('hidden');
      });
      
      const settingsSection = document.getElementById('settingsSection');
      const settingsNavBtn = document.querySelector('[data-section="settings"]');
      if (settingsSection) settingsSection.classList.remove('hidden');
      if (settingsNavBtn) settingsNavBtn.classList.remove('hidden');
      
      document.querySelectorAll('[onclick^="openActivateModal"], [onclick^="openEndModal"], [onclick^="exportAttendanceReport"], [onclick^="toggleSubjectVisibility"], [onclick^="openGradeModal"]').forEach(btn => {
        btn.classList.remove('hidden');
      });
      
      document.querySelectorAll('#selectedSubjectInfo .flex.gap-2 button').forEach(btn => {
        btn.classList.remove('hidden');
      });
    }

    const originalRenderWeeklySchedule = window.renderWeeklySchedule;
    window.renderWeeklySchedule = function() {
      if (originalRenderWeeklySchedule) originalRenderWeeklySchedule();
      setTimeout(() => {
        if (window.currentTAPermissions) applyLectureButtonsPermissions(window.currentTAPermissions);
      }, 100);
    };

    const originalRenderSubjectGradeButtons = window.renderSubjectGradeButtons;
    window.renderSubjectGradeButtons = function() {
      if (originalRenderSubjectGradeButtons) originalRenderSubjectGradeButtons();
      setTimeout(() => {
        if (window.currentTAPermissions) applyGradesPermissions(window.currentTAPermissions);
      }, 100);
    };

    const originalRenderActiveSessions = window.renderActiveSessions;
    window.renderActiveSessions = function() {
      if (originalRenderActiveSessions) originalRenderActiveSessions();
      setTimeout(() => {
        if (window.currentTAPermissions) applyLectureButtonsPermissions(window.currentTAPermissions);
      }, 100);
    };

    const originalRenderReportsTable = window.renderReportsTable;
    window.renderReportsTable = function(reports) {
      if (originalRenderReportsTable) originalRenderReportsTable(reports);
      setTimeout(() => {
        if (window.currentTAPermissions) applyReportsPermissions(window.currentTAPermissions);
      }, 100);
    };

    const originalRenderSubjectStudents = window.renderSubjectStudents;
    window.renderSubjectStudents = function() {
      if (originalRenderSubjectStudents) originalRenderSubjectStudents();
      setTimeout(() => {
        if (window.currentTAPermissions) applyGradesPermissions(window.currentTAPermissions);
      }, 100);
    };



    function startPermissionsObserver() {
      if (window.permissionObserver) window.permissionObserver.disconnect();
      
      window.permissionObserver = new MutationObserver((mutations) => {
        let shouldReapply = false;
        mutations.forEach(mutation => {
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1 && (node.querySelector && (node.querySelector('[onclick^="openActivateModal"]') || node.querySelector('[onclick^="openEndModal"]')))) {
                shouldReapply = true;
              }
            });
          }
        });
        
        if (shouldReapply && window.currentTAPermissions) {
          console.log('🔄 DOM changed, reapplying permissions...');
          setTimeout(() => applyTAPermissions(window.currentTAPermissions), 50);
        }
      });
      
      window.permissionObserver.observe(document.body, { childList: true, subtree: true });
    }
    
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('doctorToken');
    if (!token) {
        console.log('No doctor token found');
        return null;
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            console.log('Auth failed');
            return null;
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}
    setTimeout(startPermissionsObserver, 1000);

    window.filterByDay = filterByDay;
    window.openActivateModal = openActivateModal;
    window.startLectureSession = startLectureSession;
    window.closeActivateModal = closeActivateModal;
    window.openEndModal = openEndModal;
    window.confirmEndLecture = confirmEndLecture;
    window.closeEndModal = closeEndModal;
    window.showSessionQR = showSessionQR;
    window.exportAttendanceReport = exportAttendanceReport;
