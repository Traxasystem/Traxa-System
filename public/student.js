        // ============================================
        // STUDENT MANAGEMENT SYSTEM (FULLY INTACT)
        // ============================================

        const DB_URL = '/api';
        const DB_FILES = '/database';

        // Global state
        let currentStudent = null;
        let studentCredentials = [];

        // Data collections
        let students = [];
        let subjects = [];
        let lectures = [];
        let grades = [];
        let attendanceRecords = [];
        let doctors = [];

        // Department color mapping
        const departmentColors = {
            'Computer Science': 'cs',
            'Information Systems': 'is',
            'Cyber Security': 'cyber',
            'Software Engineering': 'se',
            'Artificial Intelligence': 'ai',
            'Bioinformatics': 'bio',
            'General': 'cs'
        };

        // ============================================
        // INITIALIZATION
        // ============================================
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Student Portal - Loading your data...');
            loadAllData();
            setupUI();
            checkStoredSession();

            // Mobile menu toggle
            const menuToggle = document.getElementById('mobileMenuToggle');
            const sidebar = document.querySelector('.sidebar');
            
            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('open');
                });
            }

            // Password collapse panel logic (من students2.html)
            const header = document.getElementById('togglePasswordPanel');
            const content = document.getElementById('passwordCollapseContent');
            const arrow = document.getElementById('collapseArrow');

            if (header && content) {
                header.addEventListener('click', function(e) {
                    e.preventDefault();
                    header.classList.toggle('open');

                    if (content.classList.contains('open')) {
                        content.style.maxHeight = content.scrollHeight + 'px';
                        requestAnimationFrame(() => {
                            content.style.maxHeight = '0px';
                        });
                        content.classList.remove('open');
                    } else {
                        content.classList.add('open');
                        content.style.maxHeight = content.scrollHeight + 'px';
                        const onTransitionEnd = () => {
                            content.style.maxHeight = 'none';
                            content.removeEventListener('transitionend', onTransitionEnd);
                        };
                        content.addEventListener('transitionend', onTransitionEnd, {
                            once: true
                        });
                    }

                    if (arrow) {
                        arrow.style.transform = header.classList.contains('open') ? 'rotate(90deg)' : 'rotate(0deg)';
                    }
                });
            }
        });

        // ============================================
        // LOAD ALL DATA
        // ============================================
        async function loadAllData() {
            console.log('📂 Loading student portal data...');

            await Promise.all([
                loadStudents(),
                loadSubjects(),
                loadLectures(),
                loadDoctors(),
                loadStudentCredentials()
            ]);

            console.log('✅ All data loaded');
            console.log('   - Students: ' + students.length);
            console.log('   - Subjects: ' + subjects.length);
            console.log('   - Lectures: ' + lectures.length);
            console.log('   - Doctors: ' + doctors.length);
            console.log('   - Student Credentials: ' + studentCredentials.length);

            grades = [];
            attendanceRecords = [];
        }

        async function loadStudents() {
            try {
                const response = await fetch(DB_FILES + '/students.json');
                if (response.ok) {
                    students = await response.json();
                    console.log('✅ Loaded ' + students.length + ' students');
                } else {
                    console.warn('⚠️ Could not load students.json');
                    students = [];
                }
            } catch (error) {
                console.error('Error loading students:', error);
                students = [];
            }
        }

        async function loadSubjects() {
            try {
                const response = await fetch(DB_FILES + '/subjects.json');
                if (response.ok) {
                    subjects = await response.json();
                }
            } catch (error) {
                subjects = [];
            }
        }

        async function loadLectures() {
            try {
                const response = await fetch(DB_FILES + '/lectures.json');
                if (response.ok) {
                    lectures = await response.json();
                }
            } catch (error) {
                lectures = [];
            }
        }

        async function loadGrades() {
            if (!currentStudent) return;

            try {
                console.log('🔍 Loading visible grades for student ID: ' + currentStudent.id);

                const response = await fetch('/api/grades/student/' + currentStudent.id + '/visible');

                if (response.ok) {
                    grades = await response.json();
                    console.log('✅ Loaded ' + grades.length + ' visible grades for student ' + currentStudent.name);

                    var activeSectionElement = document.querySelector('.nav-btn.active');
                    var activeSection = activeSectionElement ? activeSectionElement.dataset.section : '';
                    if (activeSection === 'grades') {
                        renderGrades();
                    }

                    renderOverview();

                } else {
                    console.warn('⚠️ Failed to load grades, status: ' + response.status);
                    await debugStudentGrades();
                    grades = [];
                }
            } catch (error) {
                console.error('❌ Error loading grades:', error);
                grades = [];
            }
        }

        async function debugStudentGrades() {
            if (!currentStudent) return;

            try {
                console.log('🔧 Debugging grades for student ' + currentStudent.id + '...');

                var response = await fetch('/api/grades/student/' + currentStudent.id + '/debug');

                if (response.ok) {
                    var debug = await response.json();
                    console.log('📊 Debug info:', debug);

                    if (debug.totalGrades > 0) {
                        console.log('⚠️ Found ' + debug.totalGrades + ' total grades:');
                        debug.grades.forEach(function(g) {
                            var status = g.isVisible ? '✅ VISIBLE' : '❌ HIDDEN';
                            console.log('   ' + status + ' - ' + g.subject + ': Total=' + g.total);
                        });

                        if (debug.visibleGrades === 0) {
                            console.log('ℹ️ No visible grades. Ask your doctor to make grades visible.');
                        }
                    } else {
                        console.log('ℹ️ No grades found for this student.');
                    }
                }
            } catch (error) {
                console.error('Error debugging grades:', error);
            }
        }

        window.checkMyGrades = async function() {
            if (!currentStudent) {
                showToast('Please login first', 'error');
                return;
            }

            showToast('Checking grades...', 'info');

            try {
                var debugResponse = await fetch('/api/grades/student/' + currentStudent.id + '/debug');

                if (debugResponse.ok) {
                    var debug = await debugResponse.json();

                    var message = '📊 <strong>Grades Status for Student ' + currentStudent.id + '</strong><br><br>';
                    message += '📝 Total Grades: ' + debug.totalGrades + '<br>';
                    message += '👁️ Visible Grades: ' + debug.visibleGrades + '<br>';
                    message += '🙈 Hidden Grades: ' + debug.hiddenGrades + '<br><br>';

                    if (debug.grades.length > 0) {
                        message += '<strong>Grade Details:</strong><br>';
                        debug.grades.forEach(function(g) {
                            var icon = g.isVisible ? '✅' : '❌';
                            message += icon + ' ' + g.subject + ': ' + g.total + '/50<br>';
                        });
                    } else {
                        message += 'No grades found for this student.';
                    }

                    showToast(message, 'info');
                } else {
                    var gradesResponse = await fetch('/api/grades/student/' + currentStudent.id + '/visible');

                    if (gradesResponse.ok) {
                        var visibleGrades = await gradesResponse.json();
                        showToast('Found ' + visibleGrades.length + ' visible grades', 'success');
                    } else {
                        showToast('Could not fetch grades', 'error');
                    }
                }
            } catch (error) {
                console.error('Error checking grades:', error);
                showToast('Error checking grades', 'error');
            }
        };

        async function loadDoctors() {
            try {
                var response = await fetch(DB_FILES + '/doctors.json');
                if (response.ok) {
                    doctors = await response.json();
                }
            } catch (error) {
                doctors = [];
            }
        }

        function loadStudentCredentials() {
            var stored = localStorage.getItem('studentCredentials');
            studentCredentials = stored ? JSON.parse(stored) : [];
            console.log('📝 Loaded ' + studentCredentials.length + ' student credentials from localStorage');
        }

        function saveStudentCredentials() {
            localStorage.setItem('studentCredentials', JSON.stringify(studentCredentials));
            console.log('💾 Saved ' + studentCredentials.length + ' student credentials to localStorage');
        }

        // ============================================
        // STUDENT LOGIN
        // ============================================
// ============================================
// STUDENT LOGIN - MODIFIED TO USE USERNAME/PASSWORD
// ============================================

async function handleStudentLogin(e) {
  e.preventDefault();
  var studentIdElement = document.getElementById('studentIdLogin');
  var passwordElement = document.getElementById('studentPasswordLogin');

  var studentId = studentIdElement ? studentIdElement.value.trim() : '';
  var password = passwordElement ? passwordElement.value : '';

  if (!studentId || !password) {
    showToast('Please enter Student ID and password', 'error');
    return;
  }

  document.getElementById('studentLoginLoading').classList.remove('hidden');

  var existingMessage = document.querySelector('.login-message');
  if (existingMessage) existingMessage.remove();

  try {
    // نرسل username و password (username هو student_id)
    var response = await fetch('/api/student/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: studentId,     // تم التعديل هنا: نرسل username بدلاً من student_id
        password: password,
        isFirstLogin: false
      })
    });

    var data = await response.json();

    if (response.ok) {
      currentStudent = data.student;

      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentSession', JSON.stringify({
        id: data.student.id,
        student_id: data.student.student_id,
        name: data.student.name,
        loginTime: new Date().toISOString()
      }));

      document.getElementById('studentLoginScreen').classList.add('hidden');
      document.getElementById('studentDashboard').classList.remove('hidden');

      updateStudentInfo();

      await loadGrades();

      renderAllSections();

      // التحقق مما إذا كانت كلمة المرور لا تزال افتراضية
      if (data.isDefaultPassword) {
        showToast('⚠️ You are using the default password. Please change it in Profile Settings.', 'warning');
        
        // توجيه الطالب إلى صفحة تغيير كلمة المرور
        setTimeout(() => {
          const profileBtn = document.querySelector('[data-section="profile"]');
          if (profileBtn) {
            profileBtn.click();
          }
        }, 2000);
      }

      showToast('Welcome, ' + data.student.name + '!', 'success');

    } else if (data.isFirstLogin) {
      // إذا كان هذا أول تسجيل دخول، نرسل isFirstLogin = true
      await handleFirstLogin(studentId, password);
    } else {
      showToast(data.error || 'Login failed', 'error');
    }

  } catch (error) {
    console.error('Login error:', error);
    showToast('Server connection error', 'error');
  } finally {
    document.getElementById('studentLoginLoading').classList.add('hidden');
  }
}

// دالة منفصلة للتعامل مع أول تسجيل دخول
async function handleFirstLogin(studentId, password) {
  // محاولة تسجيل الدخول مع isFirstLogin = true
  try {
    var response = await fetch('/api/student/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: studentId,
        password: password,
        isFirstLogin: true
      })
    });

    var data = await response.json();

    if (response.ok) {
      currentStudent = data.student;

      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentSession', JSON.stringify({
        id: data.student.id,
        student_id: data.student.student_id,
        name: data.student.name,
        loginTime: new Date().toISOString()
      }));

      document.getElementById('studentLoginScreen').classList.add('hidden');
      document.getElementById('studentDashboard').classList.remove('hidden');

      updateStudentInfo();
      await loadGrades();
      renderAllSections();

      showToast('Account created! Welcome, ' + data.student.name + '!', 'success');
    } else {
      showToast(data.error || 'Failed to create account', 'error');
    }
  } catch (error) {
    console.error('First login error:', error);
    showToast('Server connection error', 'error');
  }
}


        function showFirstLoginConfirmation(studentId, password) {
            var existingMessage = document.querySelector('.login-message');
            if (existingMessage) existingMessage.remove();

            var messageDiv = document.createElement('div');
            messageDiv.className = 'login-message mt-6 p-4 bg-purple-900/30 rounded-xl border border-purple-500/30';
            messageDiv.innerHTML =
                '<div class="flex items-start gap-3">' +
                '<i class="fas fa-info-circle text-purple-400 text-xl mt-1"></i>' +
                '<div>' +
                '<p class="text-purple-400 font-bold mb-2">First Time Login</p>' +
                '<p class="text-sm text-gray-300 mb-3">This is your first time logging in. Would you like to create an account with password: <span class="font-mono bg-purple-800/50 px-2 py-1 rounded">' + password + '</span>?</p>' +
                '<div class="flex gap-3">' +
                '<button onclick="confirmFirstLogin(\'' + studentId + '\', \'' + password + '\')" class="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg text-sm font-semibold">' +
                '<i class="fas fa-check mr-1"></i> Yes, Create Account' +
                '</button>' +
                '<button onclick="this.closest(\'.login-message\').remove()" class="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold">' +
                '<i class="fas fa-times mr-1"></i> Cancel' +
                '</button>' +
                '</div>' +
                '</div>' +
                '</div>';

            var loginForm = document.getElementById('studentLoginForm');
            loginForm.parentNode.insertBefore(messageDiv, loginForm.nextSibling);
        }


        async function confirmFirstLogin(studentId, password) {
  document.getElementById('studentLoginLoading').classList.remove('hidden');

  var messageDiv = document.querySelector('.login-message');
  if (messageDiv) messageDiv.remove();

  try {
    var response = await fetch('/api/student/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: studentId,     // تم التعديل هنا أيضاً
        password: password,
        isFirstLogin: true
      })
    });

    var data = await response.json();

    if (response.ok) {
      currentStudent = data.student;

      localStorage.setItem('studentToken', data.token);
      localStorage.setItem('studentSession', JSON.stringify({
        id: data.student.id,
        student_id: data.student.student_id,
        name: data.student.name,
        loginTime: new Date().toISOString()
      }));

      document.getElementById('studentLoginScreen').classList.add('hidden');
      document.getElementById('studentDashboard').classList.remove('hidden');

      updateStudentInfo();
      await loadGrades();
      renderAllSections();

      showToast('Account created! Welcome, ' + data.student.name + '!', 'success');
    } else {
      showToast(data.error || 'Failed to create account', 'error');
    }
  } catch (error) {
    console.error('Account creation error:', error);
    showToast('Server connection error', 'error');
  } finally {
    document.getElementById('studentLoginLoading').classList.add('hidden');
  }
}



        function updateStudentInfo() {
            if (!currentStudent) return;

            document.getElementById('studentName').textContent = currentStudent.name;
            document.getElementById('studentId').innerHTML = '<i class="fas fa-id-card mr-1"></i> ' + currentStudent.student_id;

            var levelText = 'Level ' + (currentStudent.level || 1);
            var deptText = currentStudent.department || 'N/A';
            document.getElementById('studentLevelDept').innerHTML = '<i class="fas fa-layer-group mr-1"></i> ' + levelText + ' • <i class="fas fa-building ml-1 mr-1"></i> ' + deptText;

            document.getElementById('profileStudentId').value = currentStudent.student_id;
            document.getElementById('profileName').value = currentStudent.name;
            document.getElementById('profileLevel').value = 'Level ' + (currentStudent.level || 1);
            document.getElementById('profileDepartment').value = currentStudent.department || 'N/A';

            const dispId = document.getElementById('profileDisplayStudentId');
            const dispName = document.getElementById('profileDisplayFullName');
            const dispLevel = document.getElementById('profileDisplayLevel');
            const dispDept = document.getElementById('profileDisplayDept');
            const avatarInitial = document.getElementById('profileAvatarInitial');
            const fullNameDisplay = document.getElementById('profileFullNameDisplay');

            if (dispId) dispId.innerText = currentStudent.student_id;
            if (dispName) dispName.innerText = currentStudent.name;
            if (dispLevel) dispLevel.innerText = 'Level ' + (currentStudent.level || 1);
            if (dispDept) dispDept.innerText = currentStudent.department || 'N/A';
            avatarInitial.innerText = ((currentStudent && currentStudent.name ? currentStudent.name.charAt(0) : 'S')).toUpperCase();
            if (fullNameDisplay) fullNameDisplay.innerText = currentStudent.name;

            var deptColor = departmentColors[currentStudent.department] || 'cs';
            document.getElementById('overviewSubjectsCard').className = 'stat-card ' + deptColor;
            document.getElementById('overviewLecturesCard').className = 'stat-card ' + deptColor;
            document.getElementById('overviewAttendanceCard').className = 'stat-card ' + deptColor;
            document.getElementById('overviewGPACard').className = 'stat-card ' + deptColor;
        }

        function generateStudentToken(student) {
            var tokenData = {
                id: student.id,
                student_id: student.student_id,
                username: student.student_id,
                role: 'student',
                iat: Date.now(),
                exp: Date.now() + 8 * 60 * 60 * 1000
            };
            return btoa(JSON.stringify(tokenData));
        }

        function checkStoredSession() {
            var stored = localStorage.getItem('studentSession');
            var token = localStorage.getItem('studentToken');

            if (stored && token) {
                try {
                    var session = JSON.parse(stored);

                    var tokenData = JSON.parse(atob(token));
                    var now = Date.now();

                    if (tokenData.exp && tokenData.exp < now) {
                        console.log('Token expired');
                        localStorage.removeItem('studentSession');
                        localStorage.removeItem('studentToken');
                        return;
                    }

                    var student = null;
                    for (var i = 0; i < students.length; i++) {
                        if (students[i].id === session.id) {
                            student = students[i];
                            break;
                        }
                    }

                    if (student) {
                        currentStudent = student;

                        document.getElementById('studentLoginScreen').classList.add('hidden');
                        document.getElementById('studentDashboard').classList.remove('hidden');

                        updateStudentInfo();

                        loadGrades().then(function() {
                            renderAllSections();
                            showToast('Welcome back, ' + student.name + '!', 'success');
                        });
                    } else {
                        localStorage.removeItem('studentSession');
                        localStorage.removeItem('studentToken');
                    }
                } catch (e) {
                    console.error('Error parsing session:', e);
                    localStorage.removeItem('studentSession');
                    localStorage.removeItem('studentToken');
                }
            }
        }

// ============================================
// PASSWORD UPDATE FUNCTIONALITY - نسخة محسنة
// ============================================
async function handlePasswordUpdate(e) {
    e.preventDefault();

    if (!currentStudent) {
        showToast('No student logged in', 'error');
        return;
    }

    var currentPwd = document.getElementById('currentPassword').value;
    var newPwd = document.getElementById('newPassword').value;
    var confirmPwd = document.getElementById('confirmPassword').value;
    
    var errorDiv = document.getElementById('passwordError');
    var successDiv = document.getElementById('passwordSuccess');
    
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    // التحقق من المدخلات
    if (!currentPwd || !newPwd || !confirmPwd) {
        errorDiv.textContent = 'Please fill all password fields';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (newPwd !== confirmPwd) {
        errorDiv.textContent = 'New passwords do not match';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (newPwd.length < 4) {
        errorDiv.textContent = 'Password must be at least 4 characters';
        errorDiv.classList.remove('hidden');
        return;
    }

    // إظهار مؤشر التحميل
    var submitBtn = e.target.querySelector('button[type="submit"]');
    var originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Updating...';
    submitBtn.disabled = true;

    try {
        console.log('📤 Sending password update request to server...');
        console.log('Student ID:', currentStudent.student_id);
        console.log('New Password:', newPwd);
        
        // الحصول على التوكن من localStorage
        const token = localStorage.getItem('studentToken');
        
        if (!token) {
            throw new Error('No authentication token found');
        }

        // إرسال طلب تحديث كلمة المرور إلى السيرفر
        const response = await fetch('/api/student/change-password', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                student_id: currentStudent.student_id,
                newPassword: newPwd
            })
        });

        const data = await response.json();
        console.log('📥 Server response:', data);

        if (response.ok) {
            // تحديث localStorage القديم كنسخة احتياطية
            var stored = localStorage.getItem('studentCredentials');
            var studentCredentials = stored ? JSON.parse(stored) : [];
            
            var credentialIndex = -1;
            for (var i = 0; i < studentCredentials.length; i++) {
                if (studentCredentials[i].student_id === currentStudent.student_id) {
                    credentialIndex = i;
                    break;
                }
            }

            if (credentialIndex === -1) {
                var newCredential = {
                    id: studentCredentials.length + 1,
                    student_id: currentStudent.student_id,
                    password: newPwd,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_default_password: false
                };
                studentCredentials.push(newCredential);
            } else {
                studentCredentials[credentialIndex].password = newPwd;
                studentCredentials[credentialIndex].updated_at = new Date().toISOString();
                studentCredentials[credentialIndex].is_default_password = false;
            }
            
            localStorage.setItem('studentCredentials', JSON.stringify(studentCredentials));

            // إعادة تعيين الحقول
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';

            // إغلاق لوحة تغيير كلمة المرور
            const header = document.getElementById('togglePasswordPanel');
            const content = document.getElementById('passwordCollapseContent');
            const arrow = document.getElementById('collapseArrow');
            
            if (header && content) {
                header.classList.remove('open');
                content.classList.remove('open');
                content.style.maxHeight = '0px';
                if (arrow) {
                    arrow.style.transform = 'rotate(0deg)';
                }
            }

            successDiv.textContent = '✅ Password updated successfully!';
            successDiv.classList.remove('hidden');
            showToast('Password updated successfully!', 'success');
            
            console.log('✅ Password updated on server for student:', currentStudent.student_id);
            
            // ===== إرسال إشعار لصفحة الـ Admin =====
            try {
    console.log('📢 Sending update notification...');
    
    // محاولة إرسال الإشعار بدون Authentication (لأنه إشعار عام)
    const notifyResponse = await fetch('/api/student-login/notify-update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
            // ملاحظة: مش بنرسل Authorization هنا عشان الإشعار عام
        },
        body: JSON.stringify({
            student_id: currentStudent.student_id
        })
    });
    
    if (notifyResponse.ok) {
        console.log('📢 Update notification sent successfully');
    } else {
        console.warn('⚠️ Notification sent but server returned:', notifyResponse.status);
    }
} catch (notifyError) {
    console.error('Error sending notification:', notifyError);
    // مش هنوقف العملية لو فشل الإشعار
}
            // ===== نهاية إرسال الإشعار =====
            
        } else {
            errorDiv.textContent = data.error || 'Failed to update password';
            errorDiv.classList.remove('hidden');
            showToast(data.error || 'Failed to update password', 'error');
            console.error('Server error:', data);
        }
    } catch (error) {
        console.error('Error updating password:', error);
        errorDiv.textContent = error.message || 'Server connection error';
        errorDiv.classList.remove('hidden');
        showToast(error.message || 'Server connection error', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


        function togglePassword(inputId) {
            var input = document.getElementById(inputId);
            var button = input.nextElementSibling;
            var icon = button.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }

        function setupUI() {
            document.getElementById('studentLoginForm').addEventListener('submit', handleStudentLogin);
            document.getElementById('studentLogout').addEventListener('click', studentLogout);

            var profileForm = document.getElementById('studentProfileForm');
            if (profileForm) {
                if (profileForm.hasAttribute('data-listener')) {
                    profileForm.removeEventListener('submit', handlePasswordUpdate);
                }
                profileForm.addEventListener('submit', handlePasswordUpdate);
                profileForm.setAttribute('data-listener', 'true');
            }

            setupNavigation();

            updateDateTime();
            setInterval(updateDateTime, 1000);
        }

        function setupNavigation() {
            var navButtons = document.querySelectorAll('.nav-btn');

            for (var i = 0; i < navButtons.length; i++) {
                navButtons[i].addEventListener('click', function(e) {
                    var btn = e.currentTarget;

                    for (var j = 0; j < navButtons.length; j++) {
                        navButtons[j].classList.remove('active', 'bg-white/20');
                    }
                    btn.classList.add('active', 'bg-white/20');

                    var sections = ['overviewSection', 'gradesSection', 'attendanceSection', 'lecturesSection', 'subjectsSection', 'profileSection'];
                    for (var k = 0; k < sections.length; k++) {
                        var section = document.getElementById(sections[k]);
                        if (section) section.classList.add('hidden');
                    }

                    var target = document.getElementById(btn.dataset.section + 'Section');
                    if (target) target.classList.remove('hidden');

                    updateSectionTitle(btn.dataset.section);
                });
            }
        }

        function updateSectionTitle(section) {
            var titles = {
                overview: 'Dashboard',
                grades: 'My Grades',
                attendance: 'Attendance Records',
                lectures: 'My Weekly Lecture Schedule',
                subjects: 'My Subjects',
                profile: 'Profile Settings'
            };
            document.getElementById('studentSectionTitle').textContent = titles[section] || 'Dashboard';
        }

        function updateDateTime() {
            var now = new Date();
            var formatted = now.toLocaleString('en-US', {
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

        function showToast(message, type) {
            if (type === undefined) type = 'success';

            var toast = document.getElementById('toast');
            var msg = document.getElementById('toastMessage');
            var icon = document.getElementById('toastIcon');

            msg.innerHTML = message;

            if (type === 'success') icon.className = 'fas fa-check-circle text-green-400 text-2xl';
            else if (type === 'error') icon.className = 'fas fa-exclamation-circle text-red-400 text-2xl';
            else icon.className = 'fas fa-info-circle text-blue-400 text-2xl';

            toast.classList.remove('hidden');
            setTimeout(function() {
                toast.classList.add('hidden');
            }, 5000);
        }

        function renderAllSections() {
            if (!currentStudent) return;

            renderOverview();
            renderGrades();
            renderLectures();
            renderSubjects();
        }

        function renderOverview() {
            if (!currentStudent) return;

            var studentSubjects = subjects.filter(function(s) {
                return s.level === currentStudent.level && s.department === currentStudent.department;
            });

            var studentLectures = lectures.filter(function(l) {
                return l.level === currentStudent.level && l.department === currentStudent.department;
            });

            var studentGrades = grades.filter(function(g) {
                return g.student_id === currentStudent.id;
            });

            var studentAttendance = attendanceRecords.filter(function(a) {
                return a.student_id === currentStudent.id;
            });

            var totalLectures = studentLectures.length;
            var attendedLectures = studentAttendance.length;
            var attendanceRate = totalLectures > 0 ? Math.round((attendedLectures / totalLectures) * 100) : 0;

            var totalPoints = 0;
            var totalCreditsCount = 0;

            for (var i = 0; i < studentGrades.length; i++) {
                var grade = studentGrades[i];
                var subject = null;
                for (var j = 0; j < subjects.length; j++) {
                    if (subjects[j].id === grade.subject_id) {
                        subject = subjects[j];
                        break;
                    }
                }
                if (subject) {
                    totalPoints += grade.total * (subject.credits || 3);
                    totalCreditsCount += subject.credits || 3;
                }
            }

            var gpa = totalCreditsCount > 0 ? (totalPoints / totalCreditsCount / 10).toFixed(2) : 0;

            document.getElementById('overviewTotalSubjects').textContent = studentSubjects.length;
            document.getElementById('overviewTotalLectures').textContent = studentLectures.length;
            document.getElementById('overviewAttendanceRate').textContent = attendanceRate + '%';
            document.getElementById('overviewGPA').textContent = gpa;

            var todayName = getTodayDayName();
            var todaysLectures = studentLectures.filter(function(l) {
                return l.day === todayName;
            });

            var todaysContainer = document.getElementById('todaysLectures');
            if (todaysContainer) {
                if (todaysLectures.length === 0) {
                    todaysContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No lectures scheduled for today</p>';
                } else {
                    var todaysHtml = '';
                    for (var k = 0; k < todaysLectures.length; k++) {
                        var l = todaysLectures[k];
                        todaysHtml +=
                            '<div class="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">' +
                            '<div>' +
                            '<h4 class="font-bold text-lg">' + l.subject_name + '</h4>' +
                            '<p class="text-sm text-gray-400 mt-1">' +
                            '<i class="fas fa-clock mr-1"></i> ' + l.time_display +
                            '<i class="fas fa-map-marker-alt ml-3 mr-1"></i> ' + l.location_name +
                            '</p>' +
                            '</div>' +
                            '<span class="px-4 py-2 bg-purple-600 rounded-lg text-sm font-bold">Today</span>' +
                            '</div>';
                    }
                    todaysContainer.innerHTML = todaysHtml;
                }
            }

            var recentContainer = document.getElementById('recentGrades');

            if (grades.length === 0) {
                recentContainer.innerHTML = '<p class="text-gray-400 text-center py-8">No grades published yet</p>';
            } else {
                var sortedGrades = grades.slice().sort(function(a, b) {
                    return b.id - a.id;
                });
                var recentGradesList = sortedGrades.slice(0, 5);

                var recentHtml = '';
                for (var m = 0; m < recentGradesList.length; m++) {
                    var g = recentGradesList[m];
                    var subject = null;
                    for (var n = 0; n < subjects.length; n++) {
                        if (subjects[n].id === g.subject_id) {
                            subject = subjects[n];
                            break;
                        }
                    }

                    var gradeClass = g.total >= 45 ? 'grade-a' :
                        g.total >= 35 ? 'grade-b' :
                        g.total >= 25 ? 'grade-c' : 'grade-f';

                    recentHtml +=
                        '<div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">' +
                        '<div>' +
                        '<p class="font-medium">' + (subject ? subject.name : 'Unknown') + '</p>' +
                        '<p class="text-xs text-gray-400">' + g.total + ' / 50</p>' +
                        '</div>' +
                        '<span class="' + gradeClass + ' font-bold">' + g.total + '</span>' +
                        '</div>';
                }
                recentContainer.innerHTML = recentHtml;
            }
        }

        function renderGrades() {
            if (!currentStudent) return;

            var semesterFilterElement = document.getElementById('semesterFilter');
            var semesterFilter = semesterFilterElement ? semesterFilterElement.value : '1';

            console.log('Current visible grades:', grades);
            console.log('Current student ID:', currentStudent.id);

            var studentGrades = grades.filter(function(g) {
                return g.semester == semesterFilter;
            });

            console.log('Found ' + studentGrades.length + ' visible grades for semester ' + semesterFilter);

            var passed = 0;
            var failed = 0;
            for (var i = 0; i < studentGrades.length; i++) {
                if (studentGrades[i].total >= 25) {
                    passed++;
                } else {
                    failed++;
                }
            }

            var totalCreditsCount = 0;
            for (var j = 0; j < studentGrades.length; j++) {
                var g = studentGrades[j];
                var subject = null;
                for (var k = 0; k < subjects.length; k++) {
                    if (subjects[k].id === g.subject_id) {
                        subject = subjects[k];
                        break;
                    }
                }
                totalCreditsCount += (subject && subject.credits) ? subject.credits : 3;
            }

            var totalPoints = 0;
            for (var l = 0; l < studentGrades.length; l++) {
                var g = studentGrades[l];
                var subject = null;
                for (var m = 0; m < subjects.length; m++) {
                    if (subjects[m].id === g.subject_id) {
                        subject = subjects[m];
                        break;
                    }
                }
                totalPoints += g.total * ((subject && subject.credits) ? subject.credits : 3);
            }

            var gpa = totalCreditsCount > 0 ? (totalPoints / totalCreditsCount / 10).toFixed(2) : 0;

            document.getElementById('gpaSemester').textContent = gpa;
            document.getElementById('totalCredits').textContent = totalCreditsCount;
            document.getElementById('subjectsPassed').textContent = passed;
            document.getElementById('subjectsFailed').textContent = failed;

            var container = document.getElementById('gradesTable');

            if (studentGrades.length === 0) {
                container.innerHTML =
                    '<div class="text-center py-12">' +
                    '<i class="fas fa-graduation-cap text-6xl text-gray-600 mb-4"></i>' +
                    '<p class="text-2xl text-gray-400">No grades available yet</p>' +
                    '<p class="text-sm text-gray-500 mt-2">Your grades will appear here once your instructor publishes them</p>' +
                    '<button onclick="refreshGrades()" class="mt-4 px-4 py-2 bg-purple-600 rounded-lg text-sm">' +
                    '<i class="fas fa-sync-alt mr-2"></i>Refresh' +
                    '</button>' +
                    '</div>';
                return;
            }

            studentGrades.sort(function(a, b) {
                var subjectA = null;
                var subjectB = null;
                for (var n = 0; n < subjects.length; n++) {
                    if (subjects[n].id === a.subject_id) subjectA = subjects[n];
                    if (subjects[n].id === b.subject_id) subjectB = subjects[n];
                }
                var nameA = subjectA ? subjectA.name : '';
                var nameB = subjectB ? subjectB.name : '';
                return nameA.localeCompare(nameB);
            });

            var tableRows = '';
            for (var p = 0; p < studentGrades.length; p++) {
                var g = studentGrades[p];
                var subject = null;
                for (var q = 0; q < subjects.length; q++) {
                    if (subjects[q].id === g.subject_id) {
                        subject = subjects[q];
                        break;
                    }
                }
                var total = g.total;
                var gradeLetter = total >= 45 ? 'A' : total >= 40 ? 'B' : total >= 35 ? 'C' : total >= 30 ? 'D' : total >= 25 ? 'E' : 'F';
                var status = total >= 25 ? 'Pass' : 'Fail';
                var gradeClass = total >= 45 ? 'grade-a' :
                    total >= 35 ? 'grade-b' :
                    total >= 25 ? 'grade-c' : 'grade-f';

                var midtermClass = g.midterm > 0 ? 'text-green-400' : 'text-gray-500';
                var oralClass = g.oral > 0 ? 'text-green-400' : 'text-gray-500';
                var practicalClass = g.practical > 0 ? 'text-green-400' : 'text-gray-500';
                var attendanceClass = g.attendance > 0 ? 'text-green-400' : 'text-gray-500';
                var assignmentClass = g.assignment > 0 ? 'text-green-400' : 'text-gray-500';

                tableRows +=
                    '<tr>' +
                    '<td class="font-mono text-purple-400">' + (subject ? subject.code || 'N/A' : 'N/A') + '</td>' +
                    '<td>' + (subject ? subject.name || 'Unknown' : 'Unknown') + '</td>' +
                    '<td class="text-center ' + midtermClass + '">' + (g.midterm ? g.midterm.toFixed(1) : '0') + '</td>' +
                    '<td class="text-center ' + oralClass + '">' + (g.oral ? g.oral.toFixed(1) : '0') + '</td>' +
                    '<td class="text-center ' + practicalClass + '">' + (g.practical ? g.practical.toFixed(1) : '0') + '</td>' +
                    '<td class="text-center ' + attendanceClass + '">' + (g.attendance ? g.attendance.toFixed(1) : '0') + '</td>' +
                    '<td class="text-center ' + assignmentClass + '">' + (g.assignment ? g.assignment.toFixed(1) : '0') + '</td>' +
                    '<td class="text-center font-bold ' + gradeClass + '">' + total.toFixed(1) + '</td>' +
                    '<td class="text-center">' + gradeLetter + '</td>' +
                    '<td class="text-center">' +
                    '<span class="px-2 py-1 rounded-full text-xs ' + (total >= 25 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400') + '">' +
                    status +
                    '</span>' +
                    '</td>' +
                    '</tr>';
            }

            container.innerHTML =
                '<div class="overflow-x-auto">' +
                '<table class="w-full">' +
                '<thead>' +
                '<tr>' +
                '<th>Subject Code</th>' +
                '<th>Subject Name</th>' +
                '<th>Midterm (10)</th>' +
                '<th>Oral (5)</th>' +
                '<th>Practical (20)</th>' +
                '<th>Attendance (5)</th>' +
                '<th>Assignment (10)</th>' +
                '<th>Total (50)</th>' +
                '<th>Grade</th>' +
                '<th>Status</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>' +
                tableRows +
                '</tbody>' +
                '</table>' +
                '</div>';
        }

        window.refreshGrades = async function() {
            showToast('Refreshing grades...', 'info');
            await loadGrades();
            renderGrades();
            showToast('Grades updated', 'success');
        };

        function renderLectures() {
            if (!currentStudent) return;

            var semesterFilterElement = document.getElementById('lectureSemesterFilter');
            var dayFilterElement = document.getElementById('lectureDayFilter');

            var semesterFilter = semesterFilterElement ? semesterFilterElement.value : '';
            var dayFilter = dayFilterElement ? dayFilterElement.value : '';

            var studentLectures = lectures.filter(function(l) {
                return l.level === currentStudent.level && l.department === currentStudent.department;
            });

            if (semesterFilter) {
                studentLectures = studentLectures.filter(function(l) {
                    var subject = null;
                    for (var i = 0; i < subjects.length; i++) {
                        if (subjects[i].id === l.subject_id) {
                            subject = subjects[i];
                            break;
                        }
                    }
                    return subject && subject.semester == semesterFilter;
                });
            }

            if (dayFilter) {
                studentLectures = studentLectures.filter(function(l) {
                    return l.day === dayFilter;
                });
            }

            var container = document.getElementById('lecturesSchedule');

            if (studentLectures.length === 0) {
                container.innerHTML = '<p class="text-gray-400 text-center py-8 col-span-3">No lectures found</p>';
                return;
            }

            var days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

            var html = '';

            for (var j = 0; j < days.length; j++) {
                var day = days[j];
                var dayLectures = studentLectures.filter(function(l) {
                    return l.day === day;
                });

                if (dayLectures.length === 0 && !dayFilter) {
                    html +=
                        '<div class="lecture-card">' +
                        '<div class="flex justify-between items-center mb-4">' +
                        '<h3 class="text-xl font-bold">' + day + '</h3>' +
                        '<span class="px-3 py-1 bg-gray-600 rounded-full text-sm">0</span>' +
                        '</div>' +
                        '<div class="space-y-3">' +
                        '<p class="text-gray-400 text-sm py-3">No lectures</p>' +
                        '</div>' +
                        '</div>';
                    continue;
                }

                if (dayLectures.length === 0) continue;

                dayLectures.sort(function(a, b) {
                    var timeA = a.time_display || '';
                    var timeB = b.time_display || '';
                    return timeA.localeCompare(timeB);
                });

                var lecturesHtml = '';
                for (var k = 0; k < dayLectures.length; k++) {
                    var l = dayLectures[k];
                    lecturesHtml +=
                        '<div class="bg-slate-900/50 rounded-lg p-3">' +
                        '<h4 class="font-bold text-lg">' + l.subject_name + '</h4>' +
                        '<p class="text-sm text-gray-400 mt-1">' +
                        '<i class="fas fa-clock mr-1"></i> ' + l.time_display +
                        '<i class="fas fa-map-marker-alt ml-3 mr-1"></i> ' + l.location_name +
                        '</p>' +
                        '</div>';
                }

                html +=
                    '<div class="lecture-card">' +
                    '<div class="flex justify-between items-center mb-4">' +
                    '<h3 class="text-xl font-bold">' + day + '</h3>' +
                    '<span class="px-3 py-1 bg-purple-600 rounded-full text-sm">' + dayLectures.length + '</span>' +
                    '</div>' +
                    '<div class="space-y-3">' +
                    lecturesHtml +
                    '</div>' +
                    '</div>';
            }

            container.innerHTML = html;
        }

        function applyLectureFilter() {
            renderLectures();
            showToast('Lecture filter applied', 'success');
        }

        function renderSubjects() {
            if (!currentStudent) return;

            var semesterFilterElement = document.getElementById('subjectSemesterFilter');
            var semesterFilter = semesterFilterElement ? semesterFilterElement.value : '';

            var studentSubjects = subjects.filter(function(s) {
                return s.level === currentStudent.level && s.department === currentStudent.department;
            });

            if (semesterFilter) {
                studentSubjects = studentSubjects.filter(function(s) {
                    return s.semester == semesterFilter;
                });
            }

            var container = document.getElementById('subjectsList');

            if (studentSubjects.length === 0) {
                container.innerHTML = '<p class="text-gray-400 text-center py-8">No subjects found</p>';
                return;
            }

            var semester1 = studentSubjects.filter(function(s) {
                return s.semester == 1;
            });
            var semester2 = studentSubjects.filter(function(s) {
                return s.semester == 2;
            });

            var html = '';

            if (semester1.length > 0) {
                semester1.sort(function(a, b) {
                    return a.name.localeCompare(b.name);
                });

                var rows1 = '';
                for (var i = 0; i < semester1.length; i++) {
                    var s = semester1[i];
                    rows1 +=
                        '<tr>' +
                        '<td class="font-mono text-purple-400">' + (s.code || 'N/A') + '</td>' +
                        '<td>' + s.name + '</td>' +
                        '<td>' + (s.doctor_name || 'N/A') + '</td>' +
                        '<td>' + (s.credits || 3) + '</td>' +
                        '</tr>';
                }

                html +=
                    '<h3 class="text-lg font-bold mb-3 text-purple-400">Semester 1</h3>' +
                    '<div class="overflow-x-auto mb-6">' +
                    '<table class="w-full">' +
                    '<thead>' +
                    '<tr>' +
                    '<th>Code</th>' +
                    '<th>Subject Name</th>' +
                    '<th>Doctor</th>' +
                    '<th>Credits</th>' +
                    '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                    rows1 +
                    '</tbody>' +
                    '</table>' +
                    '</div>';
            }

            if (semester2.length > 0) {
                semester2.sort(function(a, b) {
                    return a.name.localeCompare(b.name);
                });

                var rows2 = '';
                for (var j = 0; j < semester2.length; j++) {
                    var s = semester2[j];
                    rows2 +=
                        '<tr>' +
                        '<td class="font-mono text-purple-400">' + (s.code || 'N/A') + '</td>' +
                        '<td>' + s.name + '</td>' +
                        '<td>' + (s.doctor_name || 'N/A') + '</td>' +
                        '<td>' + (s.credits || 3) + '</td>' +
                        '</tr>';
                }

                html +=
                    '<h3 class="text-lg font-bold mb-3 text-purple-400">Semester 2</h3>' +
                    '<div class="overflow-x-auto">' +
                    '<table class="w-full">' +
                    '<thead>' +
                    '<tr>' +
                    '<th>Code</th>' +
                    '<th>Subject Name</th>' +
                    '<th>Doctor</th>' +
                    '<th>Credits</th>' +
                    '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                    rows2 +
                    '</tbody>' +
                    '</table>' +
                    '</div>';
            }

            container.innerHTML = html;
        }

        function filterStudentGrades() {
            renderGrades();
        }

        function filterStudentAttendance() {
        
        }

        async function exportStudentAttendance() {
            if (!currentStudent) return;

            showToast('Generating PDF...', 'info');

            try {
                var jsPDF = window.jspdf.jsPDF;
                var doc = new jsPDF();

                doc.setFillColor(139, 92, 246);
                doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('Attendance Report', 15, 18);

                doc.setFontSize(10);
                doc.text('Generated: ' + new Date().toLocaleString(), doc.internal.pageSize.width - 15, 18, {
                    align: 'right'
                });

                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.text('Student: ' + currentStudent.name + ' (' + currentStudent.student_id + ')', 15, 45);
                doc.text('Level: ' + currentStudent.level + ' | Department: ' + currentStudent.department, 15, 53);

                var studentAttendance = attendanceRecords.filter(function(a) {
                    return a.student_id === currentStudent.id;
                });
                var studentLectures = lectures.filter(function(l) {
                    return l.level === currentStudent.level && l.department === currentStudent.department;
                });

                studentAttendance.sort(function(a, b) {
                    return new Date(b.date) - new Date(a.date);
                });

                var tableData = [];
                for (var i = 0; i < studentAttendance.length; i++) {
                    var a = studentAttendance[i];
                    var lecture = null;
                    for (var j = 0; j < studentLectures.length; j++) {
                        if (studentLectures[j].id === a.lecture_id) {
                            lecture = studentLectures[j];
                            break;
                        }
                    }
                    tableData.push([
                        a.date,
                        lecture ? lecture.subject_name || 'Unknown' : 'Unknown',
                        lecture ? lecture.time_display || (a.time || 'N/A') : (a.time || 'N/A'),
                        lecture ? lecture.location_name || 'N/A' : 'N/A',
                        'Present'
                    ]);
                }

                doc.autoTable({
                    startY: 65,
                    head: [
                        ['Date', 'Subject', 'Time', 'Location', 'Status']
                    ],
                    body: tableData,
                    theme: 'grid',
                    styles: {
                        fontSize: 9,
                        cellPadding: 3
                    },
                    headStyles: {
                        fillColor: [139, 92, 246],
                        textColor: 255
                    }
                });

                var timestamp = new Date().toISOString().split('T')[0];
                doc.save('attendance_' + currentStudent.student_id + '_' + timestamp + '.pdf');

                showToast('PDF exported successfully', 'success');
            } catch (error) {
                console.error('PDF error:', error);
                showToast('Error generating PDF', 'error');
            }
        }

        function studentLogout() {
            currentStudent = null;
            localStorage.removeItem('studentSession');
            localStorage.removeItem('studentToken');

            document.getElementById('studentDashboard').classList.add('hidden');
            document.getElementById('studentLoginScreen').classList.remove('hidden');

            document.getElementById('studentIdLogin').value = '';
            document.getElementById('studentPasswordLogin').value = '';

            var messageDiv = document.querySelector('.login-message');
            if (messageDiv) messageDiv.remove();

            showToast('Logged out successfully', 'success');
        }

        function getTodayDayName() {
            var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days[new Date().getDay()];
        }

        window.testGradesSystem = async function() {
            console.log('=== TESTING GRADES SYSTEM ===');
            console.log('Current student:', currentStudent);

            if (!currentStudent) {
                console.log('No student logged in');
                return;
            }

            console.log('Grades array length:', grades.length);
            console.log('All grades:', grades);

            var studentGrades = grades.filter(function(g) {
                return g.student_id === currentStudent.id;
            });
            console.log('Grades for student ' + currentStudent.id + ':', studentGrades);

            var visibleGrades = studentGrades.filter(function(g) {
                return g.isVisible;
            });
            console.log('Visible grades:', visibleGrades);

            try {
                var token = localStorage.getItem('studentToken');
                var response = await fetch('/api/grades/student/' + currentStudent.id, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                var data = await response.json();
                console.log('API response:', data);
            } catch (error) {
                console.error('API error:', error);
            }
        };

async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('studentToken');
    if (!token) {
        console.log('No student token found');
        return null;
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

        window.filterStudentGrades = filterStudentGrades;
        window.filterStudentAttendance = filterStudentAttendance;
        window.exportStudentAttendance = exportStudentAttendance;
        window.togglePassword = togglePassword;
        window.applyLectureFilter = applyLectureFilter;
