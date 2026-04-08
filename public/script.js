// script.js - الكود الكامل مع إصلاح أخطاء الـ Recycle Bin

let students = [];
let doctors = [];
let subjects = [];
let departments = [];
let locations = [];
let timeslots = [];
let days = [];
let lectures = [];
let users = [];
let recycleBin = [];
let userPermissions = {};
let teachingAssistants = [];  // أضف هذا السطر
let teachingAssistantLoginData = []; // لبيانات تسجيل دخول المعيدين

let currentDescriptors = [];
let videoStream = null;
let currentUser = null;
let currentReportType = null;
let currentReportFilters = {};

// يمكنك إبقاء هذا للرجوع إليه فقط
const REPORT_TYPES = {
  STUDENTS: 'students',
  QR_CODES: 'qr',
  SUBJECTS: 'subjects',
  LECTURES: 'lectures',
  DOCTORS: 'doctors'
};

const DB_PATH = '/api';

// === FRONTEND PERMISSIONS MATRIX (متطابق مع Backend) ===
const FRONTEND_PERMISSIONS = {
  view:   ['admin', 'it', 'mng', 'emp'],
  add:    ['admin', 'it', 'mng', 'emp'],
  edit:   ['admin', 'it', 'mng'],
  delete: ['admin', 'it', 'mng'],
  manage: ['admin', 'it']
};

// ============================================
// CUSTOM CONFIRMATION MODAL
// ============================================

let confirmationCallback = null;
let confirmationType = 'delete'; // 'delete' or 'edit'

// عرض نافذة التأكيد المخصصة
function showConfirmationModal(options) {
  const {
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    icon = 'fa-exclamation-triangle',
    iconColor = 'text-yellow-400',
    requireComment = true,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
  } = options;

  // تعيين العنوان والرسالة
  document.getElementById('confirmationTitle').textContent = title;
  document.getElementById('confirmationMessage').textContent = message;
  
  // تعيين الأيقونة
  const iconElement = document.getElementById('confirmationIconElement');
  iconElement.className = `fas ${icon} text-5xl ${iconColor}`;
  
  // إظهار أو إخفاء قسم التعليق
  const commentSection = document.getElementById('confirmationCommentSection');
  if (requireComment) {
    commentSection.classList.remove('hidden');
    document.getElementById('confirmationComment').value = '';
    document.getElementById('commentError').classList.add('hidden');
  } else {
    commentSection.classList.add('hidden');
  }
  
  // تعيين أزرار التأكيد والإلغاء
  document.getElementById('confirmActionBtn').innerHTML = `<i class="fas fa-check mr-2"></i> ${confirmText}`;
  document.getElementById('confirmCancelBtn').innerHTML = `<i class="fas fa-times mr-2"></i> ${cancelText}`;
  
  // حفظ callback
  confirmationCallback = onConfirm;
  
  // إظهار المودال
  const modal = document.getElementById('confirmationModal');
  modal.classList.remove('hidden');
  
  // إضافة تأثير ظهور
  setTimeout(() => {
    document.getElementById('confirmationModalContent').classList.remove('scale-95');
    document.getElementById('confirmationModalContent').classList.add('scale-100');
  }, 10);
  
  // تعيين حدث الإلغاء
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const closeModal = () => {
    modal.classList.add('hidden');
    document.getElementById('confirmationModalContent').classList.add('scale-95');
    document.getElementById('confirmationModalContent').classList.remove('scale-100');
    if (onCancel) onCancel();
  };
  
  // إزالة الأحداث القديمة وإضافة جديدة
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  document.getElementById('confirmCancelBtn').addEventListener('click', closeModal);
  
  // تعيين حدث التأكيد
  const confirmBtn = document.getElementById('confirmActionBtn');
  confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  document.getElementById('confirmActionBtn').addEventListener('click', () => {
    const comment = document.getElementById('confirmationComment').value.trim();
    
    if (requireComment && !comment) {
      document.getElementById('commentError').classList.remove('hidden');
      return;
    }
    
    modal.classList.add('hidden');
    document.getElementById('confirmationModalContent').classList.add('scale-95');
    document.getElementById('confirmationModalContent').classList.remove('scale-100');
    
    if (confirmationCallback) {
      confirmationCallback(comment);
    }
  });
}

// إغلاق المودال عند الضغط على ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('confirmationModal');
    if (!modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
      document.getElementById('confirmationModalContent').classList.add('scale-95');
      document.getElementById('confirmationModalContent').classList.remove('scale-100');
    }
  }
});

// ============================================
// CUSTOM TOAST
// ============================================

// استبدل دالة showCustomToast الموجودة بهذه النسخة
function showCustomToast(message, type = 'success', duration = 5000) {
  const toast = document.getElementById('customToast');
  const msg = document.getElementById('customToastMessage');
  const icon = document.getElementById('customToastIcon');

  if (!toast || !msg || !icon) {
    console.error('Toast elements not found, message:', message);
    console.log('Toast message:', message); // إزالة alert
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
  
  // إضافة تأثير ظهور
  toast.style.transform = 'translateX(100%)';
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.transition = 'transform 0.3s ease';
  }, 10);

  // إخفاء التوست بعد المدة المحددة
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.style.transform = '';
      toast.style.transition = '';
    }, 300);
  }, duration);
}
// ============================================
// FACE RECOGNITION SYSTEM 22222222
// ============================================

// دالة للتأكد من وجود face_data لكل طالب
function ensureStudentFaceData(student) {
  if (!student.face_data) {
    student.face_data = {
      has_face: false,
      photos: [],
      descriptors: [],
      updated_at: null
    };
  }
  return student;
}

// ============================================
// FACE RECOGNITION SYSTEM
// ============================================

let faceDetectionNet = null;
let modelsLoaded = false;
let faceDetectionInterval = null;
let currentFaceDetections = [];

// تحميل نماذج التعرف على الوجه
async function loadFaceModels() {
  try {
    showToast('Loading face recognition models...', 'info');
    
    // مسار النماذج - تأكد من وجود المجلد في مشروعك
    const MODEL_URL = '/face_models';
    
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    
    modelsLoaded = true;
    console.log('✅ Face recognition models loaded successfully');
    showCustomToast('Face recognition ready', 'success');
    return true;
  } catch (error) {
    console.error('❌ Error loading face models:', error);
    showToast('Could not load face recognition models', 'error');
    return false;
  }
}

// بدء كشف الوجه من الكاميرا
async function startFaceDetection() {
  if (!modelsLoaded) {
    const loaded = await loadFaceModels();
    if (!loaded) return;
  }
  
  const video = document.getElementById('cameraPreview');
  if (!video) return;
  
  // إيقاف أي كشف سابق
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
  }
  
  // إنشاء عنصر canvas للرسم فوق الفيديو
  const canvas = document.getElementById('faceOverlay') || createFaceOverlay();
  
  // بدء كشف الوجه كل 100ms
  faceDetectionInterval = setInterval(async () => {
    if (!video || video.paused || video.ended) return;
    
    try {
      // كشف الوجوه في الفيديو
      const detections = await faceapi.detectAllFaces(
        video, 
        new faceapi.TinyFaceDetectorOptions({ 
          inputSize: 512,
          scoreThreshold: 0.5 
        })
      )
      .withFaceLandmarks()
      .withFaceDescriptors();
      
      currentFaceDetections = detections;
      
      // رسم الإطار حول الوجوه
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      
      // رسم نقاط الوجه والإطار
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      
      // تحديث حالة الزر بناءً على وجود وجه
      updateCaptureButtonState(detections.length > 0);
      
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, 100);
}

// إنشاء عنصر canvas للرسم فوق الفيديو
function createFaceOverlay() {
  const video = document.getElementById('cameraPreview');
  const canvas = document.createElement('canvas');
  canvas.id = 'faceOverlay';
  canvas.style.position = 'absolute';
  canvas.style.top = video.offsetTop + 'px';
  canvas.style.left = video.offsetLeft + 'px';
  canvas.style.width = video.style.width;
  canvas.style.height = video.style.height;
  canvas.style.pointerEvents = 'none';
  
  video.parentNode.style.position = 'relative';
  video.parentNode.appendChild(canvas);
  
  return canvas;
}

// تحديث حالة زر الالتقاط
function updateCaptureButtonState(hasFace) {
  const captureBtn = document.getElementById('captureBtn');
  if (!captureBtn) return;
  
  const count = currentDescriptors ? currentDescriptors.length : 0;
  
  if (!hasFace) {
    captureBtn.disabled = true;
    captureBtn.title = 'No face detected';
    captureBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else if (count >= 10) {
    captureBtn.disabled = true;
    captureBtn.title = 'Maximum 10 photos reached';
    captureBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    captureBtn.disabled = false;
    captureBtn.title = 'Click to capture face';
    captureBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

// التقاط صورة مع التحقق من جودة الوجه
async function captureFacePhoto() {
  if (currentDescriptors.length >= 10) {
    alert('Maximum 10 photos reached');
    return;
  }
  
  const video = document.getElementById('cameraPreview');
  if (!video || currentFaceDetections.length === 0) {
    alert('No face detected');
    return;
  }
  
  try {
    // الحصول على أفضل وجه
    const detections = currentFaceDetections;
    const bestDetection = detections.reduce((best, current) => {
      const bestSize = best.detection.box.width * best.detection.box.height;
      const currentSize = current.detection.box.width * current.detection.box.height;
      return currentSize > bestSize ? current : best;
    }, detections[0]);
    
    // إنشاء canvas لاقتصاص الوجه
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 160;
    canvas.height = 160;
    
    // رسم الوجه
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, 160, 160);
    
    const photoData = canvas.toDataURL('image/jpeg', 0.8);
    
    const faceData = {
      image: photoData,
      descriptor: bestDetection.descriptor ? Array.from(bestDetection.descriptor) : [],
      quality: { confidence: bestDetection.detection.score }
    };
    
    currentDescriptors.push(faceData);
    
    // تحديث العرض
    renderEmptyPhotoSlots();
    updatePhotoCounter();
    
    // تفعيل زر الحفظ إذا اكتملت 10 صور
    if (currentDescriptors.length === 10) {
      const saveBtn = document.getElementById('saveStudentBtn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
    
    alert(`Photo ${currentDescriptors.length} of 10 captured`);
    
  } catch (error) {
    console.error('Error capturing face:', error);
    alert('Error capturing face');
  }
}

// التحقق من جودة الوجه
async function checkFaceQuality(detection) {
  const box = detection.detection.box;
  const landmarks = detection.landmarks;
  
  // التحقق من حجم الوجه (يجب ألا يكون صغيراً جداً)
  if (box.width < 100 || box.height < 100) {
    return {
      valid: false,
      message: 'Face is too small. Please move closer to camera.'
    };
  }
  
  // التحقق من أن الوجه في المنتصف تقريباً
  const video = document.getElementById('cameraPreview');
  const videoCenterX = video.videoWidth / 2;
  const videoCenterY = video.videoHeight / 2;
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  
  const distanceFromCenter = Math.sqrt(
    Math.pow(faceCenterX - videoCenterX, 2) + 
    Math.pow(faceCenterY - videoCenterY, 2)
  );
  
  if (distanceFromCenter > video.videoWidth * 0.3) {
    return {
      valid: false,
      message: 'Please center your face in the frame.'
    };
  }
  
  // التحقق من أن الوجه ليس مائلاً كثيراً
  const leftEye = landmarks.positions[36]; // العين اليسرى
  const rightEye = landmarks.positions[45]; // العين اليمنى
  const eyeAngle = Math.abs(
    Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * 180 / Math.PI
  );
  
  if (eyeAngle > 10) {
    return {
      valid: false,
      message: 'Please keep your head straight.'
    };
  }
  
  return {
    valid: true,
    message: 'Good face quality',
    confidence: detection.detection.score
  };
}

// عرض صورة الوجه مع معلومات الجودة
function renderFacePhoto(index) {
  const container = document.getElementById('photosPreview');
  if (!container) return;
  
  const faceData = currentDescriptors[index];
  if (!faceData) return;
  
  const existingDiv = container.children[index];
  if (existingDiv) {
    // تحديث الصورة الموجودة
    const img = existingDiv.querySelector('img');
    if (img) img.src = faceData.image;
    
    const qualityBadge = existingDiv.querySelector('.quality-badge');
    if (qualityBadge) {
      qualityBadge.textContent = `Q: ${Math.round(faceData.quality.confidence * 100)}%`;
    }
  } else {
    // إضافة صورة جديدة
    const photoDiv = document.createElement('div');
    photoDiv.className = 'relative';
    photoDiv.innerHTML = `
      <img src="${faceData.image}" class="w-full h-24 object-cover rounded-xl border-2 border-green-500">
      <button type="button" onclick="removeFacePhoto(${index})" 
              class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center hover:bg-red-700">×</button>
      <div class="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded-full">${index+1}</div>
      <div class="quality-badge absolute top-1 left-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
        ${Math.round(faceData.quality.confidence * 100)}%
      </div>
    `;
    container.appendChild(photoDiv);
  }
}

// إزالة صورة وجه
function removeFacePhoto(index) {
  if (currentDescriptors && index >= 0 && index < currentDescriptors.length) {
    currentDescriptors.splice(index, 1);
    
    // إعادة عرض جميع الصور
    const container = document.getElementById('photosPreview');
    if (container) {
      container.innerHTML = '';
      for (let i = 0; i < 10; i++) {
        if (currentDescriptors[i]) {
          renderFacePhoto(i);
        } else {
          // إضافة مكان فارغ
          const emptyDiv = document.createElement('div');
          emptyDiv.className = 'relative bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 h-24 flex items-center justify-center';
          emptyDiv.innerHTML = `<span class="text-gray-500 text-xs">${i+1}</span>`;
          container.appendChild(emptyDiv);
        }
      }
    }
    
    updatePhotoCounter();
    updateCaptureButtonState(currentFaceDetections.length > 0);
    showToast('Photo removed', 'info');
  }
}

// تحديث عداد الصور
function updatePhotoCounter() {
  const counter = document.getElementById('photoCounter');
  const saveBtn = document.getElementById('saveStudentBtn');
  
  if (counter) {
    const count = currentDescriptors ? currentDescriptors.length : 0;
    counter.textContent = `${count} / 10`;
    
    if (count === 10) {
      counter.className = 'px-4 py-2 bg-green-600 rounded-lg text-sm font-bold';
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else if (count >= 5) {
      counter.className = 'px-4 py-2 bg-yellow-600 rounded-lg text-sm font-bold';
    } else {
      counter.className = 'px-4 py-2 bg-red-600 rounded-lg text-sm font-bold';
    }
  }
}

// دالة لحفظ بصمات الوجه في قاعدة البيانات
async function saveFaceDescriptors(studentId, faceData) {
  if (!faceData || !faceData.descriptors || faceData.descriptors.length === 0) return true;
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${DB_PATH}/face-descriptors/student/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(faceData) // أرسل الكائن كما هو
    });
    if (response.ok) {
      console.log(`✅ Saved ${faceData.descriptors.length} face descriptors for student ${studentId}`);
      return true;
    } else {
      console.error('Failed to save face descriptors');
      return false;
    }
  } catch (error) {
    console.error('Error saving face descriptors:', error);
    return false;
  }
}

// تحميل بصمات الوجه للطالب
async function loadFaceDescriptors(studentId) {
  try {
    // students مصفوفة الطلاب العامة
    const student = students.find(s => s.id === studentId);
    if (student && student.face_data && student.face_data.has_face) {
      // تحويل الصور المخزنة إلى الشكل المطلوب للواجهة
      return student.face_data.photos.map((photo, index) => ({
        image: photo,
        descriptor: student.face_data.descriptors[index] || [],
        quality: { confidence: 0.95 }
      }));
    }
    return [];
  } catch (error) {
    console.error('Error loading face descriptors:', error);
    return [];
  }
}

//=========================================
// === USER PERMISSIONS MANAGEMENT ===
// استبدل دالة openUserPermissionsModal بهذه النسخة
// استبدل الجزء الخاص بإنشاء المودال في دالة openUserPermissionsModal
async function openUserPermissionsModal(userId) {
  console.log('Opening permissions modal for user:', userId);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${DB_PATH}/users/${userId}/permissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      showCustomToast('Failed to load user permissions', 'error');
      return;
    }
    
    const userData = await response.json();
    console.log('User permissions data:', userData);
    
    // بناء كائن الصلاحيات الكامل
    const fullPermissions = {};
    
    // قائمة بكل الصلاحيات الممكنة
    const allPermissionsKeys = [
      'nav.students', 'nav.doctors', 'nav.teaching-assistants', 'nav.subjects', 
      'nav.lectures', 'nav.reports', 'nav.management', 'nav.recyclebin', 'nav.student-login',
      'btn.students.add', 'btn.students.edit', 'btn.students.delete',
      'btn.doctors.add', 'btn.doctors.edit', 'btn.doctors.delete',
      'nav.teaching-assistants', 'btn.teaching-assistants.view', 'btn.teaching-assistants.add',
      'btn.teaching-assistants.edit', 'btn.teaching-assistants.delete',
      'btn.subjects.add', 'btn.subjects.edit', 'btn.subjects.delete',
      'btn.lectures.add', 'btn.lectures.edit', 'btn.lectures.delete',
      'card.reports.students', 'card.reports.doctors', 'card.reports.subjects', 
      'card.reports.lectures', 'card.reports.qr',
      'card.management.users', 'card.management.backup', 'card.management.restore', 
      'card.management.verify', 'card.management.database',
      'nav.recyclebin', 'btn.recyclebin.restore', 'btn.recyclebin.confirm', 'btn.recyclebin.export',
      'nav.student-login', 'btn.student-login.view', 'btn.student-login.edit',
      'btn.student-login.delete', 'btn.student-login.reset', 'btn.student-login.export'
    ];
    
    // دمج الصلاحيات المحملة
    allPermissionsKeys.forEach(key => {
      fullPermissions[key] = userData.permissions[key] || false;
    });
    
    // تحديث userData بالصلاحيات الكاملة
    userData.permissions = fullPermissions;
    
    createDetailedPermissionsModal(userData);
    
  } catch (error) {
    console.error('Error loading user permissions:', error);
    showCustomToast('Error loading permissions', 'error');
  }
}

// استبدل دالة createDetailedPermissionsModal بهذه النسخة
function createDetailedPermissionsModal(userData) {
  const existingModal = document.getElementById('permissionsModal');
  if (existingModal) existingModal.remove();
  
  console.log('Creating permissions modal with data:', userData);
  
  const permissionsGroups = [
    {
      title: '📊 Navigation Sidebar',
      description: 'Control which sections appear in the sidebar',
      permissions: [
        { key: 'nav.students', label: 'Students Section', icon: 'fa-users' },
        { key: 'nav.doctors', label: 'Doctors Section', icon: 'fa-user-md' },
        { key: 'nav.teaching-assistants', label: 'Teaching Assistants Section', icon: 'fa-chalkboard-user' },
        { key: 'nav.subjects', label: 'Subjects Section', icon: 'fa-book' },
        { key: 'nav.lectures', label: 'Lectures Section', icon: 'fa-chalkboard-teacher' },
        { key: 'nav.reports', label: 'Reports Section', icon: 'fa-chart-bar' },
        { key: 'nav.management', label: 'Management Section', icon: 'fa-cogs' },
        { key: 'nav.recyclebin', label: 'Recycle Bin Section', icon: 'fa-trash-restore' },
        { key: 'nav.student-login', label: 'Student Login Section', icon: 'fa-user-lock' }
      ]
    },
    {
      title: '🎓 Students Management',
      description: 'Control buttons in Students section',
      permissions: [
        { key: 'btn.students.add', label: 'Add New Student Button', icon: 'fa-user-plus' },
        { key: 'btn.students.edit', label: 'Edit Student Button', icon: 'fa-edit' },
        { key: 'btn.students.delete', label: 'Delete Student Button', icon: 'fa-trash' }
      ]
    },
    {
      title: '👨‍⚕️ Doctors Management',
      description: 'Control buttons in Doctors section',
      permissions: [
        { key: 'btn.doctors.add', label: 'Add New Doctor Button', icon: 'fa-user-plus' },
        { key: 'btn.doctors.edit', label: 'Edit Doctor Button', icon: 'fa-edit' },
        { key: 'btn.doctors.delete', label: 'Delete Doctor Button', icon: 'fa-trash' }
      ]
    },
    {
      title: '🧑‍🏫 Teaching Assistants Management',
      description: 'Full control over teaching assistants section',
      permissions: [
        { key: 'nav.teaching-assistants', label: 'Show Teaching Assistants Section', icon: 'fa-chalkboard-user' },
        { key: 'btn.teaching-assistants.view', label: 'View Teaching Assistants List', icon: 'fa-eye' },
        { key: 'btn.teaching-assistants.add', label: 'Add New Teaching Assistant', icon: 'fa-user-plus' },
        { key: 'btn.teaching-assistants.edit', label: 'Edit Teaching Assistant', icon: 'fa-edit' },
        { key: 'btn.teaching-assistants.delete', label: 'Delete Teaching Assistant', icon: 'fa-trash' }
      ]
    },
    {
      title: '📚 Subjects Management',
      description: 'Control buttons in Subjects section',
      permissions: [
        { key: 'btn.subjects.add', label: 'Add New Subject Button', icon: 'fa-plus' },
        { key: 'btn.subjects.edit', label: 'Edit Subject Button', icon: 'fa-edit' },
        { key: 'btn.subjects.delete', label: 'Delete Subject Button', icon: 'fa-trash' }
      ]
    },
    {
      title: '📅 Lectures Management',
      description: 'Control buttons in Lectures section',
      permissions: [
        { key: 'btn.lectures.add', label: 'Add New Lecture Button', icon: 'fa-plus' },
        { key: 'btn.lectures.edit', label: 'Edit Lecture Button', icon: 'fa-edit' },
        { key: 'btn.lectures.delete', label: 'Delete Lecture Button', icon: 'fa-trash' }
      ]
    },
    {
      title: '👤 Student Login Management',
      description: 'Full control over student login accounts',
      permissions: [
        { key: 'nav.student-login', label: 'Show Student Login Section', icon: 'fa-user-lock' },
        { key: 'btn.student-login.view', label: 'View Student Login Data', icon: 'fa-eye' },
        { key: 'btn.student-login.edit', label: 'Edit Student Passwords', icon: 'fa-edit' },
        { key: 'btn.student-login.delete', label: 'Delete Student Accounts', icon: 'fa-trash' },
        { key: 'btn.student-login.reset', label: 'Reset Student Passwords', icon: 'fa-undo-alt' },
        { key: 'btn.student-login.export', label: 'Export Student Login Report', icon: 'fa-download' }
      ]
    },
    {
      title: '📈 Reports Section',
      description: 'Control report cards visibility',
      permissions: [
        { key: 'card.reports.students', label: 'Students Report Card', icon: 'fa-users' },
        { key: 'card.reports.doctors', label: 'Doctors Report Card', icon: 'fa-user-md' },
        { key: 'card.reports.subjects', label: 'Subjects Report Card', icon: 'fa-book' },
        { key: 'card.reports.lectures', label: 'Lectures Report Card', icon: 'fa-chalkboard-teacher' },
        { key: 'card.reports.qr', label: 'QR Codes Card', icon: 'fa-qrcode' }
      ]
    },
    {
      title: '⚙️ System Management',
      description: 'Control management cards',
      permissions: [
        { key: 'card.management.users', label: 'Users Management Card', icon: 'fa-users-cog' },
        { key: 'card.management.backup', label: 'Create Backup Card', icon: 'fa-download' },
        { key: 'card.management.restore', label: 'Restore Backup Card', icon: 'fa-upload' },
        { key: 'card.management.verify', label: 'Verify Data Card', icon: 'fa-search' },
        { key: 'card.management.database', label: 'Database Info Card', icon: 'fa-database' }
      ]
    },
    {
      title: '🗑️ Recycle Bin Management',
      description: 'Control recycle bin access',
      permissions: [
        { key: 'nav.recyclebin', label: 'Show Recycle Bin Section', icon: 'fa-trash-restore' },
        { key: 'btn.recyclebin.restore', label: 'Restore Items', icon: 'fa-undo' },
        { key: 'btn.recyclebin.confirm', label: 'Confirm Operations', icon: 'fa-check' },
        { key: 'btn.recyclebin.export', label: 'Export Report', icon: 'fa-download' }
      ]
    }
  ];
  
  let modalHTML = `
    <div id="permissionsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div class="bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8">
        <div class="flex justify-between items-center mb-8">
          <div>
            <h2 class="text-3xl font-bold text-white">Detailed Permissions Control</h2>
            <p class="text-gray-400 mt-2">
              User: <span class="text-indigo-400 font-bold">${userData.username}</span> 
              | ID: <span class="text-yellow-400">${userData.userId || userData.id}</span>
              | Role: <span class="px-2 py-1 bg-blue-600 rounded text-sm">${userData.role.toUpperCase()}</span>
            </p>
          </div>
          <button onclick="document.getElementById('permissionsModal').remove()" 
                  class="text-gray-400 hover:text-white text-3xl">&times;</button>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  `;
  
  permissionsGroups.forEach(group => {
    modalHTML += `
      <div class="bg-gray-800 rounded-xl p-6">
        <div class="mb-4">
          <h3 class="text-xl font-bold text-white flex items-center">
            <i class="fas ${group.permissions[0]?.icon || 'fa-cog'} mr-2 text-indigo-400"></i>
            ${group.title}
          </h3>
          <p class="text-gray-400 text-sm mt-1">${group.description}</p>
        </div>
        
        <div class="space-y-3">
    `;
    
    group.permissions.forEach(perm => {
      // التأكد من أن القيمة موجودة وإلا استخدم false
      const isChecked = userData.permissions && userData.permissions[perm.key] === true;
      console.log(`Permission ${perm.key}: ${isChecked ? 'ON' : 'OFF'}`);
      
      modalHTML += `
        <div class="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-850 transition">
          <div class="flex items-center">
            <i class="fas ${perm.icon} mr-3 text-gray-300"></i>
            <span class="text-sm">${perm.label}</span>
          </div>
          <label class="switch">
            <input type="checkbox" 
                   data-permission="${perm.key}"
                   ${isChecked ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `;
    });
    
    modalHTML += `
        </div>
      </div>
    `;
  });
  
  modalHTML += `
        </div>
        
        <div class="flex justify-between items-center pt-8 border-t border-gray-800 mt-8">
          <div>
            <button onclick="resetAllPermissions(${userData.userId || userData.id})" 
                    class="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center">
              <i class="fas fa-undo mr-2"></i>Reset All to Default
            </button>
            <p class="text-xs text-gray-400 mt-2">Based on role: ${userData.role}</p>
          </div>
          <div class="flex gap-4">
            <button onclick="document.getElementById('permissionsModal').remove()" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">
              Cancel
            </button>
            <button onclick="saveDetailedPermissions(${userData.userId || userData.id})" 
                    class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl font-bold flex items-center">
              <i class="fas fa-save mr-2"></i>Save All Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// استبدل دالة saveDetailedPermissions بهذه النسخة
// استبدل دالة saveDetailedPermissions بهذه النسخة
async function saveDetailedPermissions(userId) {
  try {
    // جمع كل الصلاحيات من الواجهة
    const permissions = {};
    const checkboxes = document.querySelectorAll('#permissionsModal input[type="checkbox"]');
    
    console.log(`Found ${checkboxes.length} permission checkboxes`);
    
    checkboxes.forEach(checkbox => {
      const permissionKey = checkbox.dataset.permission;
      permissions[permissionKey] = checkbox.checked;
      console.log(`${permissionKey}: ${checkbox.checked ? 'ON' : 'OFF'}`);
    });
    
    console.log('Saving detailed permissions:', permissions);
    
    // إرسال التحديث إلى السيرفر
    const token = localStorage.getItem('token');
    const response = await fetch(`${DB_PATH}/users/${userId}/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ permissions })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showCustomToast('✅ All permissions saved successfully!', 'success');
      document.getElementById('permissionsModal').remove();
      
      // إذا كان المستخدم الحالي هو من تم تحديث صلاحياته
      if (currentUser?.id === userId) {
        // إعادة تحميل الصلاحيات
        await loadUserPermissions();
        // إعادة تطبيق الصلاحيات على الواجهة
        applyAllPermissions();
        showCustomToast('🔄 Your permissions have been updated!', 'success');
      }
      
      // إعادة تحميل قائمة المستخدمين - هذا سيقوم بتحديث حالة Custom/Default
      await loadUsers();
      
      // تحديث الصف الخاص بهذا المستخدم في الجدول ليظهر "Customized" فوراً
      updateUserRowCustomStatus(userId);
      
    } else {
      showCustomToast(`❌ Failed to save permissions: ${result.error}`, 'error');
    }
    
  } catch (error) {
    console.error('Error saving permissions:', error);
    showCustomToast('❌ Error saving permissions', 'error');
  }
}

// دالة جديدة لتحديث حالة المستخدم في الجدول مباشرة
function updateUserRowCustomStatus(userId) {
  // البحث عن الصف الخاص بالمستخدم
  const userRows = document.querySelectorAll('#usersList tbody tr');
  
  userRows.forEach(row => {
    const editBtn = row.querySelector('.edit-btn');
    if (editBtn && parseInt(editBtn.dataset.id) === userId) {
      // تحديث عمود Custom Permissions
      const statusCell = row.querySelector('td:nth-child(3)');
      if (statusCell) {
        statusCell.innerHTML = '<span class="px-3 py-1 bg-green-600 rounded-full text-sm">Customized</span>';
      }
      console.log(`✅ Updated user ${userId} status to Customized`);
    }
  });
}

async function resetAllPermissions(userId) {
  if (!confirm('Are you sure you want to reset ALL permissions to default based on user role?')) {
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${DB_PATH}/users/${userId}/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ permissions: null }) // إرسال null لاستخدام الصلاحيات الافتراضية
    });
    
    if (response.ok) {
      showToast('✅ All permissions reset to default!', 'success');
      
      // إعادة فتح نافذة الصلاحيات مع القيم الجديدة
      setTimeout(() => {
        document.getElementById('permissionsModal').remove();
        openUserPermissionsModal(userId);
      }, 500);
    } else {
      const error = await response.json();
      showToast(`❌ Failed to reset permissions: ${error.error}`, 'error');
    }
    
  } catch (error) {
    console.error('Error resetting permissions:', error);
    showToast('❌ Error resetting permissions', 'error');
  }
}

// === DETAILED PERMISSIONS APPLICATION ===
async function applyDetailedPermissions() {
  console.log('Applying detailed permissions for user:', currentUser);
  
  if (!currentUser || !currentUser.id) {
    console.error('No current user or user ID found, skipping permissions');
    return;
  }
  
  try {
    // جلب الصلاحيات من السيرفر
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found');
      applyDefaultPermissionsBasedOnRole();
      return;
    }
    
    const response = await fetch(`${DB_PATH}/users/${currentUser.id}/permissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const userData = await response.json();
      const permissions = userData.permissions;
      
      console.log('Loaded permissions:', permissions);
      
      // تخزين الصلاحيات في متغير عام لاستخدامها لاحقاً
      window.currentPermissions = permissions;
      
      // تطبيق الصلاحيات على كل عنصر
      applyNavigationPermissions(permissions);
      applyAllButtonsPermissions(permissions);
      
      console.log('✅ All permissions applied successfully');
      
    } else {
      console.error('Failed to load permissions, using defaults');
      applyDefaultPermissionsBasedOnRole();
    }
    
  } catch (error) {
    console.error('Error applying permissions:', error);
    applyDefaultPermissionsBasedOnRole();
  }
}
// دالة جديدة لتطبيق صلاحيات جميع الأزرار في كل الجداول
function applyAllButtonsPermissions(permissions) {
  if (!permissions) return;
  
  // تطبيق على الأزرار الموجودة حالياً
  applyStudentsPermissions(permissions);
  applyDoctorsPermissions(permissions);
  applyTeachingAssistantsPermissions(permissions);  // أضف هذا السطر
  applySubjectsPermissions(permissions);
  applyLecturesPermissions(permissions);
  
  // إضافة مراقب للتغييرات في DOM
  observeDOMChanges(permissions);
}
// دالة لمراقبة التغييرات في DOM وإعادة تطبيق الصلاحيات
function observeDOMChanges(permissions) {
  // استخدام MutationObserver لمراقبة إضافة عناصر جديدة
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // تأخير صغير للتأكد من اكتمال إضافة العناصر
        setTimeout(() => {
          applyStudentsPermissions(permissions);
          applyDoctorsPermissions(permissions);
          applyTeachingAssistantsPermissions(permissions);  // أضف هذا السطر
          applySubjectsPermissions(permissions);
          applyLecturesPermissions(permissions);
        }, 100);
      }
    });
  });
  
  // مراقبة التغييرات في قوائم العناصر
  const targets = ['studentsList', 'doctorsList', 'teachingAssistantsList', 'subjectsList', 'lecturesList'];
  targets.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      observer.observe(element, { childList: true, subtree: true });
    }
  });
}

// استبدل دالة applyNavigationPermissions الموجودة بهذه النسخة
function applyNavigationPermissions(permissions) {
  console.log('Applying navigation permissions with:', permissions);
  
  // للـ Admin و IT - كل الأزرار ظاهرة ولا تختفي أبداً
  if (currentUser?.role === 'admin' || currentUser?.role === 'it') {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('hidden');
    });
    console.log('Admin/IT user - showing all navigation buttons');
    return;
  }
  
  // للمستخدمين التانيين - طبق الصلاحيات
  const navMapping = {
    'nav.students': '[data-section="students"]',
    'nav.doctors': '[data-section="doctors"]',
    'nav.teaching-assistants': '[data-section="teaching-assistants"]',
    'nav.subjects': '[data-section="subjects"]',
    'nav.lectures': '[data-section="lectures"]',
    'nav.reports': '[data-section="reports"]',
    'nav.management': '[data-section="management"]',
    'nav.recyclebin': '[data-section="recyclebin"]',
    'nav.student-login': '[data-section="student-login"]'
  };
  
  Object.entries(navMapping).forEach(([permKey, selector]) => {
    const element = document.querySelector(selector);
    if (element) {
      // تحقق من الصلاحية
      const hasAccess = permissions && permissions[permKey] === true;
      
      if (hasAccess) {
        element.classList.remove('hidden');
        console.log(`✅ Showing ${permKey}`);
      } else {
        element.classList.add('hidden');
        console.log(`❌ Hiding ${permKey}`);
      }
    }
  });
}  

// استبدل دالة applyStudentLoginPermissions بهذه النسخة
function applyStudentLoginPermissions(permissions) {
  if (!permissions) return;
  
  console.log('Applying Student Login permissions:', {
    nav: permissions['nav.student-login'],
    view: permissions['btn.student-login.view'],
    edit: permissions['btn.student-login.edit'],
    delete: permissions['btn.student-login.delete'],
    reset: permissions['btn.student-login.reset'],
    export: permissions['btn.student-login.export']
  });
  
  // قسم Student Login في الـ Sidebar
  const navStudentLogin = document.querySelector('[data-section="student-login"]');
  if (navStudentLogin) {
    const shouldShow = permissions['nav.student-login'] === true;
    navStudentLogin.classList.toggle('hidden', !shouldShow);
    console.log('Student Login nav:', shouldShow ? 'SHOW' : 'HIDE');
  }
  
  // التحكم في ظهور الأزرار في الجدول
  const editBtns = document.querySelectorAll('#studentLoginList .edit-btn');
  const deleteBtns = document.querySelectorAll('#studentLoginList .delete-btn');
  const resetBtns = document.querySelectorAll('#studentLoginList .reset-btn, #studentLoginList button:has(.fa-undo-alt)');
  const viewBtns = document.querySelectorAll('#studentLoginList .view-btn');
  const exportBtn = document.querySelector('#student-loginSection .btn-gradient:has(.fa-download)');
  
  console.log(`Found ${editBtns.length} edit buttons, ${deleteBtns.length} delete buttons`);
  
  viewBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.student-login.view'] !== true);
  });
  
  editBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.student-login.edit'] !== true);
  });
  
  deleteBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.student-login.delete'] !== true);
  });
  
  resetBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.student-login.reset'] !== true);
  });
  
  if (exportBtn) {
    exportBtn.classList.toggle('hidden', permissions['btn.student-login.export'] !== true);
  }
}

// تحديث دوال الصلاحيات لكل كيان
function applyStudentsPermissions(permissions) {
  // قسم الطلاب
  const addBtn = document.getElementById('addStudentBtn');
  const editBtns = document.querySelectorAll('#studentsList .edit-btn, #studentsList button[class*="edit"]');
  const deleteBtns = document.querySelectorAll('#studentsList .delete-btn, #studentsList button[class*="delete"]');
  
  console.log('Students Edit buttons found:', editBtns.length);
  console.log('Students Delete buttons found:', deleteBtns.length);
  
  if (addBtn) {
    const shouldShow = permissions['btn.students.add'] !== false;
    addBtn.classList.toggle('hidden', !shouldShow);
    console.log('Add Student button:', shouldShow ? 'SHOW' : 'HIDE');
  }
  
  editBtns.forEach(btn => {
    const shouldShow = permissions['btn.students.edit'] !== false;
    btn.classList.toggle('hidden', !shouldShow);
    console.log('Edit button visibility:', shouldShow, 'Button:', btn);
  });
  
  deleteBtns.forEach(btn => {
    const shouldShow = permissions['btn.students.delete'] !== false;
    btn.classList.toggle('hidden', !shouldShow);
    console.log('Delete button visibility:', shouldShow, 'Button:', btn);
  });
}

function applyDoctorsPermissions(permissions) {
  // قسم الأطباء
  const addBtn = document.getElementById('addDoctorBtn');
  const editBtns = document.querySelectorAll('#doctorsList .edit-btn, #doctorsList button[class*="edit"]');
  const deleteBtns = document.querySelectorAll('#doctorsList .delete-btn, #doctorsList button[class*="delete"]');
  
  console.log('Doctors Edit buttons found:', editBtns.length);
  
  if (addBtn) {
    addBtn.classList.toggle('hidden', permissions['btn.doctors.add'] === false);
  }
  
  editBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.doctors.edit'] === false);
  });
  
  deleteBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.doctors.delete'] === false);
  });
}

function applySubjectsPermissions(permissions) {
  // قسم المواد
  const addBtn = document.getElementById('addSubjectBtn');
  const editBtns = document.querySelectorAll('#subjectsList .edit-btn, #subjectsList button[class*="edit"]');
  const deleteBtns = document.querySelectorAll('#subjectsList .delete-btn, #subjectsList button[class*="delete"]');
  
  console.log('Subjects Edit buttons found:', editBtns.length);
  
  if (addBtn) {
    addBtn.classList.toggle('hidden', permissions['btn.subjects.add'] === false);
  }
  
  editBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.subjects.edit'] === false);
  });
  
  deleteBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.subjects.delete'] === false);
  });
}

function applyLecturesPermissions(permissions) {
  // قسم المحاضرات
  const addBtn = document.getElementById('addLectureBtn');
  const editBtns = document.querySelectorAll('#lecturesList .edit-btn, #lecturesList button[class*="edit"]');
  const deleteBtns = document.querySelectorAll('#lecturesList .delete-btn, #lecturesList button[class*="delete"]');
  
  console.log('Lectures Edit buttons found:', editBtns.length);
  
  if (addBtn) {
    addBtn.classList.toggle('hidden', permissions['btn.lectures.add'] === false);
  }
  
  editBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.lectures.edit'] === false);
  });
  
  deleteBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.lectures.delete'] === false);
  });
}

// تطبيق صلاحيات المعيدين
// استبدل دالة applyTeachingAssistantsPermissions بهذه النسخة
// استبدل دالة applyTeachingAssistantsPermissions بهذه النسخة
function applyTeachingAssistantsPermissions(permissions) {
  if (!permissions) return;
  
  console.log('Applying Teaching Assistants permissions:', {
    nav: permissions['nav.teaching-assistants'],
    view: permissions['btn.teaching-assistants.view'],
    add: permissions['btn.teaching-assistants.add'],
    edit: permissions['btn.teaching-assistants.edit'],
    delete: permissions['btn.teaching-assistants.delete']
  });
  
  // Admin/IT يرون كل شيء دائماً
  if (currentUser?.role === 'admin' || currentUser?.role === 'it') {
    const navTa = document.querySelector('[data-section="teaching-assistants"]');
    if (navTa) navTa.classList.remove('hidden');
    
    const addBtn = document.getElementById('addTaBtn');
    if (addBtn) addBtn.classList.remove('hidden');
    
    const editBtns = document.querySelectorAll('#teachingAssistantsList .edit-btn');
    const deleteBtns = document.querySelectorAll('#teachingAssistantsList .delete-btn');
    
    editBtns.forEach(btn => btn.classList.remove('hidden'));
    deleteBtns.forEach(btn => btn.classList.remove('hidden'));
    
    console.log('Teaching Assistants: ALL VISIBLE (Admin/IT)');
    return;
  }
  
  // قسم المعيدين في الـ Sidebar
  const navTa = document.querySelector('[data-section="teaching-assistants"]');
  if (navTa) {
    const shouldShow = permissions['nav.teaching-assistants'] === true;
    navTa.classList.toggle('hidden', !shouldShow);
    console.log('Teaching Assistants nav:', shouldShow ? 'SHOW' : 'HIDE');
  }
  
  // زر الإضافة
  const addBtn = document.getElementById('addTaBtn');
  if (addBtn) {
    const shouldShow = permissions['btn.teaching-assistants.add'] === true;
    addBtn.classList.toggle('hidden', !shouldShow);
  }
  
  // أزرار التعديل والحذف في الجدول - تطبيق الصلاحيات بشكل صحيح
  setTimeout(() => {
    const editBtns = document.querySelectorAll('#teachingAssistantsList .edit-btn');
    const deleteBtns = document.querySelectorAll('#teachingAssistantsList .delete-btn');
    
    console.log(`Found ${editBtns.length} edit buttons, ${deleteBtns.length} delete buttons`);
    
    editBtns.forEach(btn => {
      const shouldShow = permissions['btn.teaching-assistants.edit'] === true;
      btn.classList.toggle('hidden', !shouldShow);
      console.log('Edit button visibility:', shouldShow ? 'SHOW' : 'HIDE');
    });
    
    deleteBtns.forEach(btn => {
      const shouldShow = permissions['btn.teaching-assistants.delete'] === true;
      btn.classList.toggle('hidden', !shouldShow);
      console.log('Delete button visibility:', shouldShow ? 'SHOW' : 'HIDE');
    });
  }, 300); // تأخير صغير للتأكد من تحميل الجدول
}

function applyReportsPermissions(permissions) {
  // قسم التقارير
  if (!permissions) return;
  
  const reportCards = {
    'card.reports.students': '#reportsSection button:nth-child(1)',
    'card.reports.doctors': '#reportsSection button:nth-child(2)',
    'card.reports.subjects': '#reportsSection button:nth-child(3)',
    'card.reports.lectures': '#reportsSection button:nth-child(4)',
    'card.reports.qr': '#qrCodesCard, #reportsSection button:nth-child(5)'
  };
  
  Object.entries(reportCards).forEach(([permKey, selector]) => {
    const element = document.querySelector(selector);
    if (element && permissions[permKey] !== undefined) {
      element.classList.toggle('hidden', !permissions[permKey]);
    }
  });
}

function applyManagementPermissions(permissions) {
  // قسم الإدارة
  if (!permissions) return;
  
  const managementCards = {
    'card.management.users': '#managementCards > .card:nth-child(1)',
    'card.management.backup': '#managementCards > .card:nth-child(2)',
    'card.management.restore': '#managementCards > .card:nth-child(3)',
    'card.management.verify': '#managementCards > .card:nth-child(4)',
    'card.management.database': '#managementCards > .card:nth-child(5)'
  };
  
  Object.entries(managementCards).forEach(([permKey, selector]) => {
    const element = document.querySelector(selector);
    if (element && permissions[permKey] !== undefined) {
      element.classList.toggle('hidden', !permissions[permKey]);
    }
  });
}

function applyRecycleBinPermissions(permissions) {
  // قسم Recycle Bin
  if (!permissions) return;
  
  // إظهار/إخفاء زر Recycle Bin في الـ Sidebar
  const recycleBinNav = document.querySelector('[data-section="recyclebin"]');
  if (recycleBinNav) {
    const shouldShow = permissions['nav.recyclebin'] === true;
    recycleBinNav.classList.toggle('hidden', !shouldShow);
    console.log('Recycle Bin nav:', shouldShow ? 'SHOW' : 'HIDE');
  }
  
  // إظهار/إخفاء أزرار الـ Recycle Bin
  const restoreBtns = document.querySelectorAll('#recyclebinSection .restore-btn, [onclick*="restoreRecycleBinEntry"]');
  const confirmBtns = document.querySelectorAll('#recyclebinSection .confirm-btn, [onclick*="confirmRecycleBinEntry"]');
  const exportBtns = document.querySelectorAll('#recyclebinSection .export-btn, [onclick*="exportRecycleBinReport"]');
  
  restoreBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.recyclebin.restore'] === false);
  });
  
  confirmBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.recyclebin.confirm'] === false);
  });
  
  exportBtns.forEach(btn => {
    btn.classList.toggle('hidden', permissions['btn.recyclebin.export'] === false);
  });
}

function applyDefaultPermissionsBasedOnRole() {
  // تطبيق الصلاحيات الافتراضية حسب الدور
  const role = currentUser?.role;
  
  if (!role) return;
  
  // قائمة بالصلاحيات الافتراضية لكل دور (يجب أن تطابق السيرفر)
  const defaultPermissions = {
    admin: {
      'nav.students': true, 'btn.students.add': true, 'btn.students.edit': true, 'btn.students.delete': true,
      'nav.doctors': true, 'btn.doctors.add': true, 'btn.doctors.edit': true, 'btn.doctors.delete': true,
      'nav.subjects': true, 'btn.subjects.add': true, 'btn.subjects.edit': true, 'btn.subjects.delete': true,
      'nav.lectures': true, 'btn.lectures.add': true, 'btn.lectures.edit': true, 'btn.lectures.delete': true,
      'nav.reports': true, 'card.reports.students': true, 'card.reports.doctors': true, 'card.reports.subjects': true, 'card.reports.lectures': true, 'card.reports.qr': true,
      'nav.management': true, 'card.management.users': true, 'card.management.backup': true, 'card.management.restore': true, 'card.management.verify': true, 'card.management.database': true,
      'nav.recyclebin': true, 'btn.recyclebin.restore': true, 'btn.recyclebin.confirm': true, 'btn.recyclebin.export': true,
            'nav.student-login': true,
      'btn.student-login.view': true,
      'btn.student-login.edit': true,
      'btn.student-login.delete': true,
      'btn.student-login.reset': true,
      'btn.student-login.export': true,

          'nav.teaching-assistants': true,
    'btn.teaching-assistants.view': true,
    'btn.teaching-assistants.add': true,
    'btn.teaching-assistants.edit': true,
    'btn.teaching-assistants.delete': true,
    },
    it: {
      'nav.students': true, 'btn.students.add': true, 'btn.students.edit': true, 'btn.students.delete': true,
      'nav.doctors': true, 'btn.doctors.add': true, 'btn.doctors.edit': true, 'btn.doctors.delete': true,
      'nav.subjects': true, 'btn.subjects.add': true, 'btn.subjects.edit': true, 'btn.subjects.delete': true,
      'nav.lectures': true, 'btn.lectures.add': true, 'btn.lectures.edit': true, 'btn.lectures.delete': true,
      'nav.reports': true, 'card.reports.students': true, 'card.reports.doctors': true, 'card.reports.subjects': true, 'card.reports.lectures': true, 'card.reports.qr': true,
      'nav.management': true, 'card.management.users': true, 'card.management.backup': true, 'card.management.restore': true, 'card.management.verify': true, 'card.management.database': true,
      'nav.recyclebin': true, 'btn.recyclebin.restore': true, 'btn.recyclebin.confirm': true, 'btn.recyclebin.export': true,
            'nav.student-login': true,
      'btn.student-login.view': true,
      'btn.student-login.edit': true,
      'btn.student-login.delete': true,
      'btn.student-login.reset': true,
      'btn.student-login.export': true,

          'nav.teaching-assistants': true,
    'btn.teaching-assistants.view': true,
    'btn.teaching-assistants.add': true,
    'btn.teaching-assistants.edit': true,
    'btn.teaching-assistants.delete': true,
    },
    mng: {
      'nav.students': true, 'btn.students.add': true, 'btn.students.edit': true, 'btn.students.delete': false,
      'nav.doctors': true, 'btn.doctors.add': true, 'btn.doctors.edit': true, 'btn.doctors.delete': false,
      'nav.subjects': true, 'btn.subjects.add': true, 'btn.subjects.edit': true, 'btn.subjects.delete': false,
      'nav.lectures': true, 'btn.lectures.add': true, 'btn.lectures.edit': true, 'btn.lectures.delete': false,
      'nav.reports': true, 'card.reports.students': true, 'card.reports.doctors': true, 'card.reports.subjects': true, 'card.reports.lectures': true, 'card.reports.qr': false,
      'nav.management': false, 'card.management.users': false, 'card.management.backup': false, 'card.management.restore': false, 'card.management.verify': false, 'card.management.database': false,
      'nav.recyclebin': false, 'btn.recyclebin.restore': false, 'btn.recyclebin.confirm': false, 'btn.recyclebin.export': false,
  'nav.teaching-assistants': true,
  'btn.teaching-assistants.view': true,
  'btn.teaching-assistants.add': true,
  'btn.teaching-assistants.edit': true,
  'btn.teaching-assistants.delete': true,
  
  // Student Login - غير مفعلة
  'nav.student-login': false,
  'btn.student-login.view': false,
  'btn.student-login.edit': false,
  'btn.student-login.delete': false,
  'btn.student-login.reset': false,
  'btn.student-login.export': false
    },
    emp: {
      'nav.students': true, 'btn.students.add': true, 'btn.students.edit': false, 'btn.students.delete': false,
      'nav.doctors': true, 'btn.doctors.add': true, 'btn.doctors.edit': false, 'btn.doctors.delete': false,
      'nav.subjects': true, 'btn.subjects.add': true, 'btn.subjects.edit': false, 'btn.subjects.delete': false,
      'nav.lectures': true, 'btn.lectures.add': true, 'btn.lectures.edit': false, 'btn.lectures.delete': false,
      'nav.reports': true, 'card.reports.students': true, 'card.reports.doctors': true, 'card.reports.subjects': true, 'card.reports.lectures': true, 'card.reports.qr': false,
      'nav.management': false, 'card.management.users': false, 'card.management.backup': false, 'card.management.restore': false, 'card.management.verify': false, 'card.management.database': false,
      'nav.recyclebin': false, 'btn.recyclebin.restore': false, 'btn.recyclebin.confirm': false, 'btn.recyclebin.export': false,
  'nav.teaching-assistants': true,
  'btn.teaching-assistants.view': true,
  'btn.teaching-assistants.add': true,
  'btn.teaching-assistants.edit': true,
  'btn.teaching-assistants.delete': true,
  
  // Student Login - غير مفعلة
  'nav.student-login': false,
  'btn.student-login.view': false,
  'btn.student-login.edit': false,
  'btn.student-login.delete': false,
  'btn.student-login.reset': false,
  'btn.student-login.export': false
    }
  };
  
  const permissions = defaultPermissions[role] || defaultPermissions.emp;
  applyDetailedPermissionsDirect(permissions);
}

function applyDetailedPermissionsDirect(permissions) {
  // تطبيق مباشر للصلاحيات
  applyNavigationPermissions(permissions);
  applyStudentsPermissions(permissions);
  applyDoctorsPermissions(permissions);
  applyTeachingAssistantsPermissions(permissions);  // أضف هذا السطر
  applySubjectsPermissions(permissions);
  applyLecturesPermissions(permissions);
  applyReportsPermissions(permissions);
  applyManagementPermissions(permissions);
  applyRecycleBinPermissions(permissions);
}

function getPermissionDescription(entity, action) {
  const descriptions = {
    students: {
      view: 'Show students section in sidebar',
      add: 'Add new students',
      edit: 'Edit existing students',
      delete: 'Delete students'
    },
    doctors: {
      view: 'Show doctors section in sidebar',
      add: 'Add new doctors',
      edit: 'Edit existing doctors',
      delete: 'Delete doctors'
    },
    subjects: {
      view: 'Show subjects section in sidebar',
      add: 'Add new subjects',
      edit: 'Edit existing subjects',
      delete: 'Delete subjects'
    },
    lectures: {
      view: 'Show lectures section in sidebar',
      add: 'Add new lectures',
      edit: 'Edit existing lectures',
      delete: 'Delete lectures'
    },
    reports: {
      view: 'Show reports section in sidebar',
      add: 'Generate new reports',
      edit: 'Edit report settings',
      delete: 'Delete reports'
    },
    management: {
      view: 'Show management section in sidebar',
      add: 'Add system items (restricted)',
      edit: 'Edit system settings (restricted)',
      delete: 'Delete system items (restricted)'
    },
    'student-login': {
      view: 'Show Student Login section in sidebar',
      edit: 'Edit student passwords',
      delete: 'Delete student login accounts',
      reset: 'Reset student passwords to default',
      export: 'Export student login report'
    },
    recyclebin: {
      view: 'Show recycle bin section',
      restore: 'Restore deleted items',
      confirm: 'Confirm operations',
      export: 'Export reports'
    }
  };
  
  return descriptions[entity]?.[action] || 'Control permission for this action';
}

// === TOAST NOTIFICATION ===
// استبدل دالة showToast الموجودة بهذه النسخة
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const msg = document.getElementById('toastMessage');
  const icon = document.getElementById('toastIcon');

  if (!toast || !msg || !icon) {
    console.error('Toast elements not found, message:', message);
    // إزالة alert واستخدام console فقط
    console.log('Toast message:', message);
    return;
  }

  // تنظيف الرسالة القديمة
  msg.innerHTML = '';
  
  if (typeof message === 'string') {
    msg.textContent = message;
  } else {
    msg.innerHTML = message;
  }

  // تعيين الأيقونة المناسبة
  if (type === 'success') {
    icon.className = 'fas fa-check-circle text-green-400 text-3xl';
  } else if (type === 'error') {
    icon.className = 'fas fa-exclamation-circle text-red-400 text-3xl';
  } else if (type === 'warning') {
    icon.className = 'fas fa-exclamation-triangle text-yellow-400 text-3xl';
  } else {
    icon.className = 'fas fa-info-circle text-blue-400 text-3xl';
  }

  // إظهار وإخفاء Toast
  toast.classList.remove('hidden');
  toast.classList.add('flex');
  
  // إضافة تأثير ظهور
  toast.style.transform = 'translateX(100%)';
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.transition = 'transform 0.3s ease';
  }, 10);

  const hideTime = type === 'success' ? 8000 : 10000;
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.classList.remove('flex');
      toast.style.transform = '';
      toast.style.transition = '';
    }, 300);
  }, hideTime);
}

// === AUTHENTICATED FETCH ===
async function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please login again', 'error');
    logout();
    return null;
  }

  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  try {
    const res = await fetch(url, options);

    if (res.status === 401) {
      showToast('Session expired. Logging out...', 'error');
      logout();
      return null;
    }

    if (res.status === 403) {
      showToast('Access denied: Insufficient permissions', 'error');
      return null;
    }

    return res;
  } catch (error) {
    console.error('Fetch error:', error);
    showToast('Network error: Could not connect to server', 'error');
    return null;
  }
}

// === LOGOUT FUNCTION ===
function logout() {
    // إيقاف مراقبة التحديثات
    stopStudentLoginUpdatesMonitoring();
    
    currentUser = null;
    userPermissions = {};
    localStorage.clear();
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    showToast('Logged out successfully', 'success');
    
    // إعادة تعيين حقول التسجيل
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

// استبدل دالة loadUserPermissions بهذه النسخة
// تحميل صلاحيات المستخدم
async function loadUserPermissions() {
  if (!currentUser || !currentUser.id) {
    console.warn('No current user or user ID found');
    
    // محاولة استعادة المستخدم من localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        console.log('Restored user from localStorage:', currentUser);
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
    
    if (!currentUser || !currentUser.id) {
      console.error('Still no user ID');
      return false;
    }
  }
  
  // Admin و IT كل الصلاحيات مفعلة
  if (currentUser.role === 'admin' || currentUser.role === 'it') {
    console.log(`👑 ${currentUser.role.toUpperCase()} user - all permissions granted`);
    userPermissions = {}; // فارغة لأنهم لا يحتاجونها
    return true;
  }
  
  try {
    const token = localStorage.getItem('token');
    console.log(`Loading permissions for user ${currentUser.id} (${currentUser.role})`);
    
    const response = await fetch(`${DB_PATH}/users/${currentUser.id}/permissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      userPermissions = data.permissions || {};
      console.log(`✅ Loaded permissions for ${currentUser.username}:`, userPermissions);
      return true;
    } else {
      console.warn(`⚠️ Could not load permissions (${response.status}), using defaults`);
      userPermissions = {};
      return false;
    }
  } catch (error) {
    console.error('❌ Error loading permissions:', error);
    userPermissions = {};
    return false;
  }
}


// التحقق من صلاحية محددة
function hasPermission(permissionKey) {
  if (!currentUser) return false;
  
  // Admin و IT لديهم كل الصلاحيات
  if (currentUser.role === 'admin' || currentUser.role === 'it') {
    return true;
  }
  
  // للمستخدمين الآخرين، نتحقق من الصلاحية المحددة
  return userPermissions[permissionKey] === true;
}

// تطبيق الصلاحيات على الواجهة بالكامل
// تطبيق الصلاحيات على الواجهة
// أضف هذا الجزء في نهاية دالة applyAllPermissions بعد admin/it check
function applyAllPermissions() {
  if (!currentUser) return;
  
  console.log('🔐 Applying permissions for:', currentUser.role);
  
  // Admin و IT - كل شيء ظاهر
  if (currentUser.role === 'admin' || currentUser.role === 'it') {
    console.log('👑 Admin/IT user - showing everything');
    document.querySelectorAll('.nav-btn, .add-btn, .edit-btn, .delete-btn, .permissions-btn, .restore-btn, .confirm-btn').forEach(el => {
      el.classList.remove('hidden');
    });
    
    // تأكيد ظهور كل الأقسام
    const sections = [
      '[data-section="students"]',
      '[data-section="doctors"]', 
      '[data-section="teaching-assistants"]',
      '[data-section="subjects"]',
      '[data-section="lectures"]',
      '[data-section="reports"]',
      '[data-section="management"]',
      '[data-section="recyclebin"]',
      '[data-section="student-login"]'
    ];
    
    sections.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.classList.remove('hidden');
    });
    
    return;
  }
  
  // للمستخدمين الآخرين، طبق الصلاحيات
  
  // 1. أزرار التنقل في الـ Sidebar
  const navMappings = [
    { selector: '[data-section="students"]', key: 'nav.students' },
    { selector: '[data-section="doctors"]', key: 'nav.doctors' },
    { selector: '[data-section="teaching-assistants"]', key: 'nav.teaching-assistants' },
    { selector: '[data-section="subjects"]', key: 'nav.subjects' },
    { selector: '[data-section="lectures"]', key: 'nav.lectures' },
    { selector: '[data-section="reports"]', key: 'nav.reports' },
    { selector: '[data-section="management"]', key: 'nav.management' },
    { selector: '[data-section="recyclebin"]', key: 'nav.recyclebin' },
    { selector: '[data-section="student-login"]', key: 'nav.student-login' }
  ];
  
  navMappings.forEach(mapping => {
    const element = document.querySelector(mapping.selector);
    if (element) {
      const shouldShow = hasPermission(mapping.key);
      element.classList.toggle('hidden', !shouldShow);
    }
  });
  
  // 2. أزرار الإضافة
  const addMappings = [
    { selector: '#addStudentBtn', key: 'btn.students.add' },
    { selector: '#addDoctorBtn', key: 'btn.doctors.add' },
    { selector: '#addTaBtn', key: 'btn.teaching-assistants.add' },
    { selector: '#addSubjectBtn', key: 'btn.subjects.add' },
    { selector: '#addLectureBtn', key: 'btn.lectures.add' }
  ];
  
  addMappings.forEach(mapping => {
    const element = document.querySelector(mapping.selector);
    if (element) {
      const shouldShow = hasPermission(mapping.key);
      element.classList.toggle('hidden', !shouldShow);
    }
  });
  
  // 3. تطبيق صلاحيات Teaching Assistants بشكل منفصل
  applyTeachingAssistantsPermissions(userPermissions);
  
  // 4. أزرار الجداول الأخرى
  applyTableButtonPermissions();
  
  console.log('✅ Permissions applied successfully');
}

// تطبيق صلاحيات أزرار الجداول
// استبدل دالة applyTableButtonPermissions بهذه النسخة
function applyTableButtonPermissions() {
  // Students
  document.querySelectorAll('#studentsList .edit-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.students.edit'));
  });
  document.querySelectorAll('#studentsList .delete-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.students.delete'));
  });
  
  // Doctors
  document.querySelectorAll('#doctorsList .edit-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.doctors.edit'));
  });
  document.querySelectorAll('#doctorsList .delete-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.doctors.delete'));
  });
  
  // Teaching Assistants - تأكد من تطبيقها هنا أيضاً
  document.querySelectorAll('#teachingAssistantsList .edit-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.teaching-assistants.edit'));
  });
  document.querySelectorAll('#teachingAssistantsList .delete-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.teaching-assistants.delete'));
  });
  
  // Subjects
  document.querySelectorAll('#subjectsList .edit-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.subjects.edit'));
  });
  document.querySelectorAll('#subjectsList .delete-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.subjects.delete'));
  });
  
  // Lectures
  document.querySelectorAll('#lecturesList .edit-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.lectures.edit'));
  });
  document.querySelectorAll('#lecturesList .delete-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.lectures.delete'));
  });
  
  // Student Login
  document.querySelectorAll('#studentLoginList .edit-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.student-login.edit'));
  });
  document.querySelectorAll('#studentLoginList .delete-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.student-login.delete'));
  });
  document.querySelectorAll('#studentLoginList .reset-btn').forEach(btn => {
    btn.classList.toggle('hidden', !hasPermission('btn.student-login.reset'));
  });
  
  // Export buttons
  const exportBtn = document.querySelector('#student-loginSection .btn-gradient:has(.fa-download)');
  if (exportBtn) {
    exportBtn.classList.toggle('hidden', !hasPermission('btn.student-login.export'));
  }
}


// === CHECK SERVER CONNECTION ===
async function checkServerConnection() {
  try {
    const response = await fetch('http://localhost:3000');
    console.log('Server status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Server connection error:', error);
    return false;
  }
}

// تحديث دالة loadData
// استبدل دالة loadData الموجودة بهذه النسخة
// تحديث بداية دالة loadData - أضف هذا السطر في أول الدالة
async function loadData() {
  console.log('=== LOADING DATA FROM SERVER ===');
  
  try {
    // تحميل الصلاحيات أولاً (للمستخدمين العاديين)
    await loadUserPermissions();
    
    // تحميل البيانات الأساسية
    const endpoints = [
      { key: 'students', url: `${DB_PATH}/students` },
      { key: 'doctors', url: `${DB_PATH}/doctors` },
      { key: 'teaching-assistants', url: `${DB_PATH}/teaching-assistants` },
      { key: 'subjects', url: `${DB_PATH}/subjects` },
      { key: 'departments', url: `${DB_PATH}/departments` },
      { key: 'locations', url: `${DB_PATH}/locations` },
      { key: 'timeslots', url: `${DB_PATH}/timeslots` },
      { key: 'days', url: `${DB_PATH}/days` },
      { key: 'lectures', url: `${DB_PATH}/lectures` }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const res = await authenticatedFetch(endpoint.url);
        if (res && res.ok) {
          const data = await res.json();
          results[endpoint.key] = data;
          console.log(`✅ Loaded ${endpoint.key}: ${data.length} records`);
        } else {
          console.warn(`⚠️ Could not load ${endpoint.key}`);
          results[endpoint.key] = [];
        }
      } catch (err) {
        console.error(`❌ Error loading ${endpoint.key}:`, err);
        results[endpoint.key] = [];
      }
    }
    
    // تحديث المتغيرات العالمية
    students = results.students || [];
    doctors = results.doctors || [];
    teachingAssistants = results['teaching-assistants'] || [];
    subjects = results.subjects || [];
    departments = results.departments || [];
    locations = results.locations || [];
    timeslots = results.timeslots || [];
    days = results.days || [];
    lectures = results.lectures || [];
    
    console.log('📊 Data loaded:', {
      students: students.length,
      doctors: doctors.length,
      teachingAssistants: teachingAssistants.length,
      subjects: subjects.length,
      lectures: lectures.length
    });
    
    // تحميل Recycle Bin فقط إذا كان مسموحاً به
    if (hasPermission('nav.recyclebin')) {
      await loadRecycleBin();
    }
    
    if (currentUser && currentUser.id) {
      populateSelects();
      renderAllSections();
      updateSectionTitle();
      
      // تطبيق الصلاحيات بعد تحميل كل شيء
      setTimeout(applyAllPermissions, 500);
    }
    
  } catch (err) {
    console.error('❌ Load data error:', err);
    showCustomToast('Failed to load data from server: ' + err.message, 'error');
  }
}

// ============================================
// TEACHING ASSISTANTS FUNCTIONS
// ============================================

// تحميل المعيدين
async function loadTeachingAssistants() {
  console.log('📥 Loading teaching assistants...');
  const res = await authenticatedFetch(`${DB_PATH}/teaching-assistants`);
  if (res && res.ok) {
    teachingAssistants = await res.json();
    console.log(`✅ Loaded ${teachingAssistants.length} teaching assistants`);
    renderTeachingAssistants();
  } else {
    console.warn('⚠️ Could not load teaching assistants');
    teachingAssistants = [];
    document.getElementById('teachingAssistantsList').innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No teaching assistants found</p>';
  }
}

// عرض جدول المعيدين
// عرض جدول المعيدين (نسخة مبسطة)
// استبدل دالة renderTeachingAssistants بهذه النسخة
function renderTeachingAssistants() {
  const container = document.getElementById('teachingAssistantsList');
  if (!container) {
    console.warn('Teaching assistants container not found');
    return;
  }

  if (!teachingAssistants || teachingAssistants.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No teaching assistants found</p>';
    return;
  }

  // التحقق من الصلاحيات
  const canEdit = hasPermission('btn.teaching-assistants.edit');
  const canDelete = hasPermission('btn.teaching-assistants.delete');
  
  console.log('Rendering TA table with permissions - Edit:', canEdit, 'Delete:', canDelete);

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-teal-600 to-cyan-700">
          <tr>
            <th class="p-6 text-left text-xl">Name</th>
            <th class="p-6 text-left text-xl">Username</th>
            <th class="p-6 text-left text-xl">Email</th>
            <th class="p-6 text-left text-xl">Supervisor Doctor</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${teachingAssistants.map(ta => `
            <tr>
              <td class="p-6">${ta.name || 'N/A'}</td>
              <td class="p-6">${ta.username || 'N/A'}</td>
              <td class="p-6">${ta.email || 'N/A'}</td>
              <td class="p-6">${ta.supervisor_doctor_name || 'N/A'}</td>
              <td class="p-6">
                ${canEdit ? 
                  `<button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${ta.id}">
                    <i class="fas fa-edit mr-1"></i>Edit
                  </button>` : ''
                }
                ${canDelete ? 
                  `<button class="delete-btn text-red-400 hover:underline text-lg" data-id="${ta.id}">
                    <i class="fas fa-trash mr-1"></i>Delete
                  </button>` : ''
                }
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  attachTeachingAssistantActions();
  
  // إعادة تطبيق الصلاحيات بعد عرض الجدول
  setTimeout(() => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'it') {
      applyTeachingAssistantsPermissions(userPermissions);
    }
  }, 200);
}

// ربط أحداث الأزرار
function attachTeachingAssistantActions() {
  const container = document.getElementById('teachingAssistantsList');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    
    if (target.classList.contains('edit-btn')) {
      const id = parseInt(target.dataset.id);
      openTeachingAssistantModal('Edit Teaching Assistant', id);
    }
    
    if (target.classList.contains('delete-btn')) {
      const id = parseInt(target.dataset.id);
      await deleteTeachingAssistant(id);
    }
  });
}

// حذف معيد
async function deleteTeachingAssistant(id) {
  showConfirmationModal({
    title: 'Delete Teaching Assistant',
    message: 'Are you sure you want to delete this teaching assistant?',
    icon: 'fa-trash-alt',
    iconColor: 'text-red-400',
    requireComment: true,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    onConfirm: async (comment) => {
      showCustomToast(`Deleting teaching assistant...`, 'info');
      
      const res = await authenticatedFetch(`${DB_PATH}/teaching-assistants/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationComment: comment })
      });
      
      if (res && res.ok) {
        showCustomToast('Teaching assistant deleted and logged to recycle bin', 'success');
        await loadTeachingAssistants();
      }
    }
  });
}

// فتح نافذة إضافة/تعديل معيد
// فتح نافذة إضافة/تعديل معيد (نسخة مبسطة)
function openTeachingAssistantModal(title, id = null) {
  console.log(`Opening TA modal: ${title}, ID: ${id}`);
  
  const existingModal = document.getElementById('taModal');
  if (existingModal) existingModal.remove();
  
  const ta = id ? teachingAssistants.find(t => t.id === id) : null;
  
  const modalHTML = `
    <div id="taModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-lg p-8">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">${title}</h2>
          <button onclick="document.getElementById('taModal').remove()" 
                  class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form id="taForm" class="space-y-6">
          <input type="hidden" id="taIdHidden" value="${id || ''}">
          
          <div>
            <label class="block text-sm font-medium mb-2">Full Name *</label>
            <input type="text" id="taName" required 
                   value="${ta?.name || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Username *</label>
            <input type="text" id="taUsername" required 
                   value="${ta?.username || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">${id ? 'New Password (leave empty to keep current)' : 'Password *'}</label>
            <div class="relative">
              <input type="password" id="taPassword" ${id ? '' : 'required'}
                     class="w-full px-4 py-3 bg-white/10 rounded-xl text-white pr-12">
              <button type="button" onclick="togglePasswordVisibility('taPassword')" 
                      class="absolute right-4 top-3 text-gray-400">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input type="email" id="taEmail" 
                   value="${ta?.email || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Supervisor Doctor *</label>
            <select id="taSupervisorDoctor" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
              <option value="">Select Doctor</option>
              ${doctors.map(doc => `
                <option value="${doc.id}" ${ta?.supervisor_doctor_id === doc.id ? 'selected' : ''}>
                  ${doc.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
            <button type="button" onclick="document.getElementById('taModal').remove()" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancel</button>
            <button type="submit" class="btn-gradient px-8 py-3 rounded-xl">Save Teaching Assistant</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  document.getElementById('taForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    saveBtn.disabled = true;
    
    try {
      // تجهيز البيانات
      const formData = {
        name: document.getElementById('taName').value.trim(),
        username: document.getElementById('taUsername').value.trim(),
        email: document.getElementById('taEmail').value.trim() || null,
        supervisor_doctor_id: parseInt(document.getElementById('taSupervisorDoctor').value)
      };
      
      const password = document.getElementById('taPassword').value.trim();
      if (password || !id) {
        formData.password = password || 'ta123456';
      }
      
      if (id) {
        // تعديل مع تعليق
        const success = await updateEntityWithConfirmation('teaching-assistants', id, formData);
        if (success) {
          document.getElementById('taModal').remove();
          await loadTeachingAssistants();
        }
      } else {
        // إضافة جديدة
        const url = `${DB_PATH}/teaching-assistants`;
        const res = await authenticatedFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (res && res.ok) {
          showToast('Teaching assistant added successfully', 'success');
          document.getElementById('taModal').remove();
          await loadTeachingAssistants();
        }
      }
    } catch (error) {
      console.error('Error saving teaching assistant:', error);
      showToast('Error saving teaching assistant', 'error');
    } finally {
      saveBtn.innerHTML = originalText;
      saveBtn.disabled = false;
    }
  });
}



// === LOAD RECYCLE BIN ===
async function loadRecycleBin() {
  const res = await authenticatedFetch(`${DB_PATH}/recyclebin`);
  if (res && res.ok) {
    recycleBin = await res.json();
    renderRecycleBin();
    updateRecycleBinStats();
  }
}

// === UPDATE RECYCLE BIN STATS ===
function updateRecycleBinStats() {
  const pendingCount = document.getElementById('pendingCount');
  const confirmedCount = document.getElementById('confirmedCount');
  const restoredCount = document.getElementById('restoredCount');
  const totalCount = document.getElementById('totalCount');
  
  if (pendingCount) {
    pendingCount.textContent = recycleBin.filter(e => e.status === 'pending').length;
  }
  if (confirmedCount) {
    confirmedCount.textContent = recycleBin.filter(e => e.status === 'confirmed').length;
  }
  if (restoredCount) {
    restoredCount.textContent = recycleBin.filter(e => e.status === 'restored').length;
  }
  if (totalCount) {
    totalCount.textContent = recycleBin.length;
  }
}

// === RENDER RECYCLE BIN ===
function renderRecycleBin() {
  const container = document.getElementById('recyclebinList');
  if (!container) return;

  if (recycleBin.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No records in recycle bin</p>';
    return;
  }

  // تطبيق الفلاتر إذا كانت موجودة
  let filtered = [...recycleBin];
  
  const actionFilter = document.getElementById('recycleActionFilter')?.value;
  const entityFilter = document.getElementById('recycleEntityFilter')?.value;
  const statusFilter = document.getElementById('recycleStatusFilter')?.value;
  const startDate = document.getElementById('recycleStartDate')?.value;
  const endDate = document.getElementById('recycleEndDate')?.value;
  
  if (actionFilter) {
    filtered = filtered.filter(e => e.action === actionFilter);
  }
  if (entityFilter) {
    filtered = filtered.filter(e => e.entityType === entityFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter(e => e.status === statusFilter);
  }
  if (startDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate + 'T23:59:59'));
  }
  
  // ترتيب من الأحدث إلى الأقدم
  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-red-600 to-pink-700">
          <tr>
            <th class="p-4 text-left">ID</th>
            <th class="p-4 text-left">Action</th>
            <th class="p-4 text-left">Entity</th>
            <th class="p-4 text-left">Entity ID</th>
            <th class="p-4 text-left">User</th>
            <th class="p-4 text-left">Comment</th>
            <th class="p-4 text-left">Timestamp</th>
            <th class="p-4 text-left">Status</th>
            <th class="p-4 text-left">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${sorted.map(entry => `
            <tr class="${entry.status === 'pending' ? 'bg-red-900/20' : ''}">
              <td class="p-4">${entry.id}</td>
              <td class="p-4">
                <span class="px-3 py-1 rounded-full text-sm ${entry.action === 'delete' ? 'bg-red-600' : 'bg-yellow-600'}">
                  ${entry.action.toUpperCase()}
                </span>
              </td>
              <td class="p-4">${entry.entityType}</td>
              <td class="p-4 font-mono">${entry.entityId}</td>
              <td class="p-4">
                <span class="font-bold">${entry.username}</span>
                <span class="text-xs text-gray-400 block">ID: ${entry.userId}</span>
              </td>
              <td class="p-4 max-w-xs">
                <div class="bg-gray-800 p-2 rounded text-sm italic">
                  "${entry.comment}"
                </div>
              </td>
              <td class="p-4 text-sm">
                ${new Date(entry.timestamp).toLocaleString()}
              </td>
              <td class="p-4">
                <span class="px-3 py-1 rounded-full text-sm ${
                  entry.status === 'confirmed' ? 'bg-green-600' : 
                  entry.status === 'restored' ? 'bg-blue-600' : 
                  'bg-yellow-600'
                }">
                  ${entry.status}
                </span>
                ${entry.confirmedBy ? `<div class="text-xs mt-1">by ${entry.confirmedBy}</div>` : ''}
              </td>
              <td class="p-4">
                <div class="flex flex-col gap-2">
                  ${entry.status === 'pending' ? `
                    <button onclick="confirmRecycleBinEntry(${entry.id})" 
                            class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs confirm-btn">
                      <i class="fas fa-check mr-1"></i>Confirm
                    </button>
                  ` : ''}
                  
                  ${entry.status !== 'restored' ? `
                    <button onclick="restoreRecycleBinEntry(${entry.id})" 
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs restore-btn">
                      <i class="fas fa-undo mr-1"></i>Restore
                    </button>
                  ` : ''}
                  
                  <button onclick="viewRecycleBinDetails(${entry.id})" 
                          class="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs">
                    <i class="fas fa-eye mr-1"></i>Details
                  </button>
                  
                  <button onclick="deleteRecycleBinEntry(${entry.id})" 
                          class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs">
                    <i class="fas fa-trash mr-1"></i>Remove
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  updateRecycleBinStats();
}

// === RECYCLE BIN ACTIONS ===
async function confirmRecycleBinEntry(id) {
  showConfirmationModal({
    title: 'Confirm Recycle Bin Entry',
    message: 'Are you sure you want to confirm this operation?',
    icon: 'fa-check-circle',
    iconColor: 'text-green-400',
    requireComment: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: async () => {
      const res = await authenticatedFetch(`${DB_PATH}/recyclebin/${id}/confirm`, {
        method: 'POST'
      });
      
      if (res && res.ok) {
        showCustomToast('Entry confirmed successfully', 'success');
        await loadRecycleBin();
      }
    }
  });
}

async function restoreRecycleBinEntry(id) {
  showConfirmationModal({
    title: 'Restore Entry',
    message: 'Are you sure you want to restore this data? This will revert the changes.',
    icon: 'fa-undo-alt',
    iconColor: 'text-blue-400',
    requireComment: false,
    confirmText: 'Restore',
    cancelText: 'Cancel',
    onConfirm: async () => {
      const res = await authenticatedFetch(`${DB_PATH}/recyclebin/${id}/restore`, {
        method: 'POST'
      });
      
      if (res && res.ok) {
        showCustomToast('Entry restored successfully', 'success');
        await loadRecycleBin();
        await loadData();
      }
    }
  });
}

async function deleteRecycleBinEntry(id) {
  showConfirmationModal({
    title: 'Delete Entry',
    message: 'Are you sure you want to permanently remove this entry from recycle bin?',
    icon: 'fa-trash-alt',
    iconColor: 'text-red-400',
    requireComment: false,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    onConfirm: async () => {
      const res = await authenticatedFetch(`${DB_PATH}/recyclebin/${id}`, {
        method: 'DELETE'
      });
      
      if (res && res.ok) {
        showCustomToast('Entry removed from recycle bin', 'success');
        await loadRecycleBin();
      }
    }
  });
}

function viewRecycleBinDetails(id) {
  const entry = recycleBin.find(r => r.id === id);
  if (!entry) return;
  
  const modalHTML = `
    <div id="recycleBinDetailsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">Recycle Bin Entry #${entry.id}</h2>
          <button onclick="document.getElementById('recycleBinDetailsModal').remove()" 
                  class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div class="grid grid-cols-2 gap-6 mb-8">
          <div class="bg-gray-800 p-4 rounded-xl">
            <p class="text-gray-400 text-sm">Action</p>
            <p class="text-xl font-bold ${entry.action === 'delete' ? 'text-red-400' : 'text-yellow-400'}">
              ${entry.action.toUpperCase()}
            </p>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <p class="text-gray-400 text-sm">Entity</p>
            <p class="text-xl font-bold">${entry.entityType}</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <p class="text-gray-400 text-sm">Entity ID</p>
            <p class="text-xl font-bold font-mono">${entry.entityId}</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <p class="text-gray-400 text-sm">User</p>
            <p class="text-xl font-bold">${entry.username}</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <p class="text-gray-400 text-sm">Timestamp</p>
            <p class="text-xl font-bold">${new Date(entry.timestamp).toLocaleString()}</p>
          </div>
          <div class="bg-gray-800 p-4 rounded-xl">
            <p class="text-gray-400 text-sm">Status</p>
            <p class="text-xl font-bold ${entry.status === 'pending' ? 'text-yellow-400' : entry.status === 'confirmed' ? 'text-green-400' : 'text-blue-400'}">
              ${entry.status}
            </p>
          </div>
        </div>
        
        <div class="mb-8">
          <h3 class="text-xl font-bold mb-4">Comment</h3>
          <div class="bg-gray-800 p-6 rounded-xl text-lg italic">
            "${entry.comment}"
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h3 class="text-xl font-bold mb-4 text-red-400">Old Data</h3>
            <pre class="bg-gray-800 p-4 rounded-xl overflow-x-auto text-sm">${JSON.stringify(entry.oldData, null, 2)}</pre>
          </div>
          ${entry.newData ? `
            <div>
              <h3 class="text-xl font-bold mb-4 text-green-400">New Data</h3>
              <pre class="bg-gray-800 p-4 rounded-xl overflow-x-auto text-sm">${JSON.stringify(entry.newData, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
        
        ${entry.confirmedBy ? `
          <div class="bg-green-900/30 p-4 rounded-xl mb-4">
            <p class="text-green-400">✅ Confirmed by ${entry.confirmedBy} at ${new Date(entry.confirmedAt).toLocaleString()}</p>
          </div>
        ` : ''}
        
        ${entry.restoredBy ? `
          <div class="bg-blue-900/30 p-4 rounded-xl mb-4">
            <p class="text-blue-400">🔄 Restored by ${entry.restoredBy} at ${new Date(entry.restoredAt).toLocaleString()}</p>
          </div>
        ` : ''}
        
        <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
          <button onclick="document.getElementById('recycleBinDetailsModal').remove()" 
                  class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// === EXPORT RECYCLE BIN REPORT ===
async function exportRecycleBinReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229);
  doc.text('Recycle Bin Report', 105, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 30, { align: 'center' });
  
  const tableHead = [['ID', 'Action', 'Entity', 'User', 'Comment', 'Status', 'Timestamp']];
  const tableBody = recycleBin.map(entry => [
    entry.id.toString(),
    entry.action.toUpperCase(),
    `${entry.entityType}#${entry.entityId}`,
    entry.username,
    entry.comment.substring(0, 30) + (entry.comment.length > 30 ? '...' : ''),
    entry.status,
    new Date(entry.timestamp).toLocaleString()
  ]);
  
  doc.autoTable({
    startY: 40,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 }
  });
  
  doc.save(`recyclebin_report_${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('Recycle Bin report exported', 'success');
}

// === APPLY RECYCLE FILTERS ===
function applyRecycleFilters() {
  renderRecycleBin();
}

function resetRecycleFilters() {
  document.getElementById('recycleActionFilter').value = '';
  document.getElementById('recycleEntityFilter').value = '';
  document.getElementById('recycleStatusFilter').value = '';
  document.getElementById('recycleStartDate').value = '';
  document.getElementById('recycleEndDate').value = '';
  renderRecycleBin();
}

// === POPULATE SELECTS ===
function populateSelects() {
  // Departments
  ['studentDepartment', 'deptFilter', 'lectureDepartment'].forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.innerHTML = '<option value="">Select Department</option>';
      departments.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept.name;
        opt.textContent = dept.name;
        select.appendChild(opt);
      });
    }
  });

  // Levels
  const levelFilter = document.getElementById('levelFilter');
  if (levelFilter) {
    levelFilter.innerHTML = '<option value="">All Levels</option>';
    for (let i = 1; i <= 4; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Level ${i}`;
      levelFilter.appendChild(opt);
    }
  }

  // Subject Doctor Select
  const doctorSelect = document.getElementById('subjectDoctorSelect');
  if (doctorSelect) {
    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
    doctors.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      doctorSelect.appendChild(opt);
    });
  }
 
  // Lecture selects
  const subSelect = document.getElementById('lectureSubject');
  if (subSelect) {
    subSelect.innerHTML = '<option value="">Select Subject</option>';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      subSelect.appendChild(opt);
    });
  }

  const docSelect = document.getElementById('lectureDoctor');
  if (docSelect) {
    docSelect.innerHTML = '<option value="">Select Doctor</option>';
    doctors.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      docSelect.appendChild(opt);
    });
  }

  const daySelect = document.getElementById('lectureDay');
  if (daySelect) {
    daySelect.innerHTML = '<option value="">Select Day</option>';
    days.forEach(day => {
      const opt = document.createElement('option');
      opt.value = day;
      opt.textContent = day;
      daySelect.appendChild(opt);
    });
  }

  const timeSelect = document.getElementById('lectureTime');
  if (timeSelect) {
    timeSelect.innerHTML = '<option value="">Select Time</option>';
    timeslots.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.display || `${t.start} - ${t.end}`;
      timeSelect.appendChild(opt);
    });
  }

  const locSelect = document.getElementById('lectureLocation');
  if (locSelect) {
    locSelect.innerHTML = '<option value="">Select Location</option>';
    locations.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      locSelect.appendChild(opt);
    });
  }
  // أضف هذا داخل دالة populateSelects
// Student Login Department Filter
const studentLoginDeptFilter = document.getElementById('studentLoginDeptFilter');
if (studentLoginDeptFilter) {
  studentLoginDeptFilter.innerHTML = '<option value="">All Departments</option>';
  departments.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept.name;
    opt.textContent = dept.name;
    studentLoginDeptFilter.appendChild(opt);
  });
}
// أضف هذا داخل دالة populateSelects

  // Teaching Assistant Supervisor Doctor Select
  const taDoctorSelect = document.getElementById('taSupervisorDoctor');
  if (taDoctorSelect) {
    taDoctorSelect.innerHTML = '<option value="">Select Doctor</option>';
    doctors.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      taDoctorSelect.appendChild(opt);
    });
  }
}


// === UPDATE SECTION TITLE ===
function updateSectionTitle() {
  const titleEl = document.getElementById('sectionTitle');
  const active = document.querySelector('.nav-btn.bg-white\\/20')?.dataset.section;
  let base = '';
  let count = 0;

  if (active === 'students') { base = 'Students Management'; count = students.length; }
  else if (active === 'doctors') { base = 'Doctors Management'; count = doctors.length; }
  else if (active === 'teaching-assistants') { base = 'Teaching Assistants Management'; count = teachingAssistants.length; } 
  else if (active === 'subjects') { base = 'subjects Management'; count = subjects.length; }
  else if (active === 'lectures') { base = 'Lectures Management'; count = lectures.length; }
  else if (active === 'reports') { base = 'Reports'; }
  else if (active === 'management') { base = 'System Management'; }
  else if (active === 'student-login') { base = ''; }
  else if (active === 'recyclebin') { base = 'Recycle Bin'; count = recycleBin.length; }

  if (active === 'management' || active === 'reports' || active === 'recyclebin' || active === 'student-login') {
    titleEl.textContent = base;
  } else {
    titleEl.textContent = count >= 0 ? `${base} (Total: ${count})` : base;
  }
}

// تحديث دالة renderAllSections لتطبيق الصلاحيات بعد العرض
// استبدل دالة renderAllSections الموجودة
function renderAllSections() {
  console.log('Rendering all sections...');
  
  if (students && students.length > 0) {
    renderStudentsTable();
  } else {
    document.getElementById('studentsList').innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No students found</p>';
  }
  
  if (doctors && doctors.length > 0) {
    renderDoctors();
  } else {
    document.getElementById('doctorsList').innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No doctors found</p>';
  }
  
  // أضف هذا الشرط
  if (teachingAssistants && teachingAssistants.length > 0) {
    renderTeachingAssistants();
  } else if (document.getElementById('teachingAssistantsList')) {
    document.getElementById('teachingAssistantsList').innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No teaching assistants found</p>';
  }
  
  if (subjects && subjects.length > 0) {
    renderSubjects();
  } else {
    document.getElementById('subjectsList').innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No subjects found</p>';
  }
  
  if (lectures && lectures.length > 0) {
    renderLectures();
  } else {
    document.getElementById('lecturesList').innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No lectures found</p>';
  }
  
  // إعادة تطبيق الصلاحيات بعد عرض الجداول
  if (window.currentPermissions) {
    setTimeout(() => {
      applyAllButtonsPermissions(window.currentPermissions);
    }, 200);
  }
}

// تحديث دالة renderStudentsTable
function renderStudentsTable(data = students) {
  const container = document.getElementById('studentsList');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No students found</p>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-indigo-600 to-purple-600">
          <tr>
            <th class="p-6 text-left text-xl">Name</th>
            <th class="p-6 text-left text-xl">Student ID</th>
            <th class="p-6 text-left text-xl">Level</th>
            <th class="p-6 text-left text-xl">Department</th>
            <th class="p-6 text-left text-xl">Face Photos</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${data.map(s => {
            // التحقق من وجود face_data وحالة الصور
            const hasFacePhotos = s.face_data && 
                                 s.face_data.has_face === true && 
                                 s.face_data.photos && 
                                 s.face_data.photos.length === 10;
            
            // أيقونة الحالة
            const faceStatus = hasFacePhotos 
              ? '<span class="text-green-400 font-bold flex items-center gap-2"><i class="fas fa-check-circle"></i> 10 Photos</span>' 
              : '<span class="text-red-400 font-bold flex items-center gap-2"><i class="fas fa-times-circle"></i> None</span>';
            
            return `
              <tr>
                <td class="p-6">${s.name}</td>
                <td class="p-6">${s.student_id}</td>
                <td class="p-6">Level ${s.level}</td>
                <td class="p-6">${s.department}</td>
                <td class="p-6">${faceStatus}</td>
                <td class="p-6">
                  <button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${s.id}">
                    <i class="fas fa-edit mr-1"></i>Edit
                  </button>
                  <button class="delete-btn text-red-400 hover:underline text-lg" data-id="${s.id}">
                    <i class="fas fa-trash mr-1"></i>Delete
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  attachEntityActions('students');
  setTimeout(applyAllPermissions, 100);
}

// تحديث دالة renderDoctors
function renderDoctors() {
  const container = document.getElementById('doctorsList');
  if (!container) return;

  if (doctors.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No doctors found</p>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-green-600 to-teal-700">
          <tr>
            <th class="p-6 text-left text-xl">Name</th>
            <th class="p-6 text-left text-xl">Username</th>
            <th class="p-6 text-left text-xl">Email</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${doctors.map(d => `
            <tr>
              <td class="p-6">${d.name}</td>
              <td class="p-6">${d.username}</td>
              <td class="p-6">${d.email || 'N/A'}</td>
              <td class="p-6">
                <button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${d.id}" style="display: inline-block;">Edit</button>
                <button class="delete-btn text-red-400 hover:underline text-lg" data-id="${d.id}" style="display: inline-block;">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  attachEntityActions('doctors');
  setTimeout(applyTableButtonPermissions, 100);
}

// تحديث دالة renderSubjects
function renderSubjects() {
  const container = document.getElementById('subjectsList');
  if (!container) return;

  if (subjects.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No subjects found</p>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-purple-600 to-pink-700">
          <tr>
            <th class="p-6 text-left text-xl">Code</th>
            <th class="p-6 text-left text-xl">Subject Name</th>
            <th class="p-6 text-left text-xl">Doctor Name</th>
            <th class="p-6 text-left text-xl">Level</th>
            <th class="p-6 text-left text-xl">Semester</th>
            <th class="p-6 text-left text-xl">Department</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${subjects.map(s => `
            <tr>
              <td class="p-6 font-mono font-bold">${s.code || 'N/A'}</td>
              <td class="p-6">${s.name}</td>
              <td class="p-6">${s.doctor_name || 'Not Assigned'}</td>
              <td class="p-6">Level ${s.level || 'N/A'}</td>
              <td class="p-6">${s.semester ? `Semester ${s.semester}` : 'N/A'}</td>
              <td class="p-6">${s.department || 'N/A'}</span></td>
              <td class="p-6">
                <button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${s.id}" style="display: inline-block;">Edit</button>
                <button class="delete-btn text-red-400 hover:underline text-lg" data-id="${s.id}" style="display: inline-block;">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  attachEntityActions('subjects');
  setTimeout(applyTableButtonPermissions, 100);
}

// تحديث دالة renderLectures
function renderLectures() {
  const container = document.getElementById('lecturesList');
  if (!container) return;

  if (lectures.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No lectures found</p>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-orange-600 to-red-700">
          <tr>
            <th class="p-6 text-left text-xl">Subject</th>
            <th class="p-6 text-left text-xl">Doctor</th>
            <th class="p-6 text-left text-xl">Level</th>
            <th class="p-6 text-left text-xl">Department</th>
            <th class="p-6 text-left text-xl">Day</th>
            <th class="p-6 text-left text-xl">Time</th>
            <th class="p-6 text-left text-xl">Location</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${lectures.map(l => `
            <tr>
              <td class="p-6">${l.subject_name || 'N/A'}</td>
              <td class="p-6">${l.doctor_name || 'N/A'}</td>
              <td class="p-6">
                  Level ${l.level || 'N/A'}
                </span>
              </td>
              <td class="p-6">${l.department || 'N/A'}</td>
              <td class="p-6">${l.day || 'N/A'}</td>
              <td class="p-6">${l.time_display || 'N/A'}</td>
              <td class="p-6">${l.location_name || 'N/A'}</td>
              <td class="p-6">
                <button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${l.id}" style="display: inline-block;">Edit</button>
                <button class="delete-btn text-red-400 hover:underline text-lg" data-id="${l.id}" style="display: inline-block;">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  attachEntityActions('lectures');
  setTimeout(applyTableButtonPermissions, 100);
}
// === SETUP PERMISSION OBSERVER ===
function setupPermissionObserver() {
  console.log('Setting up permission observer...');
  
  // تطبيق الصلاحيات كل ثانية (كحل احتياطي)
  setInterval(() => {
    applyTablePermissions();
  }, 1000);
  
  // مراقبة النقر على أزرار التنقل لإعادة تطبيق الصلاحيات
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTimeout(applyTablePermissions, 300);

          if (btn.dataset.section === 'teaching-assistants') {
      loadTeachingAssistants();
      updateSectionTitle();
      }
    });
  });
  // Add button listener
document.getElementById('addTaBtn')?.addEventListener('click', () => openTeachingAssistantModal('Add New Teaching Assistant'));
}
// إعداد مراقب لإعادة تطبيق الصلاحيات عند تغيير المحتوى
function setupPermissionsObserver() {
  const observer = new MutationObserver(() => {
    // تأخير صغير للتأكد من اكتمال التغييرات
    setTimeout(applyAllPermissions, 100);
  });
  
  // مراقبة التغييرات في قوائم العناصر
  const targets = ['studentsList', 'doctorsList', 'subjectsList', 'lecturesList'];
  targets.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      observer.observe(element, { childList: true, subtree: true });
    }
  });
}
// === EVENT DELEGATION FOR ENTITIES ===
function attachEntityActions(entity) {
  const container = document.getElementById(`${entity}List`);
  if (!container) return;

  container.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const id = parseInt(e.target.dataset.id);
      if (entity === 'students') openStudentModal('Edit Student', id);
      if (entity === 'doctors') openDoctorModal('Edit Doctor', id);
      if (entity === 'subjects') openSubjectModal('Edit Subject', id);
      if (entity === 'lectures') openLectureModal('Edit Lecture', id);
    }

    if (e.target.classList.contains('delete-btn')) {
      const id = parseInt(e.target.dataset.id);
      await deleteEntity(entity, id);
    }
  });
}

// === DELETE ENTITY WITH CONFIRMATION ===
async function deleteEntity(entity, id) {
  // استخدام المودال المخصص بدلاً من prompt
  showConfirmationModal({
    title: `Delete ${entity}`,
    message: `Are you sure you want to delete this ${entity}? This action will be logged and requires confirmation.`,
    icon: 'fa-trash-alt',
    iconColor: 'text-red-400',
    requireComment: true,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    onConfirm: async (comment) => {
      if (!comment || comment.trim() === '') {
        showCustomToast('A comment is required for deletion', 'error');
        return;
      }
      
      showCustomToast(`Deleting ${entity}...`, 'info');
      
      const res = await authenticatedFetch(`${DB_PATH}/${entity}/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationComment: comment.trim() })
      });
      
      if (res && res.ok) {
        showCustomToast(`${entity} deleted and logged to recycle bin`, 'success');
        await loadData();
        if (currentUser?.role === 'admin' || currentUser?.role === 'it') {
          await loadRecycleBin();
        }
      } else if (res && res.status === 400) {
        const error = await res.json();
        showCustomToast(error.message || 'Comment required', 'error');
      }
    }
  });
}

// === UPDATE ENTITY WITH CONFIRMATION ===
async function updateEntityWithConfirmation(entity, id, formData) {
  return new Promise((resolve) => {
    showConfirmationModal({
      title: `Edit ${entity}`,
      message: `Are you sure you want to edit this ${entity}? Please provide a comment explaining the changes.`,
      icon: 'fa-edit',
      iconColor: 'text-yellow-400',
      requireComment: true,
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      onConfirm: async (comment) => {
        if (!comment || comment.trim() === '') {
          showCustomToast('A comment is required for modifications', 'error');
          resolve(false);
          return;
        }
        
        // إضافة التعليق إلى البيانات
        const dataWithComment = {
          ...formData,
          confirmationComment: comment.trim()
        };
        
        showCustomToast(`Updating ${entity}...`, 'info');
        
        const res = await authenticatedFetch(`${DB_PATH}/${entity}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataWithComment)
        });
        
        if (res && res.ok) {
          showCustomToast(`${entity} updated and logged to recycle bin`, 'success');
          resolve(true);
        } else if (res && res.status === 400) {
          const error = await res.json();
          showCustomToast(error.message || 'Comment required', 'error');
          resolve(false);
        } else {
          resolve(false);
        }
      },
      onCancel: () => {
        resolve(false);
      }
    });
  });
}

// === FILTER STUDENTS ===
function filterAndRenderStudents() {
  const search = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  const level = document.getElementById('levelFilter')?.value || '';
  const dept = document.getElementById('deptFilter')?.value || '';

  let filtered = students;
  if (search) filtered = filtered.filter(s => s.name.toLowerCase().includes(search) || s.student_id.toLowerCase().includes(search));
  if (level) filtered = filtered.filter(s => s.level == level);
  if (dept) filtered = filtered.filter(s => s.department === dept);

  renderStudentsTable(filtered);
}

// === VERIFY DATA DIRECTLY ===
// استبدل الجزء الذي يعرض الـ Toast في نهاية دالة verifyRestoredData
async function verifyRestoredData() {
  console.log('🔍 Verifying restored data...');
  
  try {
    const token = localStorage.getItem('token');
    
    // قائمة جميع الـ endpoints
    const endpoints = [
      { name: 'students', url: `${DB_PATH}/students` },
      { name: 'doctors', url: `${DB_PATH}/doctors` },
      { name: 'subjects', url: `${DB_PATH}/subjects` },
      { name: 'lectures', url: `${DB_PATH}/lectures` }
    ];
    
    let verificationResults = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          verificationResults.push({
            name: endpoint.name,
            count: data.length,
            status: '✅',
            sample: data.length > 0 ? data[0] : null
          });
          
          console.log(`✅ ${endpoint.name}: ${data.length} records`);
        } else {
          verificationResults.push({
            name: endpoint.name,
            count: 0,
            status: '❌',
            error: `Status ${response.status}`
          });
          console.warn(`❌ ${endpoint.name}: Failed with status ${response.status}`);
        }
      } catch (error) {
        verificationResults.push({
          name: endpoint.name,
          count: 0,
          status: '❌',
          error: error.message
        });
        console.error(`❌ ${endpoint.name}: Error`, error);
      }
    }
    
    // التحقق من الملفات
    try {
      const filesResponse = await authenticatedFetch(`${DB_PATH}/files-status`);
      
      if (filesResponse && filesResponse.ok) {
        const filesData = await filesResponse.json();
        console.log('📁 Server files status:', filesData);
        
        // عرض نتائج التحقق في Toast
        let verificationMessage = '🔍 <strong>Data Verification Results</strong><br><br>';
        
        verificationResults.forEach(result => {
          verificationMessage += `${result.status} <strong>${result.name}:</strong> ${result.count} records<br>`;
        });
        
        verificationMessage += `<br><strong>📁 Files Status:</strong><br>`;
        verificationMessage += `• Total files: ${filesData.files?.length || 0}<br>`;
        verificationMessage += `• Missing files: ${filesData.missingFiles?.length || 0}<br>`;
        
        if (filesData.missingFiles?.length > 0) {
          verificationMessage += `• <span class="text-red-400">Missing: ${filesData.missingFiles.join(', ')}</span>`;
        }
        
        showCustomToast(verificationMessage, 'success'); // استخدم showCustomToast بدلاً من showToast
        
      } else {
        showCustomToast('⚠️ Could not verify files status', 'warning'); // استخدم showCustomToast
      }
    } catch (filesError) {
      console.warn('Could not verify files:', filesError);
      showCustomToast('⚠️ Files verification skipped', 'warning'); // استخدم showCustomToast
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    showCustomToast('❌ Verification failed', 'error'); // استخدم showCustomToast
  }
}

// === CREATE PAGE HEADER الموحدة لجميع التقارير ===
function createPageHeader(doc, pageNumber, totalPages, totalRecords, reportTitle = 'Report', filters = {}) {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 10;
  
  try {
    // خلفية الهيدر
    doc.setFillColor(79, 70, 229); // لون indigo
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // محاولة إضافة اللوجو
    try {
      // استخدام مسار اللوجو مباشرة
      doc.addImage('logo.png', 'PNG', margin, 5, 25, 25);
    } catch (e) {
      console.log('Could not add logo image, using text instead');
      // إذا فشل تحميل اللوجو، نكتب النص بدلاً منه
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 12.5, 5 + 12.5, 12, 'F');
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('T', margin + 9, 5 + 18);
    }
    
    // عنوان النظام
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TRAXA SYSTEM MANAGEMENT', margin + 30, 15);
    
    // عنوان التقرير (ديناميكي)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(reportTitle, margin + 30, 22);
    
    // معلومات الصفحة والسجلات
    doc.setFontSize(8);
    const startRecord = ((pageNumber - 1) * 25) + 1;
    const endRecord = Math.min(pageNumber * 25, totalRecords);
    doc.text(`Page ${pageNumber} of ${totalPages} | Records ${startRecord} to ${endRecord} of ${totalRecords}`, 
             margin + 30, 28);
    
    // تاريخ التوليد
    doc.setTextColor(200, 200, 255);
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 28, { align: 'right' });
    
    // خط فاصل أسفل الهيدر
    doc.setDrawColor(255, 255, 255, 100);
    doc.setLineWidth(0.3);
    doc.line(margin, 35, pageWidth - margin, 35);
    
    doc.setTextColor(0, 0, 0);
    
    // إضافة معلومات الفلاتر إذا وجدت
    let filterY = 40;
    if (Object.keys(filters).length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      let filterText = 'Filters: ';
      const filterParts = [];
      
      if (filters.level) filterParts.push(`Level ${filters.level}`);
      if (filters.department) filterParts.push(filters.department);
      if (filters.semester) filterParts.push(`Semester ${filters.semester}`);
      if (filters.option) filterParts.push(filters.option);
      if (filters.doctor) filterParts.push(`Dr. ${filters.doctor}`);
      if (filters.date) filterParts.push(`Date: ${filters.date}`);
      
      filterText += filterParts.join(' • ');
      doc.text(filterText, margin, filterY);
      
      return filterY + 5;
    }
    
    return 40;
  } catch (error) {
    console.error('Error in createPageHeader:', error);
    return 40;
  }
}

// === SETUP REPORT FILTER FORM ===
function setupReportFilterForm() {
  const form = document.getElementById('reportFilterForm');
  if (form) {
    // إزالة المستمع القديم إذا كان موجوداً
    form.removeEventListener('submit', handleReportFilterSubmit);
    // إضافة مستمع جديد
    form.addEventListener('submit', handleReportFilterSubmit);
  }
}

// دالة منفصلة للتعامل مع إرسال النموذج
function handleReportFilterSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const reportType = form.dataset.reportType;
  
  console.log('Form submitted, reportType from dataset:', reportType);
  
  if (!reportType) {
    showToast('Please select a report type first', 'error');
    return;
  }

  const filters = {};

  if (['students', 'qr', 'subjects', 'lectures'].includes(reportType)) {
    const level = document.getElementById('filterLevel')?.value;
    if (level) filters.level = level;
  }

  if (['students', 'qr'].includes(reportType)) {
    const dept = document.getElementById('filterDepartment')?.value;
    if (dept) filters.department = dept;
  }

  if (reportType === 'subjects') {
    const sem = document.getElementById('filterSemester')?.value;
    if (sem) filters.semester = sem;
  }

  if (reportType === 'doctors') {
    const option = document.getElementById('filterOption')?.value;
    if (option) filters.option = option;
  }

  console.log('Filters collected:', filters);
  closeReportFilterModal();
  
  // استدعاء exportFilteredReport مع النوع من dataset
  exportFilteredReport(reportType, filters);
}

// عدل دالة openReportFilterModal لضمان إعداد النموذج
function openReportFilterModal(type) {
  console.log('Opening report filter modal for type:', type);
  
  if (!type) {
    showToast('Report type is not specified', 'error');
    return;
  }
  
  // حفظ النوع في data attribute للنموذج
  const form = document.getElementById('reportFilterForm');
  if (form) {
    form.dataset.reportType = type;
  }
  
  const titleEl = document.getElementById('reportFilterTitle');
  const fieldsContainer = document.getElementById('reportFilterFields');
  
  fieldsContainer.innerHTML = '';
  
  let title = '';
  let html = '';

  switch(type) {
    case 'students':
    case 'qr':
      title = type === 'students' ? 'Students Report Filter' : 'Student QR Codes Filter';
      html = `
        <div>
          <label class="block text-sm font-medium mb-2">Level</label>
          <select id="filterLevel" class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl">
            <option value="">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Department</label>
          <select id="filterDepartment" class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl">
            <option value="">All Departments</option>
            ${departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}
          </select>
        </div>
      `;
      break;

    case 'subjects':
      title = 'Subjects Report Filter';
      html = `
        <div>
          <label class="block text-sm font-medium mb-2">Level</label>
          <select id="filterLevel" class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl">
            <option value="">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Semester</label>
          <select id="filterSemester" class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl">
            <option value="">All Semesters</option>
            <option value="1">First Semester</option>
            <option value="2">Second Semester</option>
          </select>
        </div>
      `;
      break;

    case 'lectures':
      title = 'Lectures Report Filter';
      html = `
        <div>
          <label class="block text-sm font-medium mb-2">Level</label>
          <select id="filterLevel" class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl">
            <option value="">All Levels</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
            <option value="4">Level 4</option>
          </select>
        </div>
      `;
      break;

    case 'doctors':
      title = 'Doctors Report Filter';
      html = `
        <div>
          <label class="block text-sm font-medium mb-2">Report Options</label>
          <select id="filterOption" class="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl">
            <option value="all">All Doctors</option>
            <option value="active">Active Doctors Only</option>
            <option value="with-email">With Email Only</option>
          </select>
        </div>
      `;
      break;

    default:
      showToast(`Report type "${type}" is not supported`, 'error');
      return;
  }

  titleEl.textContent = title;
  fieldsContainer.innerHTML = html;
  
  document.getElementById('reportFilterModal').classList.remove('hidden');
}

function closeReportFilterModal() {
  document.getElementById('reportFilterModal').classList.add('hidden');
  // لا نحذف البيانات، فقط نخفي النافذة
}

// ربط النموذج
document.getElementById('reportFilterForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentReportType) {
    showToast('Please select a report type first', 'error');
    return;
  }

  const filters = {};

  if (['students', 'qr', 'subjects', 'lectures'].includes(currentReportType)) {
    const level = document.getElementById('filterLevel')?.value;
    if (level) filters.level = level;
  }

  if (['students', 'qr'].includes(currentReportType)) {
    const dept = document.getElementById('filterDepartment')?.value;
    if (dept) filters.department = dept;
  }

  if (currentReportType === 'subjects') {
    const sem = document.getElementById('filterSemester')?.value;
    if (sem) filters.semester = sem;
  }

  if (currentReportType === 'doctors') {
    const option = document.getElementById('filterOption')?.value;
    if (option) filters.option = option;
  }

  closeReportFilterModal();

  await exportFilteredReport(currentReportType, filters);
});

// دالة مساعدة لتحميل اللوجو
function loadLogoForPDF() {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // تحويل الصورة إلى data URL
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      
      // تخزين الصورة في عنصر مخفي لاستخدامها في PDF
      let logoContainer = document.getElementById('pdfLogoContainer');
      if (!logoContainer) {
        logoContainer = document.createElement('div');
        logoContainer.id = 'pdfLogoContainer';
        logoContainer.style.display = 'none';
        document.body.appendChild(logoContainer);
      }
      
      const logoImg = document.createElement('img');
      logoImg.id = 'reportLogo';
      logoImg.src = dataURL;
      logoContainer.appendChild(logoImg);
      
      resolve(dataURL);
    };
    img.onerror = () => {
      console.log('Could not load logo.png');
      resolve(null);
    };
    img.src = 'logo.png';
  });
}

// استدعاء هذه الدالة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  loadLogoForPDF();
});


// يُفضل وضع هذا الثابت في أعلى الملف (بعد المتغيرات العامة)

async function exportFilteredReport(type, filters = {}) {
  console.log('exportFilteredReport called → type:', type, 'filters:', filters);

  if (!type) {
    console.error('No report type specified');
    showToast('Report type is not specified', 'error');
    return;
  }

  console.log('Generating report for type:', type);

  let data = [];
  let title = '';
  let filenamePrefix = '';
  let isQR = false;

  switch (type) {
    case 'students':
      data = students.filter(s => {
        let match = true;
        if (filters.level) match = match && s.level === parseInt(filters.level);
        if (filters.department) match = match && s.department === filters.department;
        return match;
      });
      title = 'Students Report';
      filenamePrefix = 'students';
      break;

    case 'qr':
      data = students
        .filter(s => {
          let match = true;
          if (filters.level) match = match && s.level === parseInt(filters.level);
          if (filters.department) match = match && s.department === filters.department;
          return match;
        })
        .sort((a, b) => {
          if (a.level !== b.level) return a.level - b.level;
          if (a.department !== b.department) return a.department.localeCompare(b.department);
          return a.name.localeCompare(b.name);
        });
      title = 'Student QR Codes';
      filenamePrefix = 'qr_codes';
      isQR = true;
      break;

    case 'subjects':
      data = subjects.filter(s => {
        let match = true;
        if (filters.level) match = match && s.level === parseInt(filters.level);
        if (filters.semester) match = match && s.semester === parseInt(filters.semester);
        return match;
      });
      title = 'Subjects Report';
      filenamePrefix = 'subjects';
      break;

    case 'lectures':
      const filterLevel = filters.level ? parseInt(filters.level) : null;
      data = lectures.filter(l => {
        if (l.level === undefined || l.level === null) return false;
        if (!filterLevel) return true;
        return l.level == filterLevel;
      });
      title = 'Lectures Report';
      filenamePrefix = 'lectures';
      break;

    case 'doctors':
      data = doctors.filter(d => {
        if (!filters.option || filters.option === 'all') return true;
        if (filters.option === 'active') return d.active !== false;
        if (filters.option === 'with-email') return d.email && d.email !== '' && d.email !== 'null';
        return true;
      });
      title = 'Doctors Report';
      filenamePrefix = 'doctors';
      break;

    default:
      console.error('Unknown report type:', type);
      showToast(`Unknown report type: ${type}`, 'error');
      return;
  }

  if (data.length === 0) {
    showToast('No data found matching the selected filters', 'warning');
    return;
  }

  showToast(`Generating report (${data.length} records)...`, 'info');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;

    // حساب عدد الصفحات
    const recordsPerPage = 25;
    const totalPages = Math.ceil(data.length / recordsPerPage);
    
    let currentPage = 1;
    let dataIndex = 0;

    while (dataIndex < data.length) {
      if (currentPage > 1) {
        doc.addPage();
      }

      // إضافة الهيدر الموحد مع الفلاتر
      const startY = createPageHeader(doc, currentPage, totalPages, data.length, title, filters);

      // تحديد أعمدة الجدول حسب نوع التقرير
      let tableHead = [];
      let tableBody = [];

      if (type === 'students') {
        tableHead = [['Name', 'Student ID', 'Level', 'Department']];
        tableBody = data.slice(dataIndex, dataIndex + recordsPerPage).map(s => [
          s.name || '-',
          s.student_id || '-',
          `Level ${s.level}` || '-',
          s.department || '-'
        ]);
      } else if (type === 'subjects') {
        tableHead = [['Code', 'Subject Name', 'Doctor', 'Level', 'Semester']];
        tableBody = data.slice(dataIndex, dataIndex + recordsPerPage).map(s => [
          s.code || '-',
          s.name || '-',
          s.doctor_name || '-',
          s.level || '-',
          s.semester || '-'
        ]);
      } else if (type === 'lectures') {
        tableHead = [['Subject', 'Doctor', 'Level', 'Day', 'Time', 'Location']];
        tableBody = data.slice(dataIndex, dataIndex + recordsPerPage).map(l => [
          l.subject_name || '-',
          l.doctor_name || '-',
          l.level || '-',
          l.day || '-',
          l.time_display || '-',
          l.location_name || '-'
        ]);
      } else if (type === 'doctors') {
        tableHead = [['Name', 'Username', 'Email', 'Role']];
        tableBody = data.slice(dataIndex, dataIndex + recordsPerPage).map(d => [
          d.name || '-',
          d.username || '-',
          d.email || 'N/A',
          d.role || '-'
        ]);
      } else if (type === 'qr') {
        // لتقارير QR، نستخدم دالة منفصلة
        if (typeof downloadAllQRCodes === 'function') {
          const originalStudents = [...students];
          students = data;
          await downloadAllQRCodes();
          students = originalStudents;
          return;
        }
      }

      if (tableHead.length > 0 && tableBody.length > 0) {
        doc.autoTable({
          startY: startY,
          head: tableHead,
          body: tableBody,
          theme: 'grid',
          styles: { 
            fontSize: 9, 
            cellPadding: 3,
            halign: 'center',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [79, 70, 229], 
            textColor: 255,
            fontStyle: 'bold'
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 250] 
          },
          columnStyles: {
            0: { halign: 'left' }, // الاسم على اليسار
          }
        });
      }

      // إضافة تذييل الصفحة
      doc.setPage(currentPage);
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${currentPage} of ${totalPages}`, margin, pageHeight - 10);
      doc.text(`© ${new Date().getFullYear()} TRAXA System Management`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });

      dataIndex += recordsPerPage;
      currentPage++;
    }

    // إضافة صفحة ملخص في النهاية
    doc.addPage();
    createPageHeader(doc, currentPage, totalPages + 1, data.length, `${title} - Summary`, filters);
    
    let yPos = 50;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Summary Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Records: ${data.length}`, margin, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Type: ${title}`, margin, yPos);
    yPos += 7;
    doc.text(`Generated By: ${currentUser?.username || 'System'}`, margin, yPos);
    yPos += 7;
    doc.text(`Generated On: ${new Date().toLocaleString()}`, margin, yPos);
    
    if (Object.keys(filters).length > 0) {
      yPos += 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Applied Filters:', margin, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      if (filters.level) {
        doc.text(`• Level: ${filters.level}`, margin + 5, yPos);
        yPos += 5;
      }
      if (filters.department) {
        doc.text(`• Department: ${filters.department}`, margin + 5, yPos);
        yPos += 5;
      }
      if (filters.semester) {
        doc.text(`• Semester: ${filters.semester}`, margin + 5, yPos);
        yPos += 5;
      }
      if (filters.option) {
        doc.text(`• Option: ${filters.option}`, margin + 5, yPos);
        yPos += 5;
      }
    }

    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`${filenamePrefix}_report_${timestamp}.pdf`);

    showToast(`Report generated successfully (${data.length} records)`, 'success');
  } catch (err) {
    console.error('Error generating PDF:', err);
    showToast('Error generating report file', 'error');
  }
}

// === دالة generateReportPDF المعدلة ===
async function generateReportPDF(type, title, data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  
  let logoImage = null;
  const logoPromises = [];
  
  try {
    logoPromises.push(
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          logoImage = img;
          resolve();
        };
        img.onerror = () => {
          console.log('Could not load logo.png, using default');
          resolve();
        };
        img.src = 'logo.png';
      })
    );
    
    logoPromises.push(
      new Promise((resolve) => {
        setTimeout(() => {
          if (!logoImage) {
            const defaultLogo = new Image();
            defaultLogo.crossOrigin = 'Anonymous';
            defaultLogo.onload = () => {
              logoImage = defaultLogo;
              resolve();
            };
            defaultLogo.src = 'https://via.placeholder.com/60x60/4f46e5/ffffff?text=TRAXA';
          } else {
            resolve();
          }
        }, 1000);
      })
    );
    
    await Promise.race(logoPromises);
  } catch (logoError) {
    console.log('Logo loading skipped:', logoError);
  }
  
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10;
  
  let currentPage = 1;
  let dataIndex = 0;
  
  let columns = [];
  let columnWidths = [];
  let dataKeys = [];
  let columnAlignments = [];
  
  if (data.length > 0) {
    switch(type) {
      case 'students':
        columns = ['Name', 'Student ID', 'Level', 'Department'];
        columnWidths = [60, 30, 20, 50];
        dataKeys = ['name', 'student_id', 'level', 'department'];
        columnAlignments = ['left', 'center', 'center', 'left'];
        break;
      case 'doctors':
        columns = ['Name', 'Username', 'Email'];
        columnWidths = [70, 40, 70];
        dataKeys = ['name', 'username', 'email'];
        columnAlignments = ['left', 'left', 'left'];
        break;
      case 'subjects':
        columns = ['Code', 'Subject Name', 'Level', 'Semester', 'Doctor'];
        columnWidths = [25, 65, 20, 25, 55];
        dataKeys = ['code', 'name', 'level', 'semester', 'doctor_name'];
        columnAlignments = ['center', 'left', 'center', 'center', 'left'];
        break;
      case 'lectures':
        columns = ['Subject', 'Doctor', 'Day', 'Time', 'Location', 'Level'];
        columnWidths = [50, 45, 25, 30, 30, 20];
        dataKeys = ['subject_name', 'doctor_name', 'day', 'time_display', 'location_name', 'level'];
        columnAlignments = ['left', 'left', 'center', 'center', 'left', 'center'];
        break;
    }
  }
  
  const calculateRowHeight = (row) => {
    const lineHeight = 5;
    const padding = 2;
    let maxLines = 1;
    
    dataKeys.forEach((key, colIndex) => {
      const cellValue = row[key] !== undefined && row[key] !== null ? row[key].toString() : '';
      const maxWidth = columnWidths[colIndex] - 6;
      
      const splitTextIntoLines = (text, maxWidth) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.getStringUnitWidth(testLine) * doc.getFontSize() / doc.internal.scaleFactor;
          
          if (testWidth > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        return lines;
      };
      
      const lines = splitTextIntoLines(cellValue, maxWidth);
      if (lines.length > maxLines) {
        maxLines = lines.length;
      }
    });
    
    return (maxLines * lineHeight) + (padding * 2);
  };
  
  let yPos = 0;
  let firstPage = true;
  
  while (dataIndex < data.length) {
    if (!firstPage) {
      doc.addPage();
      currentPage++;
      yPos = 0;
    }
    
    const totalPages = Math.ceil(data.length / 20);
    createPageHeader(doc, currentPage, totalPages, data.length, logoImage, pageWidth, margin, title);
    
    const startY = 50;
    yPos = startY;
    
    const headerHeight = 8;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, pageWidth - 2 * margin, headerHeight, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    
    let currentX = margin;
    columns.forEach((column, idx) => {
      const colX = currentX + (columnWidths[idx] / 2);
      doc.text(column, colX, yPos + (headerHeight / 2) + 2, { align: 'center' });
      currentX += columnWidths[idx];
    });
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, yPos + headerHeight, pageWidth - margin, yPos + headerHeight);
    
    yPos += headerHeight;
    
    while (dataIndex < data.length && yPos < pageHeight - 30) {
      const row = data[dataIndex];
      const rowHeight = calculateRowHeight(row);
      
      if (yPos + rowHeight > pageHeight - 30) {
        break;
      }
      
      if (dataIndex % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 250, 250);
      }
      doc.rect(margin, yPos, pageWidth - 2 * margin, rowHeight, 'F');
      
      currentX = margin;
      
      dataKeys.forEach((key, colIndex) => {
        const cellValue = row[key] !== undefined && row[key] !== null ? row[key].toString() : '';
        const cellWidth = columnWidths[colIndex];
        const maxTextWidth = cellWidth - 4;
        
        const splitTextIntoLines = (text, maxWidth) => {
          const words = text.split(' ');
          const lines = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = doc.getStringUnitWidth(testLine) * doc.getFontSize() / doc.internal.scaleFactor;
            
            if (testWidth > maxWidth && currentLine !== '') {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          
          if (currentLine) {
            lines.push(currentLine);
          }
          
          return lines;
        };
        
        const lines = splitTextIntoLines(cellValue, maxTextWidth);
        const lineHeight = 5;
        const startYPos = yPos + (rowHeight / 2) - ((lines.length - 1) * lineHeight / 2);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        
        lines.forEach((line, lineIndex) => {
          const lineY = startYPos + (lineIndex * lineHeight);
          const cellX = currentX + (cellWidth / 2);
          
          if (columnAlignments[colIndex] === 'center') {
            doc.text(line, cellX, lineY, { align: 'center' });
          } else {
            doc.text(line, currentX + 2, lineY);
          }
        });
        
        currentX += cellWidth;
      });
      
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(margin, yPos + rowHeight, pageWidth - margin, yPos + rowHeight);
      
      yPos += rowHeight;
      dataIndex++;
    }
    
    doc.setPage(currentPage);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    
    doc.text(`Page ${currentPage}`, margin, pageHeight - 15);
    doc.text(`Total Records: ${data.length}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`© ${new Date().getFullYear()} TRAXA System Management`, pageWidth - margin, pageHeight - 15, { align: 'right' });
    
    firstPage = false;
  }
  
  addSummaryPage(doc, type, title, data, logoImage, pageWidth, pageHeight, margin, currentPage + 1);
  
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`${type}_report_${timestamp}.pdf`);
  showToast(`${title} Report downloaded successfully`, 'success');
}

// إضافة إلى script.js بعد دالة filterAndRenderStudents
function addSubjectFilters() {
  const subjectsSection = document.getElementById('subjectsSection');
  if (!subjectsSection) return;
  
  // إضافة حقول الفلترة قبل الجدول
  const filterHTML = `
    <div class="mb-8 bg-white/5 rounded-2xl p-6">
      <div class="flex flex-wrap gap-4 items-end">
        <div class="flex-1 min-w-60">
          <label class="block text-sm font-medium mb-2">Search by Code or Name</label>
          <input type="text" id="subjectSearch" placeholder="Type to search..." 
                 class="w-full px-4 py-2 bg-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"/>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Level</label>
          <select id="subjectLevelFilter" class="px-4 py-2 bg-white/10 rounded-xl text-sm">
            <option value="">All Levels</option>
            ${[1, 2, 3, 4].map(l => `<option value="${l}">Level ${l}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">Semester</label>
          <select id="subjectSemesterFilter" class="px-4 py-2 bg-white/10 rounded-xl text-sm">
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </div>
        <button onclick="filterAndRenderSubjects()" class="btn-gradient px-6 py-3 rounded-xl text-sm font-semibold">Search</button>
      </div>
    </div>
  `;
  
  const currentContent = subjectsSection.innerHTML;
  subjectsSection.innerHTML = currentContent.replace(
    '<div id="subjectsList"',
    `${filterHTML}<div id="subjectsList"`
  );
}

// تحديث دالة filterAndRenderSubjects
function filterAndRenderSubjects() {
  const search = document.getElementById('subjectSearch')?.value.toLowerCase().trim() || '';
  const level = document.getElementById('subjectLevelFilter')?.value || '';
  const semester = document.getElementById('subjectSemesterFilter')?.value || '';
  const department = document.getElementById('subjectDeptFilter')?.value || '';
  
  console.log('Filtering subjects with:', { search, level, semester, department });
  
  let filtered = subjects;
  
  if (search) {
    filtered = filtered.filter(s => 
      (s.code && s.code.toLowerCase().includes(search)) || 
      (s.name && s.name.toLowerCase().includes(search)) ||
      (s.doctor_name && s.doctor_name.toLowerCase().includes(search)) ||
      (s.department && s.department.toLowerCase().includes(search))
    );
  }
  
  if (level) filtered = filtered.filter(s => s.level == level);
  if (semester) filtered = filtered.filter(s => s.semester == semester);
  if (department) filtered = filtered.filter(s => s.department === department);
  
  console.log(`Filtered ${filtered.length} subjects`);
  
  renderSubjectsTable(filtered);
}
function renderSubjectsTable(data = subjects) {
  const container = document.getElementById('subjectsList');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No subjects found</p>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-purple-600 to-pink-700">
          <tr>
            <th class="p-6 text-left text-xl">Code</th>
            <th class="p-6 text-left text-xl">Subject Name</th>
            <th class="p-6 text-left text-xl">Doctor Name</th>
            <th class="p-6 text-left text-xl">Level</th>
            <th class="p-6 text-left text-xl">Semester</th>
            <th class="p-6 text-left text-xl">Department</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${data.map(s => `
            <tr>
              <td class="p-6 font-mono font-bold">${s.code || 'N/A'}</td>
              <td class="p-6">${s.name}</td>
              <td class="p-6">${s.doctor_name || 'Not Assigned'}</td>
              <td class="p-6">Level ${s.level || 'N/A'}</td>
              <td class="p-6">${s.semester ? `Semester ${s.semester}` : 'N/A'}</td>
              <td class="p-6">
                <span class="px-3 py-1 bg-indigo-600/30 rounded-full text-sm">${s.department || 'N/A'}</span>
              </td>
              <td class="p-6">
                ${hasPermission('btn.subjects.edit') ? `<button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${s.id}">Edit</button>` : ''}
                ${hasPermission('btn.subjects.delete') ? `<button class="delete-btn text-red-400 hover:underline text-lg" data-id="${s.id}">Delete</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  attachEntityActions('subjects');
  
  // إعادة تطبيق الصلاحيات بعد عرض الجدول
  if (typeof applyAllPermissions === 'function') {
    setTimeout(applyAllPermissions, 100);
  }
}

// إضافة في loadData() بعد populateSelects();
addSubjectFilters();

// === دالة addSummaryPage المعدلة ===
function addSummaryPage(doc, type, title, data, logoImage, pageWidth, pageHeight, margin, pageNumber) {
  doc.addPage();
  
  const totalPages = Math.ceil(data.length / 20) + 1;
  createPageHeader(doc, pageNumber, totalPages, data.length, logoImage, pageWidth, margin, `${title} - Summary`);
  
  let yPos = 50;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Summary Report', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total ${title}: ${data.length}`, margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Report generated on: ${new Date().toLocaleString()}`, margin, yPos);
  yPos += 15;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Detailed Breakdown:', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  switch(type) {
    case 'students':
      const levelStats = {};
      data.forEach(student => {
        levelStats[student.level] = (levelStats[student.level] || 0) + 1;
      });
      
      Object.keys(levelStats).sort().forEach(level => {
        const count = levelStats[level];
        const percentage = ((count / data.length) * 100).toFixed(1);
        doc.text(`• Level ${level}: ${count} students (${percentage}%)`, margin + 10, yPos);
        yPos += 6;
      });
      
      yPos += 5;
      
      const deptStats = {};
      data.forEach(student => {
        deptStats[student.department] = (deptStats[student.department] || 0) + 1;
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Department Distribution:', margin, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      Object.entries(deptStats).forEach(([dept, count]) => {
        const percentage = ((count / data.length) * 100).toFixed(1);
        doc.text(`• ${dept}: ${count} students (${percentage}%)`, margin + 10, yPos);
        yPos += 6;
      });
      break;
      
    case 'doctors':
      doc.text(`• Total Doctors: ${data.length}`, margin + 10, yPos);
      yPos += 8;
      
      const withEmail = data.filter(d => d.email && d.email !== 'null').length;
      const withoutEmail = data.length - withEmail;
      doc.text(`• With Email: ${withEmail}`, margin + 10, yPos);
      yPos += 6;
      doc.text(`• Without Email: ${withoutEmail}`, margin + 10, yPos);
      break;
      
    case 'subjects':
      const subjectLevelStats = {};
      data.forEach(subject => {
        subjectLevelStats[subject.level] = (subjectLevelStats[subject.level] || 0) + 1;
      });
      
      Object.keys(subjectLevelStats).sort().forEach(level => {
        const count = subjectLevelStats[level];
        const percentage = ((count / data.length) * 100).toFixed(1);
        doc.text(`• Level ${level}: ${count} subjects (${percentage}%)`, margin + 10, yPos);
        yPos += 6;
      });
      
      yPos += 5;
      
      const doctorStats = {};
      data.forEach(subject => {
        const doctor = subject.doctor_name || 'Not Assigned';
        doctorStats[doctor] = (doctorStats[doctor] || 0) + 1;
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Assigned Doctors:', margin, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      Object.entries(doctorStats).forEach(([doctor, count]) => {
        doc.text(`• ${doctor}: ${count} subjects`, margin + 10, yPos);
        yPos += 6;
      });
      break;
      
    case 'lectures':
      const dayStats = {};
      data.forEach(lecture => {
        dayStats[lecture.day] = (dayStats[lecture.day] || 0) + 1;
      });
      
      Object.entries(dayStats).forEach(([day, count]) => {
        const percentage = ((count / data.length) * 100).toFixed(1);
        doc.text(`• ${day}: ${count} lectures (${percentage}%)`, margin + 10, yPos);
        yPos += 6;
      });
      
      yPos += 5;
      
      const lectureLevelStats = {};
      data.forEach(lecture => {
        lectureLevelStats[lecture.level] = (lectureLevelStats[lecture.level] || 0) + 1;
      });
      
      doc.setFont('helvetica', 'bold');
      doc.text('Level Distribution:', margin, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      Object.keys(lectureLevelStats).sort().forEach(level => {
        const count = lectureLevelStats[level];
        const percentage = ((count / data.length) * 100).toFixed(1);
        doc.text(`• Level ${level}: ${count} lectures (${percentage}%)`, margin + 10, yPos);
        yPos += 6;
      });
      break;
  }
  
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Information:', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`• This report contains ${data.length} records`, margin + 10, yPos);
  yPos += 5;
  doc.text('• All text is preserved without truncation', margin + 10, yPos);
  yPos += 5;
  doc.text('• Suitable for official documentation and printing', margin + 10, yPos);
  
  doc.setPage(pageNumber);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`© ${new Date().getFullYear()} TRAXA System Management - Summary Page`, 
           pageWidth / 2, pageHeight - 10, { align: 'center' });
}

// === CHECK FILES STATUS ===
async function checkFilesStatus() {
  console.log('🔍 Checking all files status...');
  
  try {
    const response = await authenticatedFetch(`${DB_PATH}/files-status`);
    if (!response || !response.ok) {
      console.error('Failed to get files status');
      return;
    }
    
    const data = await response.json();
    console.log('📁 Files Status:', data);
    
    // عرض تفاصيل
    data.files.forEach(file => {
      const status = file.isValid ? '✅' : '❌';
      const empty = file.isEmpty ? ' (EMPTY!)' : '';
      console.log(`${status} ${file.name}: ${file.records} records${empty}`);
    });
    
    if (data.missingFiles.length > 0) {
      console.warn('⚠️ Missing files:', data.missingFiles);
    }
    
    // التحقق من الملفات المهمة
    const criticalFiles = ['students.json', 'subjects.json', 'locations.json'];
    criticalFiles.forEach(filename => {
      const file = data.files.find(f => f.name === filename);
      if (!file) {
        console.error(`❌ CRITICAL: ${filename} not found!`);
      } else if (file.isEmpty) {
        console.error(`❌ CRITICAL: ${filename} is EMPTY!`);
      }
    });
    
  } catch (error) {
    console.error('Error checking files:', error);
  }
}

// === USERS MANAGEMENT ===
async function showUsersManagement() {
  // إخفاء جميع الأقسام أولاً
  document.getElementById('usersManagementSection').classList.remove('hidden');
  
  // تأكد من إخفاء Recycle Bin عند فتح Users Management
  const recycleBinSection = document.getElementById('recyclebinSection');
  if (recycleBinSection) {
    recycleBinSection.classList.add('hidden');
  }
  
  await loadUsers();
}

// تحميل قائمة المستخدمين
async function loadUsers() {
  const res = await authenticatedFetch(`${DB_PATH}/users`);
  if (res && res.ok) {
    users = await res.json();
    renderUsersTable();
  } else {
    document.getElementById('usersList').innerHTML = '<p class="text-red-400 text-center text-2xl mt-20">Access denied or failed to load users</p>';
  }
}

// عرض جدول المستخدمين
// استبدل دالة renderUsersTable بهذه النسخة
function renderUsersTable() {
  const container = document.getElementById('usersList');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No users found</p>';
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
      <table class="w-full">
        <thead class="bg-gradient-to-r from-indigo-600 to-purple-600">
          <tr>
            <th class="p-6 text-left text-xl">Username</th>
            <th class="p-6 text-left text-xl">Role</th>
            <th class="p-6 text-left text-xl">Custom Permissions</th>
            <th class="p-6 text-left text-xl">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          ${users.map(u => {
            // التحقق من وجود صلاحيات مخصصة
            const hasCustomPermissions = u.permissions && Object.keys(u.permissions).length > 0;
            const statusClass = hasCustomPermissions ? 'bg-green-600' : 'bg-gray-600';
            const statusText = hasCustomPermissions ? 'Customized' : 'Default';
            
            return `
            <tr data-user-id="${u.id}">
              <td class="p-6">${u.username}</td>
              <td class="p-6">
                <span class="px-4 py-2 rounded-full text-lg font-medium ${u.role === 'admin' || u.role === 'it' ? 'bg-purple-600' : 'bg-blue-600'}">
                  ${u.role.toUpperCase()}
                </span>
              </td>
              <td class="p-6">
                <span class="px-3 py-1 ${statusClass} rounded-full text-sm">${statusText}</span>
              </td>
              <td class="p-6">
                <button class="permissions-btn text-teal-400 hover:underline text-lg mr-8" data-id="${u.id}">
                  <i class="fas fa-key mr-1"></i>Permissions
                </button>
                <button class="edit-btn text-yellow-400 hover:underline text-lg mr-8" data-id="${u.id}">
                  <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button class="delete-btn text-red-400 hover:underline text-lg" data-id="${u.id}">
                  <i class="fas fa-trash mr-1"></i>Delete
                </button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>`;

  attachUserActions();
}



// ربط أحداث أزرار المستخدمين
function attachUserActions() {
  const container = document.getElementById('usersList');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    if (e.target.closest('.permissions-btn')) {
      const btn = e.target.closest('.permissions-btn');
      const id = parseInt(btn.dataset.id);
      await openUserPermissionsModal(id);
    }
    
    if (e.target.closest('.edit-btn')) {
      const btn = e.target.closest('.edit-btn');
      const id = parseInt(btn.dataset.id);
      const user = users.find(u => u.id === id);
      openUserModal('Edit User', user);
    }
    
    if (e.target.closest('.delete-btn')) {
      const btn = e.target.closest('.delete-btn');
      const id = parseInt(btn.dataset.id);
      await deleteUser(id);
    }
  });
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  const res = await authenticatedFetch(`${DB_PATH}/users/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    showToast('User deleted successfully', 'success');
    await loadUsers();
  }
}

// === CREATE BACKUP ===
// استبدل الجزء الذي يعرض الـ Toast في دالة createBackup
async function createBackup() {
  const card = event.target.closest('.card');
  if (!card) return;

  const originalHTML = card.innerHTML;
  card.style.opacity = '0.6';
  card.style.pointerEvents = 'none';
  card.innerHTML = '<i class="fas fa-spinner fa-spin text-7xl mb-6"></i><h3 class="text-3xl font-bold">Creating Backup...</h3>';

  const res = await authenticatedFetch(`${DB_PATH}/backup`, { method: 'POST' });
  const data = res ? await res.json() : null;

  showCustomToast(data?.message || 'Backup failed', res?.ok ? 'success' : 'error'); // استخدم showCustomToast

  card.style.opacity = '1';
  card.style.pointerEvents = 'auto';
  card.innerHTML = originalHTML;
}

// === RESTORE BACKUP ===
async function restoreBackup() {
  console.log('=== RESTORE BACKUP INITIATED ===');
  
  const isServerRunning = await checkServerConnection();
  if (!isServerRunning) {
    showToast('❌ Server is not running. Please start the server first.', 'error');
    return;
  }
  
  const fileInput = document.getElementById('restoreInput');
  if (!fileInput) {
    showToast('Restore file input not found', 'error');
    return;
  }

  fileInput.click();

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) {
      fileInput.value = '';
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.zip')) {
      showToast('❌ Invalid file type. Please select a .zip backup file', 'error');
      fileInput.value = '';
      return;
    }

    console.log('Selected file:', {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      type: file.type
    });

    if (!confirm('⚠️ WARNING: This will overwrite ALL current data!\n\nThis action cannot be undone.\n\nContinue?')) {
      fileInput.value = '';
      return;
    }
    
    if (!confirm('⚠️ FINAL CONFIRMATION:\n\nAre you absolutely sure you want to restore from this backup?\n\nThis will replace ALL current students, doctors, subjects, lectures, and settings.')) {
      fileInput.value = '';
      return;
    }

    const restoreCard = document.querySelector('#managementCards > .card:nth-child(3)');
    let originalHTML = '';
    if (restoreCard) {
      originalHTML = restoreCard.innerHTML;
      restoreCard.style.opacity = '0.6';
      restoreCard.style.pointerEvents = 'none';
      restoreCard.innerHTML = '<i class="fas fa-spinner fa-spin text-7xl mb-6"></i><h3 class="text-3xl font-bold">Restoring...</h3><p class="mt-4">Replacing database folder...</p>';
    }

    const formData = new FormData();
    formData.append('backup', file);

    try {
      console.log('Sending restore request to server...');
      const startTime = Date.now();
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${DB_PATH}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const endTime = Date.now();
      console.log(`Request took ${endTime - startTime}ms`);
      console.log('Response status:', response.status, response.statusText);

      let result = {};
      try {
        result = await response.json();
        console.log('Server response:', result);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (response.ok) {
        let successMessage = '✅ <strong>Database Restored Successfully!</strong><br><br>';
        
        if (result.stats) {
          successMessage += '<strong>📊 Loaded Statistics:</strong><br>';
          successMessage += `• <strong>Students:</strong> ${result.stats.students || 0}<br>`;
          successMessage += `• <strong>Doctors:</strong> ${result.stats.doctors || 0}<br>`;
          successMessage += `• <strong>Subjects:</strong> ${result.stats.subjects || 0}<br>`;
          successMessage += `• <strong>Lectures:</strong> ${result.stats.lectures || 0}<br>`;
          successMessage += `• <strong>Users:</strong> ${result.stats.users || 0}<br>`;
        }
        
        if (result.files) {
          successMessage += `<br><strong>📁 Files Found:</strong> ${result.files.length} files`;
        }
        
        if (result.missingFiles && result.missingFiles.length > 0) {
          successMessage += `<br><br><strong>⚠️ Note:</strong> Created empty files for: ${result.missingFiles.join(', ')}`;
        }
        
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        
        if (toast && toastMessage && toastIcon) {
          toastMessage.innerHTML = successMessage;
          toastIcon.className = 'fas fa-check-circle text-green-400 text-3xl';
          toast.classList.remove('hidden');
          
          setTimeout(() => {
            toast.classList.add('hidden');
          }, 8000);
        } else {
          alert(successMessage.replace(/<br>/g, '\n').replace(/<[^>]*>/g, ''));
        }

        console.log('✅ Restore successful! Reloading data...');
        
        setTimeout(async () => {
          try {
            console.log('🔄 Reloading all data from server...');
            
            await checkFilesStatus();
            
            try {
              const statsResponse = await authenticatedFetch(`${DB_PATH}/stats`);
              if (statsResponse && statsResponse.ok) {
                const serverStats = await statsResponse.json();
                console.log('📊 Server stats after restore:', serverStats);
                
                if (serverStats.students === 0 && result.stats?.students > 0) {
                  console.warn('⚠️ Warning: Students count mismatch!');
                  showToast('⚠️ Warning: Students data may not have restored properly', 'warning');
                }
              }
            } catch (statsError) {
              console.warn('Could not load stats:', statsError);
            }
            
            await loadData();
            
            console.log('✅ Full data reload completed');
            showToast('✅ All data reloaded and verified', 'success');
            
          } catch (error) {
            console.error('❌ Error during reload:', error);
            showToast('⚠️ Restore completed but reload failed', 'warning');
          }
        }, 2000);

      } else {
        let errorMessage = '❌ Restore Failed';
        
        if (result.error) {
          errorMessage += `: ${result.error}`;
        } else if (response.status === 400) {
          errorMessage += ': Bad Request - Invalid file format';
        } else if (response.status === 403) {
          errorMessage += ': Access Denied - You do not have permission';
        } else if (response.status === 500) {
          errorMessage += ': Server Error - Please check server logs';
        }
        
        console.error('Restore failed:', errorMessage, result);
        showToast(errorMessage, 'error');
      }

    } catch (networkError) {
      console.error('Network error during restore:', networkError);
      showToast('❌ Network Error: Could not connect to server. Make sure server is running on port 3000', 'error');
    } finally {
      if (restoreCard) {
        restoreCard.style.opacity = '1';
        restoreCard.style.pointerEvents = 'auto';
        restoreCard.innerHTML = originalHTML;
      }
      
      fileInput.value = '';
      
      console.log('=== RESTORE PROCESS COMPLETED ===');
    }
  };
}

// تحديث دالة openStudentModal
function openStudentModal(title, id = null) {
  console.log(`Opening student modal: ${title}, ID: ${id}`);
  
  const existingModal = document.getElementById('studentModal');
  if (existingModal) existingModal.remove();
  
  const student = id ? students.find(s => s.id === id) : null;
  
  // إعادة تعيين مصفوفة الصور
  currentDescriptors = [];
  
  let qrCodeHTML = '';
  if (student) {
    const qrData = JSON.stringify({
      id: student.id,
      name: student.name,
      student_id: student.student_id,
      level: student.level,
      department: student.department
    });
    
    qrCodeHTML = `
      <div class="mt-8 pt-8 border-t border-white/10">
        <h3 class="text-xl font-bold mb-4">Student QR Code</h3>
        <div class="bg-white p-4 rounded-xl inline-block">
          <div id="studentQRCode" class="mx-auto"></div>
        </div>
        <div class="mt-4">
          <p class="text-sm text-gray-300">QR Code contains student information for quick scanning</p>
          <button type="button" onclick="downloadStudentQRCode(${student.id})" 
                  class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
            <i class="fas fa-download mr-2"></i>Download QR Code
          </button>
        </div>
      </div>
    `;
  }
  
  const modalHTML = `
    <div id="studentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">${title}</h2>
          <button onclick="document.getElementById('studentModal').remove(); stopCamera();" 
                  class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form id="studentForm" class="space-y-6">
          <input type="hidden" id="studentIdHidden" value="${id || ''}">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-2">Full Name *</label>
              <input type="text" id="studentName" required 
                     value="${student?.name || ''}"
                     class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Student ID *</label>
              <input type="text" id="studentId" required 
                     value="${student?.student_id || ''}"
                     class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Level *</label>
              <select id="studentLevel" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Level</option>
                ${[1,2,3,4].map(l => `<option value="${l}" ${student?.level === l ? 'selected' : ''}>Level ${l}</option>`).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Department *</label>
              <select id="studentDepartment" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Department</option>
                ${departments.map(dept => 
                  `<option value="${dept.name}" ${student?.department === dept.name ? 'selected' : ''}>${dept.name}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          
<div class="mt-8">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-xl font-bold">Face Recognition Photos (10 photos required)</h3>
    <span id="photoCounter" class="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold">0 / 10</span>
  </div>
  
  <div class="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-xl mb-4">
    <p class="text-sm">
      <i class="fas fa-info-circle mr-2"></i>
      Please take 10 photos from different angles. The system will detect your face automatically.
    </p>
  </div>
  
  <div id="cameraContainer" class="bg-black rounded-xl p-4 mb-4">
    <div class="relative">
      <video id="cameraPreview" autoplay playsinline class="w-full rounded-xl"></video>
    </div>
    <div class="flex gap-4 mt-4">
      <button type="button" onclick="captureFacePhoto()" id="captureBtn" 
              class="btn-gradient px-6 py-3 rounded-xl" disabled>
        <i class="fas fa-camera mr-2"></i>Capture Face
      </button>
      <button type="button" onclick="toggleCamera()" class="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl">
        <i class="fas fa-sync-alt mr-2"></i>Switch Camera
      </button>
    </div>
    <div id="faceStatus" class="mt-3 text-sm text-yellow-400">
      <i class="fas fa-spinner fa-spin mr-2"></i>
      Detecting face...
    </div>
  </div>
  
  <div id="photosPreview" class="grid grid-cols-5 gap-2 mt-4">
    <!-- سيتم إضافة الصور هنا ديناميكياً -->
  </div>
</div>
          
          ${qrCodeHTML}
          
          <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
            <button type="button" onclick="document.getElementById('studentModal').remove(); stopCamera();" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancel</button>
            <button type="submit" id="saveStudentBtn" class="btn-gradient px-8 py-3 rounded-xl">Save Student</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // تشغيل الكاميرا
  setTimeout(() => startCamera(), 100);
  
  // إذا كان في وضع التعديل، قم بتحميل الصور الموجودة
  if (id) {
    loadExistingPhotos(id);
  } else {
    // وضع الإضافة - أنشئ مصفوفة فارغة
    currentDescriptors = [];
    updatePhotoCounter();
    updateCaptureButton();
    
    // إضافة 10 أماكن فارغة للصور
    renderEmptyPhotoSlots();
  }
  
  // إضافة مستمع للنموذج
  document.getElementById('studentForm').addEventListener('submit', handleStudentFormSubmit);
}


// دالة لعرض 10 أماكن فارغة للصور
function renderEmptyPhotoSlots() {
  const container = document.getElementById('photosPreview');
  if (!container) return;
  let html = '';
  for (let i = 0; i < 10; i++) {
    if (currentDescriptors && currentDescriptors[i]) {
      // عرض الصورة الموجودة
      html += `<div class="relative">...<img src="${currentDescriptors[i].image}" />...</div>`;
    } else {
      // عرض خانة فارغة
      html += `<div class="relative bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 h-24 flex items-center justify-center">...${i+1}...</div>`;
    }
  }
  container.innerHTML = html;
}

// تحميل الصور الموجودة للطالب
async function loadExistingPhotos(studentId) {
  const photos = await loadFaceDescriptors(studentId);
  currentDescriptors = photos || [];
  
  console.log(`Loaded ${currentDescriptors.length} existing photos for student ${studentId}`);
  
  // عرض الصور الموجودة
  renderEmptyPhotoSlots();
  updatePhotoCounter();
  updateCaptureButton();
}



// تحديث عداد الصور
function updatePhotoCounter() {
  const counter = document.getElementById('photoCounter');
  if (counter) {
    const count = currentDescriptors ? currentDescriptors.length : 0;
    counter.textContent = `${count} / 10`;
    
    if (count === 10) {
      counter.className = 'px-4 py-2 bg-green-600 rounded-lg text-sm font-bold';
    } else if (count >= 5) {
      counter.className = 'px-4 py-2 bg-yellow-600 rounded-lg text-sm font-bold';
    } else {
      counter.className = 'px-4 py-2 bg-red-600 rounded-lg text-sm font-bold';
    }
  }
}

// تحديث زر الالتقاط
function updateCaptureButton() {
  const captureBtn = document.getElementById('captureBtn');
  const saveBtn = document.getElementById('saveStudentBtn');
  
  if (captureBtn) {
    const count = currentDescriptors ? currentDescriptors.length : 0;
    captureBtn.disabled = count >= 10;
    if (count >= 10) {
      captureBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      captureBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
  
  if (saveBtn) {
    const count = currentDescriptors ? currentDescriptors.length : 0;
    if (count === 10) {
      saveBtn.classList.remove('opacity-50');
      saveBtn.disabled = false;
    } else {
      saveBtn.classList.add('opacity-50');
      saveBtn.disabled = true;
    }
  }
}

// دالة لالتقاط الصورة
function capturePhoto() {
  if (currentDescriptors.length >= 10) {
    showToast('Maximum 10 photos reached', 'warning');
    return;
  }
  
  const video = document.getElementById('cameraPreview');
  if (!video) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  canvas.getContext('2d').drawImage(video, 0, 0, 320, 240);
  
  const photoData = canvas.toDataURL('image/jpeg', 0.8);
  currentDescriptors.push(photoData);
  
  renderEmptyPhotoSlots();
  updatePhotoCounter();
  updateCaptureButton();
  
  showToast(`Photo ${currentDescriptors.length} of 10 captured`, 'success');
}

// دالة لإزالة صورة
function removePhoto(index) {
  if (currentDescriptors && index >= 0 && index < currentDescriptors.length) {
    currentDescriptors.splice(index, 1);
    renderEmptyPhotoSlots();
    updatePhotoCounter();
    updateCaptureButton();
    showToast('Photo removed', 'info');
  }
}

// دالة معالجة إرسال النموذج
async function handleStudentFormSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('studentIdHidden').value;
  
  // التحقق من وجود 10 صور
  if (!currentDescriptors || currentDescriptors.length !== 10) {
    showToast('Please capture exactly 10 face photos', 'warning');
    return;
  }
  
  // تعطيل الزر مؤقتاً
  const saveBtn = document.getElementById('saveStudentBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
  }
  
  // تجهيز بيانات الطالب مع صور الوجه
  const studentData = {
    id: id ? parseInt(id) : null,
    name: document.getElementById('studentName').value.trim(),
    student_id: document.getElementById('studentId').value.trim(),
    level: parseInt(document.getElementById('studentLevel').value),
    department: document.getElementById('studentDepartment').value,
    face_data: {
      has_face: true,
      photos: currentDescriptors.map(f => f.image),
      descriptors: currentDescriptors.map(f => f.descriptor),
      updated_at: new Date().toISOString()
    }
  };
  
  const url = id ? `${DB_PATH}/students/${id}` : `${DB_PATH}/students`;
  const method = id ? 'PUT' : 'POST';
  
  try {
    const response = await authenticatedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    
    if (response && response.ok) {
      showToast(id ? 'Student updated successfully!' : 'Student added successfully!', 'success');
      
      // إغلاق المودال وتنظيف
      document.getElementById('studentModal').remove();
      stopCamera();
      if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
      }
      
      // إعادة تحميل البيانات
      await loadData();
    } else {
      showToast('Failed to save student', 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Student';
      }
    }
  } catch (error) {
    console.error('Error saving student:', error);
    showToast('Error saving student: ' + error.message, 'error');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Student';
    }
  }
}


function generateStudentQRCode(student) {
  if (!student || !window.QRCode) return;
  
  const qrContainer = document.getElementById('studentQRCode');
  if (!qrContainer) return;
  
  qrContainer.innerHTML = '';
  
  const qrData = JSON.stringify({
    id: student.id,
    name: student.name,
    student_id: student.student_id,
    level: student.level,
    department: student.department,
    timestamp: new Date().toISOString()
  });
  
  new QRCode(qrContainer, {
    text: qrData,
    width: 200,
    height: 200,
    colorDark: '#1e293b',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}

function downloadStudentQRCode(studentId) {
  const student = students.find(s => s.id === studentId);
  if (!student) return;
  
  const qrContainer = document.getElementById('studentQRCode');
  if (!qrContainer) return;
  
  const canvas = qrContainer.querySelector('canvas');
  if (!canvas) return;
  
  const link = document.createElement('a');
  link.download = `student_${student.student_id}_qr.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  showToast(`QR Code for ${student.name} downloaded`, 'success');
}

function openDoctorModal(title, id = null) {
  console.log(`Opening doctor modal: ${title}, ID: ${id}`);
  
  const existingModal = document.getElementById('doctorModal');
  if (existingModal) existingModal.remove();
  
  const doctor = id ? doctors.find(d => d.id === id) : null;
  
  const modalHTML = `
    <div id="doctorModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-lg p-8">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">${title}</h2>
          <button onclick="document.getElementById('doctorModal').remove()" 
                  class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form id="doctorForm" class="space-y-6">
          <input type="hidden" id="doctorIdHidden" value="${id || ''}">
          
          <div>
            <label class="block text-sm font-medium mb-2">Full Name *</label>
            <input type="text" id="doctorName" required 
                   value="${doctor?.name || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Username *</label>
            <input type="text" id="doctorUsername" required 
                   value="${doctor?.username || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input type="email" id="doctorEmail" 
                   value="${doctor?.email || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">${id ? 'New Password (leave empty to keep current)' : 'Password *'}</label>
            <div class="relative">
              <input type="password" id="doctorPassword" ${id ? '' : 'required'}
                     class="w-full px-4 py-3 bg-white/10 rounded-xl text-white pr-12">
              <button type="button" onclick="togglePasswordVisibility('doctorPassword')" 
                      class="absolute right-4 top-3 text-gray-400">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
            <button type="button" onclick="document.getElementById('doctorModal').remove()" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancel</button>
            <button type="submit" class="btn-gradient px-8 py-3 rounded-xl">Save Doctor</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  document.getElementById('doctorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('doctorName').value.trim(),
      username: document.getElementById('doctorUsername').value.trim(),
      email: document.getElementById('doctorEmail').value.trim() || null
    };
    
    const password = document.getElementById('doctorPassword').value.trim();
    if (password || !id) {
      formData.password = password || 'default123';
    }
    
    if (id) {
      // تعديل مع تعليق
      const success = await updateEntityWithConfirmation('doctors', id, formData);
      if (success) {
        document.getElementById('doctorModal').remove();
        await loadData();
      }
    } else {
      // إضافة جديدة
      const url = `${DB_PATH}/doctors`;
      const res = await authenticatedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res && res.ok) {
        showToast('Doctor added successfully', 'success');
        document.getElementById('doctorModal').remove();
        await loadData();
      }
    }
  });
}

function openSubjectModal(title, id = null) {
  console.log(`Opening subject modal: ${title}, ID: ${id}`);
  
  const existingModal = document.getElementById('subjectModal');
  if (existingModal) existingModal.remove();
  
  const subject = id ? subjects.find(s => s.id === id) : null;
  
  const modalHTML = `
    <div id="subjectModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-lg p-8">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">${title}</h2>
          <button onclick="document.getElementById('subjectModal').remove()" 
                  class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form id="subjectForm" class="space-y-6">
          <input type="hidden" id="subjectIdHidden" value="${id || ''}">
          
          <div>
            <label class="block text-sm font-medium mb-2">Subject Code *</label>
            <input type="text" id="subjectCode" required 
                   value="${subject?.code || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white font-mono"
                   placeholder="e.g., MATH101, CS101">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Subject Name *</label>
            <input type="text" id="subjectName" required 
                   value="${subject?.name || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Assigned Doctor *</label>
            <select id="subjectDoctorSelect" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
              <option value="">Select Doctor</option>
              ${doctors.map(doctor => `
                <option value="${doctor.id}" ${subject?.doctor_id === doctor.id ? 'selected' : ''}>
                  ${doctor.name}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Level *</label>
              <select id="subjectLevel" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Level</option>
                ${[1, 2, 3, 4].map(l => `
                  <option value="${l}" ${subject?.level === l ? 'selected' : ''}>Level ${l}</option>
                `).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Semester *</label>
              <select id="subjectSemester" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Semester</option>
                ${[1, 2].map(s => `
                  <option value="${s}" ${subject?.semester === s ? 'selected' : ''}>Semester ${s}</option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Department *</label>
            <select id="subjectDepartment" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
              <option value="">Select Department</option>
              ${departments.map(dept => `
                <option value="${dept.name}" ${subject?.department === dept.name ? 'selected' : ''}>${dept.name}</option>
              `).join('')}
            </select>
          </div>
          
          <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
            <button type="button" onclick="document.getElementById('subjectModal').remove()" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancel</button>
            <button type="submit" class="btn-gradient px-8 py-3 rounded-xl">Save Subject</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  document.getElementById('subjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const doctorId = parseInt(document.getElementById('subjectDoctorSelect').value);
    const doctor = doctors.find(d => d.id === doctorId);
    
    const formData = {
      code: document.getElementById('subjectCode').value.trim(),
      name: document.getElementById('subjectName').value.trim(),
      doctor_id: doctorId,
      doctor_name: doctor?.name || 'Not Assigned',
      level: parseInt(document.getElementById('subjectLevel').value),
      semester: parseInt(document.getElementById('subjectSemester').value),
      department: document.getElementById('subjectDepartment').value
    };
    
    if (id) {
      // تعديل مع تعليق
      const success = await updateEntityWithConfirmation('subjects', id, formData);
      if (success) {
        document.getElementById('subjectModal').remove();
        await loadData();
      }
    } else {
      // إضافة جديدة
      const url = `${DB_PATH}/subjects`;
      const res = await authenticatedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res && res.ok) {
        showToast('Subject added successfully', 'success');
        document.getElementById('subjectModal').remove();
        await loadData();
      }
    }
  });
}

function openLectureModal(title, id = null) {
  console.log(`Opening lecture modal: ${title}, ID: ${id}`);
  
  const existingModal = document.getElementById('lectureModal');
  if (existingModal) existingModal.remove();
  
  const lecture = id ? lectures.find(l => l.id === id) : null;
  
  const modalHTML = `
    <div id="lectureModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-2xl p-8">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-white">${title}</h2>
          <button onclick="document.getElementById('lectureModal').remove()" 
                  class="text-gray-400 hover:text-white text-3xl">&times;</button>
        </div>
        
        <form id="lectureForm" class="space-y-6">
          <input type="hidden" id="lectureIdHidden" value="${id || ''}">
          <input type="hidden" id="originalDay" value="${lecture?.day || ''}">
          <input type="hidden" id="originalTimeslot" value="${lecture?.timeslot_id || ''}">
          <input type="hidden" id="originalLocation" value="${lecture?.location_id || ''}">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-2">Level *</label>
              <select id="lectureLevel" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Level</option>
                ${[1,2,3,4].map(l => `
                  <option value="${l}" ${lecture?.level == l ? 'selected' : ''}>Level ${l}</option>
                `).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Department *</label>
              <select id="lectureDepartment" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Department</option>
                ${departments.map(dept => `
                  <option value="${dept.name}" ${lecture?.department === dept.name ? 'selected' : ''}>
                    ${dept.name}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Subject *</label>
              <select id="lectureSubject" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
                <option value="">Select Subject (choose level first)</option>
                ${lecture ? `
                  <option value="${lecture.subject_id}" selected>
                    ${lecture.subject_name || 'Selected Subject'}
                  </option>
                ` : ''}
              </select>
              <p class="text-xs text-gray-400 mt-1">Subjects will appear after selecting level</p>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Assigned Doctor</label>
              <input type="text" id="lectureDoctorName" readonly
                     value="${lecture?.doctor_name || ''}"
                     class="w-full px-4 py-3 bg-white/5 rounded-xl text-gray-400"
                     placeholder="Doctor will be auto-filled from subject">
            </div>
            <input type="hidden" id="lectureDoctorId" value="${lecture?.doctor_id || ''}">
            
            <div>
              <label class="block text-sm font-medium mb-2">Day *</label>
              <select id="lectureDay" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white" onchange="checkLocationAvailability()">
                <option value="">Select Day</option>
                ${days.map(day => `
                  <option value="${day}" ${lecture?.day === day ? 'selected' : ''}>${day}</option>
                `).join('')}
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-2">Time Slot *</label>
              <select id="lectureTime" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white" onchange="checkLocationAvailability()">
                <option value="">Select Time</option>
                ${timeslots.map(slot => `
                  <option value="${slot.id}" ${lecture?.timeslot_id === slot.id ? 'selected' : ''}>
                    ${slot.display || `${slot.time} - ${getNextTimeSlot(slot.time)}`}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="col-span-2">
              <label class="block text-sm font-medium mb-2">Location *</label>
              <div class="relative">
                <select id="lectureLocation" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white" onchange="checkLocationAvailability()">
                  <option value="">Select Location</option>
                  ${locations.map(loc => `
                    <option value="${loc.id}" 
                            data-name="${loc.name}"
                            ${lecture?.location_id === loc.id ? 'selected' : ''}>
                      ${loc.name} (${loc.type || 'Room'})
                    </option>
                  `).join('')}
                </select>
                <div id="locationAvailabilityMessage" class="mt-2 text-sm hidden"></div>
              </div>
            </div>
          </div>
          
          <div id="conflictWarning" class="bg-red-600/20 border border-red-500 rounded-xl p-4 hidden">
            <p class="text-red-400 font-semibold flex items-center gap-2">
              <i class="fas fa-exclamation-triangle"></i>
              <span id="conflictMessage"></span>
            </p>
          </div>
          
          <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
            <button type="button" onclick="document.getElementById('lectureModal').remove()" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancel</button>
            <button type="submit" id="submitLectureBtn" class="btn-gradient px-8 py-3 rounded-xl">Save Lecture</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // إضافة event listener لتحديث المواد عند اختيار المستوى
  document.getElementById('lectureLevel').addEventListener('change', function() {
    updateSubjectsForLevel(this.value);
  });
  
  // إذا كان هناك lecture محرر، قم بتحديث المواد
  if (lecture?.level) {
    setTimeout(() => {
      updateSubjectsForLevel(lecture.level);
    }, 100);
  }
  
  document.getElementById('lectureForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // التحقق من عدم وجود تعارض قبل الحفظ
    if (!await validateLectureSubmission()) {
      return;
    }
    
    const subjectId = parseInt(document.getElementById('lectureSubject').value);
    const subject = subjects.find(s => s.id === subjectId);
    const doctorId = parseInt(document.getElementById('lectureDoctorId').value);
    const doctor = doctors.find(d => d.id === doctorId);
    const time = timeslots.find(t => t.id == document.getElementById('lectureTime').value);
    const location = locations.find(l => l.id == document.getElementById('lectureLocation').value);
    
    const formData = {
      subject_id: subjectId,
      subject_name: subject?.name || '',
      doctor_id: doctorId,
      doctor_name: doctor?.name || '',
      level: parseInt(document.getElementById('lectureLevel').value),
      department: document.getElementById('lectureDepartment').value,
      day: document.getElementById('lectureDay').value,
      timeslot_id: parseInt(document.getElementById('lectureTime').value),
      time_display: time ? (time.display || time.time) : '',
      location_id: parseInt(document.getElementById('lectureLocation').value),
      location_name: location?.name || '',
      active: true
    };
    
    if (id) {
      // تعديل مع تعليق
      const success = await updateEntityWithConfirmation('lectures', id, formData);
      if (success) {
        document.getElementById('lectureModal').remove();
        await loadData();
      }
    } else {
      // إضافة جديدة
      const url = `${DB_PATH}/lectures`;
      const res = await authenticatedFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res && res.ok) {
        showToast('Lecture added successfully', 'success');
        document.getElementById('lectureModal').remove();
        await loadData();
      }
    }
  });
}
// دالة للتحقق من توفر المكان والوقت
async function checkLocationAvailability() {
  const day = document.getElementById('lectureDay')?.value;
  const timeslotId = document.getElementById('lectureTime')?.value;
  const locationId = document.getElementById('lectureLocation')?.value;
  const lectureId = document.getElementById('lectureIdHidden')?.value;
  const conflictWarning = document.getElementById('conflictWarning');
  const conflictMessage = document.getElementById('conflictMessage');
  const submitBtn = document.getElementById('submitLectureBtn');
  
  if (!day || !timeslotId || !locationId) {
    conflictWarning.classList.add('hidden');
    submitBtn.disabled = false;
    return true;
  }
  
  // التحقق من وجود تعارض
  const isConflict = await checkConflict(day, parseInt(timeslotId), parseInt(locationId), lectureId ? parseInt(lectureId) : null);
  
  if (isConflict.hasConflict) {
    conflictWarning.classList.remove('hidden');
    conflictMessage.innerHTML = isConflict.message;
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    return false;
  } else {
    conflictWarning.classList.add('hidden');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    return true;
  }
}
// دالة للتحقق من التعارض مع المحاضرات الأخرى
async function checkConflict(day, timeslotId, locationId, currentLectureId = null) {
  // جلب جميع المحاضرات
  const response = await authenticatedFetch(`${DB_PATH}/lectures`);
  if (!response || !response.ok) {
    return { hasConflict: false };
  }
  
  const allLectures = await response.json();
  
  // التحقق من وجود محاضرة في نفس اليوم والوقت والمكان
  const conflictingLecture = allLectures.find(lecture => {
    // تجاهل المحاضرة الحالية إذا كنا في وضع التعديل
    if (currentLectureId && lecture.id === currentLectureId) {
      return false;
    }
    
    return lecture.day === day && 
           lecture.timeslot_id === timeslotId && 
           lecture.location_id === locationId;
  });
  
  if (conflictingLecture) {
    return {
      hasConflict: true,
      message: `This location is already booked for ${conflictingLecture.subject_name} (Level ${conflictingLecture.level}) at the same time.`
    };
  }
  
  // التحقق من أن المحاضرة الجديدة لا تتعارض مع محاضرة أخرى لنفس الدكتور في نفس اليوم بفارق أقل من ساعتين
  const doctorId = parseInt(document.getElementById('lectureDoctorId')?.value);
  
  if (doctorId) {
    // الحصول على وقت المحاضرة الحالية
    const selectedTimeSlot = timeslots.find(t => t.id === timeslotId);
    if (!selectedTimeSlot) return { hasConflict: false };
    
    const selectedTime = timeToMinutes(selectedTimeSlot.time);
    
    // التحقق من جميع محاضرات نفس الدكتور في نفس اليوم
    for (const lecture of allLectures) {
      if (currentLectureId && lecture.id === currentLectureId) continue;
      if (lecture.doctor_id !== doctorId) continue;
      if (lecture.day !== day) continue;
      
      const lectureTimeSlot = timeslots.find(t => t.id === lecture.timeslot_id);
      if (!lectureTimeSlot) continue;
      
      const lectureTime = timeToMinutes(lectureTimeSlot.time);
      const timeDifference = Math.abs(selectedTime - lectureTime);
      
      // إذا كان الفرق أقل من 120 دقيقة (ساعتين)
      if (timeDifference < 120) {
        const hours = Math.floor(timeDifference / 60);
        const minutes = timeDifference % 60;
        const diffText = hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : '';
        const minText = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}` : '';
        const gapText = [diffText, minText].filter(Boolean).join(' and ');
        
        return {
          hasConflict: true,
          message: `This conflicts with another lecture for the same doctor. Minimum gap of 2 hours required (current gap: ${gapText || 'less than 2 hours'}).`
        };
      }
    }
  }
  
  return { hasConflict: false };
}
// دالة مساعدة لتحويل الوقت إلى دقائق
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  
  // تنسيق الوقت المتوقع: "09:00" أو "9:00 AM"
  let hours = 0, minutes = 0;
  
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    hours = parseInt(parts[0]);
    minutes = parseInt(parts[1]?.substring(0, 2) || 0);
    
    // التعامل مع تنسيق AM/PM
    if (timeStr.includes('PM') && hours < 12) hours += 12;
    if (timeStr.includes('AM') && hours === 12) hours = 0;
  }
  
  return hours * 60 + minutes;
}
// دالة للحصول على وقت التالي (للعرض)
function getNextTimeSlot(time) {
  if (!time) return '';
  
  let hours = 0, minutes = 0;
  
  if (time.includes(':')) {
    const parts = time.split(':');
    hours = parseInt(parts[0]);
    minutes = parseInt(parts[1]?.substring(0, 2) || 0);
    
    // التعامل مع AM/PM
    const isPM = time.includes('PM');
    const isAM = time.includes('AM');
    
    minutes += 90; // إضافة ساعة ونصف
    
    if (minutes >= 60) {
      hours += Math.floor(minutes / 60);
      minutes = minutes % 60;
    }
    
    // تنسيق الناتج
    let nextHours = hours;
    let nextMinutes = minutes.toString().padStart(2, '0');
    let period = '';
    
    if (isPM || isAM) {
      if (nextHours >= 12) {
        period = ' PM';
        if (nextHours > 12) nextHours -= 12;
      } else {
        period = ' AM';
        if (nextHours === 0) nextHours = 12;
      }
    }
    
    return `${nextHours.toString().padStart(2, '0')}:${nextMinutes}${period}`;
  }
  
  return '';
}

// دالة للتحقق من صحة الإرسال
async function validateLectureSubmission() {
  return await checkLocationAvailability();
}

// دالة لتحديث قائمة المواد حسب المستوى


// تحديث دالة updateSubjectsForLevel (موجودة بالفعل، نضيف لها استدعاء التحقق)
function updateSubjectsForLevel(level) {
  const subjectSelect = document.getElementById('lectureSubject');
  if (!subjectSelect) return;
  
  const doctorNameInput = document.getElementById('lectureDoctorName');
  const doctorIdInput = document.getElementById('lectureDoctorId');
  
  subjectSelect.innerHTML = '<option value="">Select Subject</option>';
  doctorNameInput.value = '';
  doctorIdInput.value = '';
  
  if (!level) return;
  
  const filteredSubjects = subjects.filter(s => s.level == level);
  
  if (filteredSubjects.length === 0) {
    subjectSelect.innerHTML = '<option value="">No subjects found for this level</option>';
    return;
  }
  
  filteredSubjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject.id;
    option.textContent = `${subject.code} - ${subject.name}`;
    option.dataset.doctorId = subject.doctor_id;
    option.dataset.doctorName = subject.doctor_name || 'Not Assigned';
    subjectSelect.appendChild(option);
  });
  
  subjectSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption.value) {
      doctorIdInput.value = selectedOption.dataset.doctorId || '';
      doctorNameInput.value = selectedOption.dataset.doctorName || 'Not Assigned';
      
      // إعادة التحقق من توفر المكان بعد تغيير الدكتور
      setTimeout(checkLocationAvailability, 100);
    } else {
      doctorIdInput.value = '';
      doctorNameInput.value = '';
    }
  });
  
  // إذا كان هناك قيمة محددة مسبقاً، قم بتحديدها
  const lectureId = document.getElementById('lectureIdHidden')?.value;
  if (lectureId) {
    const lecture = lectures.find(l => l.id === parseInt(lectureId));
    if (lecture) {
      setTimeout(() => {
        subjectSelect.value = lecture.subject_id;
        const event = new Event('change');
        subjectSelect.dispatchEvent(event);
      }, 200);
    }
  }
}

function openUserModal(title, user = null) {
  console.log(`Opening user modal: ${title}`, user);
  
  const existingModal = document.getElementById('userModal');
  if (existingModal) existingModal.remove();
  
  const modalHTML = `
    <div id="userModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div class="bg-gray-900 rounded-2xl w-full max-w-lg p-8">
        <div class="flex justify-between items-center mb-8">
          <h2 class="text-3xl font-bold text-white">${title}</h2>
          <button onclick="document.getElementById('userModal').remove()" 
                  class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form id="userForm" class="space-y-6">
          <input type="hidden" id="userIdHidden" value="${user?.id || ''}">
          
          <div>
            <label class="block text-sm font-medium mb-2">Username *</label>
            <input type="text" id="userUsername" required 
                   value="${user?.username || ''}"
                   class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">${user ? 'New Password (leave empty to keep current)' : 'Password *'}</label>
            <div class="relative">
              <input type="password" id="userPassword" ${user ? '' : 'required'}
                     class="w-full px-4 py-3 bg-white/10 rounded-xl text-white pr-12">
              <button type="button" onclick="togglePasswordVisibility('userPassword')" 
                      class="absolute right-4 top-3 text-gray-400">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Role *</label>
            <select id="userRole" required class="w-full px-4 py-3 bg-white/10 rounded-xl text-white">
              <option value="">Select Role</option>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="it" ${user?.role === 'it' ? 'selected' : ''}>IT</option>
              <option value="mng" ${user?.role === 'mng' ? 'selected' : ''}>Manager</option>
              <option value="emp" ${user?.role === 'emp' ? 'selected' : ''}>Employee</option>
            </select>
          </div>
          
          <div class="flex justify-end gap-4 pt-8 border-t border-white/10">
            <button type="button" onclick="document.getElementById('userModal').remove()" 
                    class="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl">Cancel</button>
            <button type="submit" class="btn-gradient px-8 py-3 rounded-xl">Save User</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      username: document.getElementById('userUsername').value.trim(),
      role: document.getElementById('userRole').value
    };
    
    const password = document.getElementById('userPassword').value.trim();
    if (password || !user) {
      formData.password = password || 'default123';
    }
    
    const url = user ? `${DB_PATH}/users/${user.id}` : `${DB_PATH}/users`;
    const method = user ? 'PUT' : 'POST';
    
    const res = await authenticatedFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res && res.ok) {
      showToast('User saved successfully', 'success');
      document.getElementById('userModal').remove();
      await loadUsers();
    }
  });
}

// === HELPER FUNCTIONS ===
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.parentElement.querySelector('i');
  if (input && icon) {
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  }
}

// دوال الكاميرا المحسنة
function startCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 }
    } 
  })
    .then(stream => {
      videoStream = stream;
      const video = document.getElementById('cameraPreview');
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          // بدء كشف الوجه بعد تشغيل الكاميرا
          setTimeout(startFaceDetection, 500);
        };
      }
    })
    .catch(err => {
      console.error('Camera error:', err);
      showToast('Could not access camera', 'error');
    });
}

function stopCamera() {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
    faceDetectionInterval = null;
  }
  
  // إزالة canvas الرسم
  const overlay = document.getElementById('faceOverlay');
  if (overlay) overlay.remove();
  
  if (videoStream) {
    videoStream.getTracks().forEach(track => {
      track.stop();
    });
    videoStream = null;
  }
}

function toggleCamera() {
  stopCamera();
  setTimeout(() => {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    })
      .then(stream => {
        videoStream = stream;
        const video = document.getElementById('cameraPreview');
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play();
          };
        }
      })
      .catch(err => {
        console.error('Camera error:', err);
        showToast('Could not access camera', 'error');
      });
  }, 300);
}

// دالة للتحقق من جودة الصور
function validatePhotos() {
  if (!currentDescriptors || currentDescriptors.length !== 10) {
    return {
      valid: false,
      message: 'You must capture exactly 10 photos'
    };
  }
  
  // التحقق من أن جميع الصور ليست مكررة بشكل كبير (اختياري)
  const uniqueImages = new Set(currentDescriptors);
  if (uniqueImages.size < 5) {
    return {
      valid: false,
      message: 'Photos are too similar. Please take photos from different angles'
    };
  }
  
  return {
    valid: true,
    message: 'Photos are valid'
  };
}

function capturePhoto() {
  const video = document.getElementById('cameraPreview');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  const photoData = canvas.toDataURL('image/jpeg');
  currentDescriptors.push(photoData);
  
  const container = document.getElementById('photosPreview');
  if (container) {
    container.innerHTML += `
      <div class="relative">
        <img src="${photoData}" class="w-full h-32 object-cover rounded-xl">
        <button type="button" onclick="removePhoto(${currentDescriptors.length - 1})" 
                class="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8">×</button>
      </div>
    `;
  }
}

function removePhoto(index) {
  currentDescriptors.splice(index, 1);
  const container = document.getElementById('photosPreview');
  if (container) {
    container.innerHTML = currentDescriptors.map((photo, idx) => `
      <div class="relative">
        <img src="${photo}" class="w-full h-32 object-cover rounded-xl">
        <button type="button" onclick="removePhoto(${idx})" 
                class="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8">×</button>
      </div>
    `).join('');
  }
}
// دالة مساعدة لتنسيق النص في PDF
function splitTextToFit(text, maxWidth, doc, fontSize = 10) {
  doc.setFontSize(fontSize);
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = doc.getStringUnitWidth(currentLine + ' ' + word) * fontSize / doc.internal.scaleFactor;
    
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
// === GENERATE QR CODES ===
async function downloadAllQRCodes() {
  if (students.length === 0) {
    showToast('No students found for QR codes', 'warning');
    return;
  }
  
  showToast('Generating QR codes for all students... 📋', 'success');
  
  try {
    const qrContainer = document.createElement('div');
    qrContainer.style.position = 'absolute';
    qrContainer.style.left = '-9999px';
    qrContainer.style.top = '-9999px';
    qrContainer.style.backgroundColor = 'white';
    document.body.appendChild(qrContainer);
    
    const qrPromises = students.map(async (student, index) => {
      return new Promise((resolve) => {
        const qrDiv = document.createElement('div');
        qrDiv.style.display = 'inline-block';
        qrDiv.style.margin = '8px';
        qrDiv.style.textAlign = 'center';
        qrDiv.style.width = '170px';
        qrDiv.style.padding = '6px';
        qrDiv.style.border = '1px solid #e5e7eb';
        qrDiv.style.borderRadius = '6px';
        qrDiv.style.backgroundColor = 'white';
        qrDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        qrDiv.style.verticalAlign = 'top';
        
        try {
          new QRCode(qrDiv, {
            text: JSON.stringify({
              id: student.id,
              name: student.name,
              student_id: student.student_id,
              level: student.level,
              department: student.department,
              generated: new Date().toISOString()
            }),
            width: 120,
            height: 120,
            colorDark: '#1e293b',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.Q
          });
        } catch (qrError) {
          console.error('Error creating QR code:', qrError);
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.style.marginTop = '6px';
        infoDiv.style.padding = '0 2px';
        infoDiv.style.wordBreak = 'break-word';
        infoDiv.style.overflowWrap = 'break-word';
        infoDiv.innerHTML = `
          <div style="font-weight: bold; font-size: 12px; color: #1e293b; line-height: 1.2; margin-bottom: 2px;">
            ${student.name}
          </div>
          <div style="font-size: 10px; color: #64748b; line-height: 1.2; margin-bottom: 1px;">
            <strong>ID:</strong> ${student.student_id}
          </div>
          <div style="font-size: 10px; color: #64748b; line-height: 1.2; margin-bottom: 1px;">
            <strong>Level:</strong> ${student.level}
          </div>
          <div style="font-size: 10px; color: #64748b; line-height: 1.2; margin-bottom: 2px;">
            <strong>Dept:</strong> ${student.department}
          </div>
          <div style="font-size: 9px; color: #94a3b8; font-style: italic;">
            Card #${index + 1}
          </div>
        `;
        qrDiv.appendChild(infoDiv);
        qrContainer.appendChild(qrDiv);
        
        // تأخير صغير للتأكد من اكتمال رسم QR
        setTimeout(() => {
          const canvas = qrDiv.querySelector('canvas');
          if (canvas) {
            try {
              resolve({
                name: student.name,
                student_id: student.student_id,
                level: student.level,
                department: student.department,
                index: index + 1,
                total: students.length,
                url: canvas.toDataURL('image/png'),
                element: qrDiv
              });
            } catch (e) {
              console.error('Error converting canvas to data URL:', e);
              resolve(null);
            }
          } else {
            console.warn('No canvas found for student:', student.name);
            resolve(null);
          }
        }, 100);
      });
    });
    
    const qrImages = (await Promise.all(qrPromises)).filter(img => img !== null);
    
    if (qrImages.length === 0) {
      showToast('Failed to generate QR codes', 'error');
      document.body.removeChild(qrContainer);
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    
    const cols = 3;
    const rows = 3;
    const cardsPerPage = cols * rows;
    
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = pageHeight - 50;
    
    const cardWidth = availableWidth / cols - 5;
    const cardHeight = 65;
    
    const qrSize = 35;
    const qrTopMargin = 8;
    
    const spacingX = cardWidth + 5;
    const spacingY = cardHeight + 12;
    
    let currentPage = 1;
    let totalPages = Math.ceil(qrImages.length / cardsPerPage);
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const startIndex = pageIndex * cardsPerPage;
      const endIndex = Math.min(startIndex + cardsPerPage, qrImages.length);
      const pageStudents = qrImages.slice(startIndex, endIndex);
      
      if (pageIndex > 0) {
        doc.addPage();
        currentPage++;
      }
      
      // استخدام الهيدر الموحد
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // محاولة إضافة اللوجو
      try {
        doc.addImage('logo.png', 'PNG', margin, 5, 25, 25);
      } catch (e) {
        // إذا فشل اللوجو، نكتب حرف T
        doc.setFillColor(255, 255, 255);
        doc.circle(margin + 12.5, 5 + 12.5, 12, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('T', margin + 9, 5 + 18);
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('TRAXA SYSTEM MANAGEMENT', margin + 30, 15);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Student QR Codes', margin + 30, 22);
      
      doc.setFontSize(8);
      doc.text(`Page ${pageIndex + 1} of ${totalPages} | Cards ${startIndex + 1} to ${endIndex} of ${qrImages.length}`, 
               margin + 30, 28);
      
      doc.setTextColor(200, 200, 255);
      doc.setFontSize(7);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 28, { align: 'right' });
      
      doc.setDrawColor(255, 255, 255, 100);
      doc.setLineWidth(0.3);
      doc.line(margin, 35, pageWidth - margin, 35);
      
      let x = margin;
      let y = 50;
      let cardIndex = 0;
      
      for (let row = 0; row < rows; row++) {
        x = margin;
        
        for (let col = 0; col < cols; col++) {
          if (cardIndex < pageStudents.length) {
            const qr = pageStudents[cardIndex];
            
            // إطار البطاقة
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');
            
            doc.setDrawColor(79, 70, 229, 30);
            doc.setLineWidth(0.2);
            doc.roundedRect(x + 0.5, y + 0.5, cardWidth - 1, cardHeight - 1, 2.5, 2.5, 'S');
            
            // إضافة QR code
            const qrX = x + (cardWidth - qrSize) / 2;
            doc.addImage(qr.url, 'PNG', qrX, y + qrTopMargin, qrSize, qrSize);
            
            // إضافة معلومات الطالب
            let currentY = y + qrTopMargin + qrSize + 6;
            
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 30);
            
            // اسم الطالب (قد يكون طويلاً)
            const nameLines = doc.splitTextToSize(qr.name, cardWidth - 10);
            doc.text(nameLines[0] || qr.name, x + cardWidth / 2, currentY, { align: 'center' });
            currentY += 4;
            
            if (nameLines.length > 1) {
              doc.text(nameLines[1], x + cardWidth / 2, currentY, { align: 'center' });
              currentY += 4;
            }
            
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(60, 60, 60);
            doc.text(`ID: ${qr.student_id}`, x + cardWidth / 2, currentY, { align: 'center' });
            currentY += 4;
            
            doc.setFont('helvetica', 'bold');
            doc.text(`Level ${qr.level}`, x + cardWidth / 2, currentY, { align: 'center' });
            
            cardIndex++;
          }
          
          x += spacingX;
        }
        
        y += spacingY;
      }
      
      // تذييل الصفحة
      doc.setPage(currentPage);
      doc.setFontSize(6);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${pageIndex + 1} of ${totalPages}`, margin, pageHeight - 10);
      doc.text(`© ${new Date().getFullYear()} TRAXA System Management`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`TRAXA_QR_Codes_${timestamp}_${qrImages.length}_Students.pdf`);
    
    showToast(`✅ Generated ${qrImages.length} QR codes in ${totalPages} pages`, 'success');
    
    // تنظيف
    document.body.removeChild(qrContainer);
    
  } catch (error) {
    console.error('QR Code generation error:', error);
    showToast('❌ Error: ' + error.message, 'error');
  }
}

// إضافة زر لتنزيل QR Codes في قسم التقارير
function addQRCodeButton() {
  const reportsSection = document.getElementById('reportsSection');
  if (reportsSection && !document.getElementById('qrCodesCard')) {
    const qrCard = document.createElement('button');
    qrCard.id = 'qrCodesCard';
    qrCard.onclick = downloadAllQRCodes;
    qrCard.className = 'card bg-gradient-to-br from-cyan-600 to-blue-700 p-8 rounded-2xl text-center shadow-xl';
    qrCard.innerHTML = `
      <i class="fas fa-qrcode icon-lg mb-4"></i>
      <h3 class="text-xl font-bold">Student QR Codes</h3>
      <p class="mt-2 text-sm opacity-90">Download all student QR codes</p>
    `;
    
    const grid = reportsSection.querySelector('.grid');
    if (grid) {
      grid.appendChild(qrCard);
    }
  }
}

// === DOM CONTENT LOADED ===
document.addEventListener('DOMContentLoaded', () => {
  // Login Form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Logging in...';
    submitBtn.disabled = true;

    try {
      const res = await fetch(`${DB_PATH}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        // تخزين بيانات المستخدم مع التأكد من وجود id
        const userData = {
          id: data.user.id,
          username: data.user.username,
          role: data.user.role
        };
        
        currentUser = userData;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        // إظهار شاشة التحميل
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        // تحميل الصلاحيات للمستخدم
        await loadUserPermissions();
        
        // تحميل البيانات
        await loadData();
        
        // إخفاء شاشة التحميل
        document.getElementById('loadingOverlay').classList.add('hidden');
        
        showCustomToast(`Welcome, ${currentUser.username} (${currentUser.role.toUpperCase()})`, 'success');
      } else {
        showCustomToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showCustomToast('Server not running or network error', 'error');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Logout
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Navigation
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'managementBtn' && !hasPermission('manage')) {
        showCustomToast('Access denied: Admin/IT only', 'error');
        return;
      }

      // تحديث حالة الأزرار النشطة
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('bg-white/20', 'active'));
      btn.classList.add('bg-white/20', 'active');

      // إخفاء جميع الأقسام
      document.querySelectorAll('[id$="Section"]').forEach(sec => sec.classList.add('hidden'));
      
      // إظهار القسم المحدد فقط
      const target = document.getElementById(btn.dataset.section + 'Section');
      if (target) {
        target.classList.remove('hidden');
      }

      // تحديث عنوان الصفحة
      updateSectionTitle();

      // تحميل البيانات حسب القسم المحدد
      if (btn.dataset.section === 'students') {
        filterAndRenderStudents();
      }
      if (btn.dataset.section === 'management') {
        // إظهار قسم Users Management فقط، دون إخفاء أي شيء من الـ Sidebar
        document.getElementById('usersManagementSection').classList.remove('hidden');
        applyDetailedPermissions();
      }
      if (btn.dataset.section === 'recyclebin') {
        loadRecycleBin();
        updateSectionTitle();
      }
      if (btn.dataset.section === 'student-login') {
        loadStudentLoginData();
        updateSectionTitle();
        
        // تحديث زر Refresh عند فتح القسم
        setTimeout(() => {
          updateRefreshButton();
        }, 500);
      }
      if (btn.dataset.section === 'teaching-assistants') {
        console.log('Loading teaching assistants section...');
        loadTeachingAssistants();
        updateSectionTitle();
      }
    });
  });

  // Add Buttons
  document.getElementById('addStudentBtn')?.addEventListener('click', () => openStudentModal('Add New Student'));
  document.getElementById('addDoctorBtn')?.addEventListener('click', () => openDoctorModal('Add New Doctor'));
  document.getElementById('addSubjectBtn')?.addEventListener('click', () => openSubjectModal('Add New Subject'));
  document.getElementById('addLectureBtn')?.addEventListener('click', () => openLectureModal('Add New Lecture'));
  document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal('Add New User'));
  document.getElementById('addTaBtn')?.addEventListener('click', () => {
    console.log('Add TA button clicked');
    openTeachingAssistantModal('Add New Teaching Assistant');
  });

  // Toggle Passwords
  const toggleUserPassword = document.getElementById('toggleUserPassword');
  if (toggleUserPassword) {
    toggleUserPassword.addEventListener('click', () => {
      const pwd = document.getElementById('userPassword');
      const icon = toggleUserPassword.querySelector('i');
      if (pwd && icon) {
        pwd.type = pwd.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
    });
  }

  const toggleDoctorPassword = document.getElementById('toggleDoctorPassword');
  if (toggleDoctorPassword) {
    toggleDoctorPassword.addEventListener('click', () => {
      const pwd = document.getElementById('doctorPassword');
      const icon = toggleDoctorPassword.querySelector('i');
      if (pwd && icon) {
        pwd.type = pwd.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
    });
  }

  // Event Delegation for Management Cards
  const managementCards = document.getElementById('managementCards');
  if (managementCards) {
    managementCards.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;

      const icon = card.querySelector('i');
      if (!icon) return;

      if (icon.classList.contains('fa-users-cog')) {
        showUsersManagement();
      } else if (icon.classList.contains('fa-download')) {
        createBackup();
      } else if (icon.classList.contains('fa-upload')) {
        restoreBackup();
      } else if (icon.classList.contains('fa-search')) {
        verifyRestoredData();
      } else if (icon.classList.contains('fa-database')) {
        checkDatabaseInfo();
      }
    });
  }

  // Form Submits
  const studentForm = document.getElementById('studentForm');
  if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('studentIdHidden')?.value;

      const data = {
        name: document.getElementById('studentName')?.value.trim() || '',
        student_id: document.getElementById('studentId')?.value.trim() || '',
        level: parseInt(document.getElementById('studentLevel')?.value) || 1,
        department: document.getElementById('studentDepartment')?.value || '',
        photos: currentDescriptors
      };

      const res = await authenticatedFetch(`${DB_PATH}/students${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        showToast('Student saved successfully', 'success');
        document.getElementById('studentModal').classList.add('hidden');
        stopCamera();
        await loadData();
      }
    });
  }

  const doctorForm = document.getElementById('doctorForm');
  if (doctorForm) {
    doctorForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('doctorIdHidden')?.value;
      const data = {
        name: document.getElementById('doctorName')?.value.trim() || '',
        username: document.getElementById('doctorUsername')?.value.trim() || '',
        email: document.getElementById('doctorEmail')?.value.trim() || null
      };
      const password = document.getElementById('doctorPassword')?.value.trim();
      if (password) data.password = password;

      const res = await authenticatedFetch(`${DB_PATH}/doctors${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        showToast('Doctor saved successfully', 'success');
        document.getElementById('doctorModal').classList.add('hidden');
        await loadData();
      }
    });
  }

  const subjectForm = document.getElementById('subjectForm');
  if (subjectForm) {
    subjectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('subjectIdHidden')?.value;
      const doctorId = parseInt(document.getElementById('subjectDoctorSelect')?.value);
      const doctor = doctors.find(d => d.id === doctorId);

      const data = {
        name: document.getElementById('subjectName')?.value.trim() || '',
        doctor_id: doctorId,
        doctor_name: doctor ? doctor.name : 'Not Assigned'
      };

      const res = await authenticatedFetch(`${DB_PATH}/subjects${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        showToast('Subject saved successfully', 'success');
        document.getElementById('subjectModal').classList.add('hidden');
        await loadData();
      }
    });
  }

  const lectureForm = document.getElementById('lectureForm');
  if (lectureForm) {
    lectureForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('lectureIdHidden')?.value;

      const subject = subjects.find(s => s.id == document.getElementById('lectureSubject')?.value);
      const doctor = doctors.find(d => d.id == document.getElementById('lectureDoctor')?.value);
      const time = timeslots.find(t => t.id == document.getElementById('lectureTime')?.value);
      const location = locations.find(l => l.id == document.getElementById('lectureLocation')?.value);

      const data = {
        subject_id: parseInt(document.getElementById('lectureSubject')?.value),
        subject_name: subject?.name || '',
        doctor_id: parseInt(document.getElementById('lectureDoctor')?.value),
        doctor_name: doctor?.name || '',
        level: document.getElementById('lectureLevel')?.value || '',
        department: document.getElementById('lectureDepartment')?.value || '',
        day: document.getElementById('lectureDay')?.value || '',
        timeslot_id: parseInt(document.getElementById('lectureTime')?.value),
        time_display: time ? (time.display || `${time.start} - ${time.end}`) : '',
        location_id: parseInt(document.getElementById('lectureLocation')?.value),
        location_name: location?.name || '',
        active: true
      };

      const res = await authenticatedFetch(`${DB_PATH}/lectures${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        showToast('Lecture saved successfully', 'success');
        document.getElementById('lectureModal').classList.add('hidden');
        await loadData();
      }
    });
  }

  const userForm = document.getElementById('userForm');
  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('userIdHidden')?.value;
      const username = document.getElementById('userUsername')?.value.trim() || '';
      const password = document.getElementById('userPassword')?.value || '';
      const role = document.getElementById('userRole')?.value || '';

      const data = { username, role };
      if (password || !id) data.password = password;

      const res = await authenticatedFetch(`${DB_PATH}/users${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        showToast('User saved successfully', 'success');
        document.getElementById('userModal').classList.add('hidden');
        await loadUsers();
      }
    });
  }

  // إعداد نموذج التقارير عند التحميل
  setTimeout(() => {
    setupReportFilterForm();
  }, 1000);
  
  // إعداد مراقب الصلاحيات
  setTimeout(setupPermissionsObserver, 1000);
  
  // تحديث زر Refresh بعد تحميل الصفحة
  setTimeout(() => {
    const token = localStorage.getItem('token');
    if (token) {
      updateRefreshButton();
      startStudentLoginUpdatesMonitoring();
    }
  }, 2000);
  // تحديث زر Refresh بعد تحميل الصفحة
setTimeout(() => {
    const token = localStorage.getItem('token');
    if (token) {
        updateRefreshButton();
        startStudentLoginUpdatesMonitoring();
    }
}, 2000);
});

// === INITIAL LOAD ON PAGE LOAD ===
window.addEventListener('load', () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    try {
      currentUser = JSON.parse(user);
      console.log('User loaded from localStorage:', currentUser);
      
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      
      // تأكد من وجود id في currentUser
      if (!currentUser.id) {
        console.error('User ID not found in localStorage user object');
        // حاول الحصول على id من السيرفر
        fetchUserInfo();
      } else {
        loadData();
      }
      
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      logout();
    }
  }
});

// استبدل دالة fetchUserInfo بهذه النسخة
async function fetchUserInfo() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // احصل على معلومات المستخدم من السيرفر
    const response = await fetch(`${DB_PATH}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const userData = await response.json();
      currentUser = userData;
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('User info fetched:', currentUser);
      loadData();
    } else {
      console.error('Failed to fetch user info:', response.status);
      // جرب تسجيل الخروج إذا فشل
      logout();
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }
}

// دالة لعرض معلومات قاعدة البيانات
async function checkDatabaseInfo() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please login first', 'error');
      return;
    }

    const response = await fetch('/api/database-info', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Database Info:', data);
      
      let message = '📊 <strong>Database Information</strong><br><br>';
      message += `<strong>Directory:</strong> ${data.directory}<br>`;
      message += `<strong>Exists:</strong> ${data.exists ? '✅ Yes' : '❌ No'}<br><br>`;
      
      if (data.files && data.files.length > 0) {
        message += `<strong>Files (${data.files.length}):</strong><br>`;
        data.files.forEach(file => {
          const status = file.exists ? '✅' : '❌';
          const size = (file.size / 1024).toFixed(2);
          message += `${status} ${file.name} (${size} KB)<br>`;
        });
      }
      
      showToast(message, 'success');
    } else {
      showToast('Failed to get database info', 'error');
    }
  } catch (error) {
    console.error('Error getting database info:', error);
    showToast('Error getting database info', 'error');
  }
}

// دالة لعرض معلومات النظام
async function showSystemInfo() {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      const data = await response.json();
      console.log('System Health:', data);
      
      let message = '🩺 <strong>System Health</strong><br><br>';
      message += `<strong>Status:</strong> ${data.status}<br>`;
      message += `<strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString()}<br>`;
      message += `<strong>Database:</strong> ${data.database.exists ? '✅ Connected' : '❌ Not Found'}<br>`;
      message += `<strong>Files:</strong> ${data.database.files} JSON files`;
      
      showToast(message, 'success');
    }
  } catch (error) {
    console.error('Error getting system health:', error);
    showToast('System is running', 'info');
  }
}

// عرض معلومات النظام عند تحميل الصفحة
window.addEventListener('load', () => {
  setTimeout(() => {
    showSystemInfo();
  }, 1000);
});


// إعادة تعيين كلمة مرور الطالب (للمشرفين)
async function resetStudentPassword(studentId) {
  if (!confirm(`Are you sure you want to reset password for student ${studentId}?`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/student/reset-password/${studentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message, 'success');
    } else {
      showToast(data.error || 'Failed to reset password', 'error');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    showToast('Error resetting password', 'error');
  }
}

// ============================================
// STUDENT LOGIN MANAGEMENT (للمشرفين)
// ============================================

let studentLoginData = [];
let allStudents = [];


// دالة لتسليط الضوء على الصفوف المتغيرة
function highlightChangedRows(oldData, newData) {
    const rows = document.querySelectorAll('#studentLoginList tbody tr');
    
    rows.forEach(row => {
        const studentIdCell = row.querySelector('td:nth-child(2)');
        if (!studentIdCell) return;
        
        const studentId = studentIdCell.textContent.trim();
        
        // البحث في البيانات القديمة والجديدة
        const oldStudent = oldData.find(s => s.student_id === studentId);
        const newStudent = newData.find(s => s.student_id === studentId);
        
        if (oldStudent && newStudent && oldStudent.password !== newStudent.password) {
            // كلمة المرور تغيرت
            row.classList.add('student-login-updated');
            
            // إزالة التأثير بعد 3 ثواني
            setTimeout(() => {
                row.classList.remove('student-login-updated');
            }, 3000);
        }
    });
}


// ============================================
// REFRESH BUTTON FOR STUDENT LOGIN - محسّن
// ============================================
function addManualRefreshButton() {
    const sectionHeader = document.querySelector('#student-loginSection .flex.justify-between');
    if (!sectionHeader) {
        console.log('Student login section header not found, retrying in 1 second...');
        setTimeout(addManualRefreshButton, 1000);
        return;
    }
    
    // البحث عن مجموعة الأزرار الموجودة
    const buttonGroup = sectionHeader.querySelector('.flex.gap-4');
    if (!buttonGroup) {
        console.log('Button group not found, creating one...');
        // إنشاء مجموعة أزرار جديدة إذا لم تكن موجودة
        const newButtonGroup = document.createElement('div');
        newButtonGroup.className = 'flex gap-4';
        sectionHeader.appendChild(newButtonGroup);
        
        // نقل أزرار التصدير الموجودة إلى المجموعة الجديدة
        const exportBtn = sectionHeader.querySelector('button[onclick*="exportStudentLoginReport"]');
        if (exportBtn) {
            sectionHeader.removeChild(exportBtn);
            newButtonGroup.appendChild(exportBtn);
        }
        
        addManualRefreshButton(); // إعادة المحاولة
        return;
    }
    
    // إزالة أي زر Refresh قديم
    const oldRefreshBtn = document.getElementById('studentLoginRefreshBtn');
    if (oldRefreshBtn) oldRefreshBtn.remove();
    
    // إنشاء زر Refresh جديد
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'studentLoginRefreshBtn';
    refreshBtn.className = 'bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm shadow-md flex items-center gap-2 transition-all duration-200';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i><span>Refresh Data</span>';
    
    // إضافة حدث النقر
    refreshBtn.onclick = async function(e) {
        e.preventDefault();
        await refreshStudentLoginData(this);
    };
    
    // إضافة مؤشر آخر تحديث
    let lastUpdateEl = document.getElementById('studentLoginLastUpdate');
    if (!lastUpdateEl) {
        lastUpdateEl = document.createElement('span');
        lastUpdateEl.id = 'studentLoginLastUpdate';
        lastUpdateEl.className = 'text-xs text-gray-400 ml-4 flex items-center gap-1';
        lastUpdateEl.innerHTML = '<i class="fas fa-clock"></i> Last update: never';
        sectionHeader.appendChild(lastUpdateEl);
    }
    
    // إضافة الزر إلى مجموعة الأزرار
    buttonGroup.appendChild(refreshBtn);
    
    console.log('✅ Refresh button added to Student Login section');
}
// دالة منفصلة للتحديث
async function refreshStudentLoginData(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Loading...</span>';
    button.disabled = true;
    
    try {
        console.log('🔄 Manual refresh requested - loading from server...');
        
        // تحميل البيانات من السيرفر مباشرة
        await loadStudentLoginData();
        
        // تحديث مؤشر آخر تحديث
        const lastUpdateEl = document.getElementById('studentLoginLastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.innerHTML = `<i class="fas fa-clock"></i> Last update: ${new Date().toLocaleTimeString()}`;
        }
        
        showCustomToast('✅ Student login data refreshed from server', 'success');
        
    } catch (error) {
        console.error('❌ Error refreshing data:', error);
        showCustomToast('❌ Failed to refresh data: ' + error.message, 'error');
    } finally {
        button.innerHTML = originalHTML;
        button.disabled = false;
    }
}
// تحديث دالة renderStudentLoginTable
const originalRenderStudentLoginTable = renderStudentLoginTable;
renderStudentLoginTable = function(data = studentLoginData) {
    // تحديث مؤشر آخر تحديث
    const lastUpdateEl = document.getElementById('studentLoginLastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.innerHTML = `<i class="fas fa-clock"></i> Last update: ${new Date().toLocaleTimeString()}`;
    }
    
    // استدعاء الدالة الأصلية
    originalRenderStudentLoginTable(data);
};

// تحديث فلتر الأقسام
function updateDepartmentFilter() {
  const deptFilter = document.getElementById('studentLoginDeptFilter');
  if (!deptFilter) return;
  
  // جمع الأقسام الفريدة من بيانات الطلاب
  const departments = [...new Set(allStudents.map(s => s.department).filter(Boolean))];
  
  deptFilter.innerHTML = '<option value="">All Departments</option>';
  departments.sort().forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    deptFilter.appendChild(opt);
  });
}

// تحميل جميع الطلاب من ملف students.json
async function loadAllStudents() {
    try {
        const response = await fetch('/database/students.json');
        if (response.ok) {
            allStudents = await response.json();
            console.log(`✅ Loaded ${allStudents.length} students from database`);
        } else {
            console.warn('⚠️ Could not load students.json');
            allStudents = [];
        }
    } catch (error) {
        console.error('Error loading students:', error);
        allStudents = [];
    }
}

// تحديث الإحصائيات - مع التحقق من وجود العناصر
function updateStudentLoginStats() {
    const totalLoginsEl = document.getElementById('totalStudentLogins');
    const activeTodayEl = document.getElementById('activeTodayCount');
    const totalStudentsEl = document.getElementById('totalStudentsCount');
    const withoutAccountEl = document.getElementById('withoutAccountCount');
    
    if (totalLoginsEl) totalLoginsEl.textContent = studentLoginData.length;
    if (totalStudentsEl) totalStudentsEl.textContent = allStudents.length;
    
    // عدد الطلاب النشطين اليوم
    const today = new Date().toDateString();
    const activeToday = studentLoginData.filter(s => {
        if (!s.last_login) return false;
        return new Date(s.last_login).toDateString() === today;
    }).length;
    if (activeTodayEl) activeTodayEl.textContent = activeToday;
    
    // عدد الطلاب بدون حساب
    const studentsWithAccounts = new Set(studentLoginData.map(s => s.student_id));
    const withoutAccount = allStudents.filter(s => !studentsWithAccounts.has(s.student_id)).length;
    if (withoutAccountEl) withoutAccountEl.textContent = withoutAccount;
}

// ============================================
// RENDER STUDENT LOGIN TABLE - نسخة محسنة مع Debug
// ============================================
// ============================================
// RENDER STUDENT LOGIN TABLE - مع تحسين Debug
// ============================================
function renderStudentLoginTable(data = studentLoginData) {
    const container = document.getElementById('studentLoginList');
    if (!container) {
        console.error('❌ studentLoginList container not found');
        return;
    }

    console.log('📊 Rendering student login table with', data?.length || 0, 'records');
    
    if (!data || data.length === 0) {
        console.warn('⚠️ No data to render');
        container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No student login records found</p>';
        return;
    }
    
    console.log('📊 First record sample:', data[0]);

    // تطبيق الفلاتر
    let filtered = filterStudentLoginDataInternal(data);
    console.log('📊 After filters:', filtered.length, 'records');

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-2xl text-gray-400 text-center mt-20">No student login records match your filters</p>';
        return;
    }

    // التحقق من الصلاحيات
    const canEdit = hasPermission('btn.student-login.edit');
    const canDelete = hasPermission('btn.student-login.delete');
    const canReset = hasPermission('btn.student-login.reset');

    console.log('🔐 Permissions - Edit:', canEdit, 'Delete:', canDelete, 'Reset:', canReset);

    let tableRows = '';
    
    filtered.forEach(login => {
        // إخفاء كلمة المرور باستخدام نجوم
        const maskedPassword = '••••••••';
        
        // نوع كلمة المرور (افتراضية أو مخصصة)
        const passwordType = login.is_default_password 
            ? '<span class="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded-full text-xs">Default</span>' 
            : '<span class="px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs">Custom</span>';
        
        // آخر تحديث
        const lastUpdated = login.updated_at 
            ? new Date(login.updated_at).toLocaleString() 
            : (login.created_at ? new Date(login.created_at).toLocaleString() : 'N/A');
        
        tableRows += `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="p-4">${login.id || 'N/A'}</td>
                <td class="p-4 font-mono font-bold text-indigo-400">${login.student_id || 'N/A'}</td>
                <td class="p-4 font-medium">${login.student_name || 'N/A'}</td>
                <td class="p-4">Level ${login.student_level || 'N/A'}</td>
                <td class="p-4">${login.student_department || 'N/A'}</td>
                <td class="p-4">
                    <span class="font-mono bg-gray-800 px-2 py-1 rounded text-sm" title="Current password: ${login.password || 'N/A'}">${maskedPassword}</span>
                </td>
                <td class="p-4">${passwordType}</td>
                <td class="p-4 text-sm">${lastUpdated}</td>
                <td class="p-4 text-sm">${login.last_login ? new Date(login.last_login).toLocaleString() : 'Never'}</td>
                <td class="p-4 text-center">${login.login_count || 0}</td>
                <td class="p-4">
                    <div class="flex flex-col gap-2">
                        ${canEdit ? `
                            <button onclick="openEditStudentPasswordModal(${login.id || 0}, '${login.student_id || ''}', '${(login.student_name || '').replace(/'/g, "\\'")}', ${login.student_level || 1}, '${login.student_department || ''}')" 
                                    class="edit-btn px-3 py-1 rounded text-xs">
                                <i class="fas fa-edit mr-1"></i> Edit
                            </button>
                        ` : ''}
                        
                        ${canDelete ? `
                            <button onclick="deleteStudentLogin(${login.id || 0}, '${(login.student_name || '').replace(/'/g, "\\'")}')" 
                                    class="delete-btn px-3 py-1 rounded text-xs">
                                <i class="fas fa-trash mr-1"></i> Delete
                            </button>
                        ` : ''}
                        
                        ${canReset ? `
                            <button onclick="resetStudentLoginPassword('${login.student_id || ''}')" 
                                    class="reset-btn bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 px-3 py-1 rounded text-xs border border-yellow-500/30">
                                <i class="fas fa-undo-alt mr-1"></i> Reset
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    const tableHTML = `
        <div class="overflow-x-auto bg-white/5 rounded-3xl p-8">
            <table class="w-full">
                <thead class="bg-gradient-to-r from-indigo-600 to-purple-600">
                    <tr>
                        <th class="p-4 text-left">ID</th>
                        <th class="p-4 text-left">Student ID</th>
                        <th class="p-4 text-left">Student Name</th>
                        <th class="p-4 text-left">Level</th>
                        <th class="p-4 text-left">Department</th>
                        <th class="p-4 text-left">Password</th>
                        <th class="p-4 text-left">Password Type</th>
                        <th class="p-4 text-left">Last Updated</th>
                        <th class="p-4 text-left">Last Login</th>
                        <th class="p-4 text-left">Login Count</th>
                        <th class="p-4 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/10">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
    console.log('✅ Table rendered successfully with', filtered.length, 'rows');
}

// ============================================
// FILTER STUDENT LOGIN DATA INTERNAL - مع تحسين Debug
// ============================================
// ============================================
// FILTER STUDENT LOGIN DATA INTERNAL
// ============================================
function filterStudentLoginDataInternal(data) {
    if (!data || !Array.isArray(data)) {
        console.warn('⚠️ filterStudentLoginDataInternal received invalid data:', data);
        return [];
    }
    
    const searchInput = document.getElementById('studentLoginSearch');
    const levelFilter = document.getElementById('studentLoginLevelFilter');
    const deptFilter = document.getElementById('studentLoginDeptFilter');
    const statusFilter = document.getElementById('studentLoginStatusFilter');
    
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const level = levelFilter ? levelFilter.value : '';
    const dept = deptFilter ? deptFilter.value : '';
    const status = statusFilter ? statusFilter.value : '';

    console.log('🔍 Applying filters:', { search, level, dept, status });
    console.log('📊 Input data count:', data.length);

    let filtered = [...data];

    if (search) {
        filtered = filtered.filter(l => 
            (l.student_name && l.student_name.toLowerCase().includes(search)) || 
            (l.student_id && l.student_id.toLowerCase().includes(search))
        );
    }

    if (level) {
        filtered = filtered.filter(l => l.student_level == level);
    }

    if (dept) {
        filtered = filtered.filter(l => l.student_department === dept);
    }

    if (status === 'hasAccount') {
        // Already filtering accounts
    } else if (status === 'noAccount') {
        filtered = [];
    }

    console.log('📊 Filtered data count:', filtered.length);
    return filtered;
}

// تطبيق الفلاتر (للاستخدام العام)
function filterStudentLoginData() {
  renderStudentLoginTable();
}


// فتح نافذة تعديل كلمة المرور
function openEditStudentPasswordModal(loginId, studentId, studentName, level, department) {
  console.log(`Opening password edit for: ${studentName} (${studentId})`);
  
  document.getElementById('editLoginId').value = loginId;
  document.getElementById('editStudentId').value = studentId;
  document.getElementById('editStudentName').textContent = studentName;
  document.getElementById('editStudentDetails').innerHTML = `
    <i class="fas fa-id-card mr-1"></i> ${studentId}<br>
    <i class="fas fa-layer-group mr-1"></i> Level ${level || 1}<br>
    <i class="fas fa-building mr-1"></i> ${department || 'N/A'}
  `;
  
  document.getElementById('newStudentPassword').value = '';
  document.getElementById('confirmStudentPassword').value = '';
  
  document.getElementById('studentPasswordModal').classList.remove('hidden');
}

// إغلاق نافذة تعديل كلمة المرور
function closeStudentPasswordModal() {
  document.getElementById('studentPasswordModal').classList.add('hidden');
}

// تعديل كلمة المرور
document.getElementById('editPasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const loginId = document.getElementById('editLoginId').value;
  const studentId = document.getElementById('editStudentId').value;
  const newPassword = document.getElementById('newStudentPassword').value;
  const confirmPassword = document.getElementById('confirmStudentPassword').value;
  
  console.log('Submitting password change for:', studentId);
  
  if (newPassword !== confirmPassword) {
    showToast('❌ Passwords do not match', 'error');
    return;
  }
  
  if (newPassword.length < 4) {
    showToast('❌ Password must be at least 4 characters', 'error');
    return;
  }
  
  // إظهار رسالة تحميل
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Updating...';
  submitBtn.disabled = true;
  
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      showToast('❌ You are not logged in', 'error');
      return;
    }
    
    console.log('Sending request with token:', token.substring(0, 20) + '...');
    
    const response = await fetch('/api/student/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        student_id: studentId,
        new_password: newPassword
      })
    });
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (response.ok) {
      showToast(`✅ Password updated successfully for ${studentId}`, 'success');
      closeStudentPasswordModal();
      await loadStudentLoginData(); // إعادة تحميل البيانات
    } else {
      if (response.status === 403) {
        showToast('❌ Access denied. Admin/IT only.', 'error');
      } else {
        showToast(data.error || 'Failed to update password', 'error');
      }
    }
  } catch (error) {
    console.error('Error updating password:', error);
    showToast('❌ Error updating password: ' + error.message, 'error');
  } finally {
    // إعادة الزر إلى حالته الطبيعية
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// حذف حساب طالب
async function deleteStudentLogin(loginId, studentName) {
  showConfirmationModal({
    title: 'Delete Student Account',
    message: `Are you sure you want to delete login account for ${studentName}? This action cannot be undone.`,
    icon: 'fa-trash-alt',
    iconColor: 'text-red-400',
    requireComment: true,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    onConfirm: async (comment) => {
      if (!comment || comment.trim() === '') {
        showCustomToast('A comment is required for deletion', 'error');
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`/api/student-login/${loginId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ confirmationComment: comment.trim() })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showCustomToast(`✅ Account for ${studentName} deleted successfully`, 'success');
          await loadStudentLoginData();
        } else {
          showCustomToast(data.error || 'Failed to delete account', 'error');
        }
      } catch (error) {
        console.error('Error deleting student login:', error);
        showCustomToast('Error deleting student login', 'error');
      }
    }
  });
}

// إعادة تعيين كلمة المرور
async function resetStudentLoginPassword(studentId) {
  if (!confirm(`Reset password for student ${studentId} to default?`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/student/reset-password/${studentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message, 'success');
      await loadStudentLoginData();
    } else {
      showToast(data.error || 'Failed to reset password', 'error');
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    showToast('Error resetting password', 'error');
  }
}

// تصدير تقرير حسابات الطلاب
async function exportStudentLoginReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, doc.internal.pageSize.width, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Login Accounts Report', 15, 18);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.width - 15, 18, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Total Accounts: ${studentLoginData.length}`, 15, 45);
  
  const studentsWithAccounts = new Set(studentLoginData.map(s => s.student_id));
  doc.text(`Students Without Account: ${allStudents.length - studentsWithAccounts.size}`, 15, 53);
  
  const tableHead = [['Student ID', 'Name', 'Level', 'Department', 'Login Count', 'Last Login']];
  const tableBody = studentLoginData.map(login => [
    login.student_id,
    login.student_name,
    `Level ${login.student_level || 1}`,
    login.student_department || 'N/A',
    (login.login_count || 0).toString(),
    login.last_login ? new Date(login.last_login).toLocaleDateString() : 'Never'
  ]);
  
  doc.autoTable({
    startY: 65,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 }
  });
  
  doc.save(`student_login_report_${new Date().toISOString().split('T')[0]}.pdf`);
  showToast('Student login report exported', 'success');
}

// DELETE: حذف حساب طالب (للمشرفين)
//app.delete('/api/student-login/:id', authenticateToken, (req, res) => {
  //if (req.user.role !== 'admin' && req.user.role !== 'it') {
    //return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  //}
 // const id = parseInt(req.params.id);
 // const loginIndex = studentLoginData.findIndex(l => l.id === id);
 // if (loginIndex === -1) {
//    return res.status(404).json({ error: 'Student login record not found' });
 // }
//  const deletedStudent = studentLoginData[loginIndex];
 // studentLoginData.splice(loginIndex, 1);
 // saveJSON('student_login.json', studentLoginData);
//  console.log(`🗑️ Deleted student login: ${deletedStudent.student_id} (${deletedStudent.student_name})`);
 // res.json({ 
//    success: true, 
 //   message: 'Student login deleted successfully',
  //  deleted: {
  //    id: deletedStudent.id,
   //   student_id: deletedStudent.student_id,
  //    student_name: deletedStudent.student_name
  //  }
 // });
//});

//===================================================================================
//===================================================================================
// === FACE DESCRIPTORS FUNCTIONS ===

// حفظ صور الوجه للطالب
async function saveFaceDescriptors(studentId, faceData) {
  if (!faceData || !faceData.photos || faceData.photos.length === 0) return true;
  
  try {
    const token = localStorage.getItem('token');
    
    // البحث عن الطالب في مصفوفة students
    const studentIndex = students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) {
      console.error('Student not found');
      return false;
    }
    
    // التأكد من وجود face_data
    if (!students[studentIndex].face_data) {
      students[studentIndex].face_data = {
        has_face: false,
        photos: [],
        descriptors: [],
        updated_at: null
      };
    }
    
    // تحديث بيانات الوجه
    students[studentIndex].face_data = {
      has_face: true,
      photos: faceData.photos,
      descriptors: faceData.descriptors,
      updated_at: new Date().toISOString()
    };
    
    // حفظ التحديث على الخادم
    const response = await fetch(`${DB_PATH}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(students[studentIndex])
    });
    
    if (response.ok) {
      console.log(`✅ Saved face data for student ${studentId}`);
      return true;
    } else {
      console.error('Failed to save student with face data');
      return false;
    }
  } catch (error) {
    console.error('Error saving face descriptors:', error);
    return false;
  }
}

// تحميل صور الوجه للطالب
async function loadFaceDescriptors(studentId) {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${DB_PATH}/face-descriptors/student/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.length > 0 ? data[0].photos : [];
    }
    return [];
  } catch (error) {
    console.error('Error loading face descriptors:', error);
    return [];
  }
}


// ============================================
// UPDATE REFRESH BUTTON - مع تحسين الأداء
// ============================================
function updateRefreshButton() {
    // البحث عن زر Refresh الموجود
    const refreshBtn = document.querySelector('#student-loginSection .bg-gray-700');
    
    if (!refreshBtn) {
        console.log('Refresh button not found, will retry...');
        setTimeout(updateRefreshButton, 1000);
        return;
    }
    
    console.log('✅ Found existing refresh button, updating functionality...');
    
    // إزالة أي مستمعات قديمة
    const newRefreshBtn = refreshBtn.cloneNode(true);
    refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
    
    // إضافة وظيفة جديدة
    newRefreshBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // إظهار حالة التحميل
        const originalHTML = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        this.disabled = true;
        
        try {
            console.log('🔄 Manual refresh requested - loading from server...');
            
            // تحميل البيانات من السيرفر مع force refresh
            await loadStudentLoginData(true);
            
            // تحديث وقت آخر فحص
            lastStudentLoginCheck = new Date().toISOString();
            
            // إظهار رسالة نجاح
            showCustomToast('✅ Student login data refreshed from server', 'success');
            
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            showCustomToast('❌ Failed to refresh data: ' + error.message, 'error');
        } finally {
            // إعادة الزر لحالته الطبيعية
            this.innerHTML = originalHTML;
            this.disabled = false;
        }
    });
    
    // إضافة مؤشر آخر تحديث إذا لم يكن موجوداً
    if (!document.getElementById('studentLoginLastUpdate')) {
        const lastUpdateEl = document.createElement('span');
        lastUpdateEl.id = 'studentLoginLastUpdate';
        lastUpdateEl.className = 'text-xs text-gray-400 ml-4 flex items-center gap-1 bg-slate-800/50 px-3 py-1 rounded-full';
        lastUpdateEl.innerHTML = '<i class="fas fa-clock text-green-400"></i> Last update: never';
        
        const buttonGroup = document.querySelector('#student-loginSection .flex.gap-4');
        if (buttonGroup) {
            buttonGroup.appendChild(lastUpdateEl);
        }
    }
}

// ============================================
// LOAD STUDENT LOGIN DATA - مع تحسين العرض
// ============================================
async function loadStudentLoginData(forceRefresh = false) {
    console.log(`📥 Loading student login data from server... ${forceRefresh ? '(force refresh)' : ''}`);
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            showCustomToast('❌ You are not logged in', 'error');
            return;
        }
        
        // إضافة timestamp لمنع التخزين المؤقت
        const url = forceRefresh 
            ? `/api/student-logins?t=${Date.now()}` 
            : '/api/student-logins';
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (response.ok) {
            const newData = await response.json();
            
            // حفظ البيانات القديمة للمقارنة
            const oldData = studentLoginData ? [...studentLoginData] : [];
            
            // تحديث المتغير العام
            studentLoginData = newData;
            
            console.log(`✅ Loaded ${studentLoginData.length} student login records from server`);
            console.log('📊 New data sample:', studentLoginData[0]);
            
            // تحميل بيانات الطلاب للمقارنة
            await loadAllStudents();
            
            // تحديث قائمة الأقسام في الفلتر
            updateDepartmentFilter();
            
            // إعادة تعيين الفلاتر وإعادة عرض الجدول
            resetStudentLoginFilters();
            
            // تحديث الإحصائيات
            updateStudentLoginStats();
            
            // إذا كان هناك تغيير، أظهر تأثيراً
            if (forceRefresh || JSON.stringify(oldData) !== JSON.stringify(newData)) {
                console.log('🔄 Data changed, updating table...');
                
                // إضافة تأثير وميض للجدول
                const table = document.querySelector('#studentLoginList');
                if (table) {
                    table.classList.add('student-login-updated');
                    setTimeout(() => {
                        table.classList.remove('student-login-updated');
                    }, 1000);
                }
                
                // تحديث مؤشر آخر تحديث
                const lastUpdateEl = document.getElementById('studentLoginLastUpdate');
                if (lastUpdateEl) {
                    lastUpdateEl.innerHTML = `<i class="fas fa-clock"></i> Last update: ${new Date().toLocaleTimeString()}`;
                }
            }
            
            return studentLoginData;
            
        } else if (response.status === 403) {
            showCustomToast('❌ Access denied. Admin/IT only.', 'error');
        } else {
            const error = await response.json();
            showCustomToast(error.error || 'Failed to load student login data', 'error');
        }
    } catch (error) {
        console.error('Error loading student login data:', error);
        showCustomToast('❌ Error loading student login data', 'error');
    }
}
// ============================================
// RESET STUDENT LOGIN FILTERS وإعادة عرض الجدول
// ============================================
function resetStudentLoginFilters() {
    // إعادة تعيين قيم الفلاتر
    const searchInput = document.getElementById('studentLoginSearch');
    const levelFilter = document.getElementById('studentLoginLevelFilter');
    const deptFilter = document.getElementById('studentLoginDeptFilter');
    const statusFilter = document.getElementById('studentLoginStatusFilter');
    
    if (searchInput) searchInput.value = '';
    if (levelFilter) levelFilter.value = '';
    if (deptFilter) deptFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    // إعادة عرض الجدول
    renderStudentLoginTable();
}

// ============================================
// مراقبة التغييرات في student_login.json - محسنة
// ============================================

let lastStudentLoginUpdate = Date.now();
let lastUpdateCheck = new Date().toISOString();
let updateCheckInterval = null;



// بدء المراقبة (كل 3 ثواني)
function startStudentLoginMonitoring() {
    // إيقاف أي مراقبة سابقة
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
    }
    
    console.log('🚀 Starting student login monitoring...');
    
    // بدء مراقبة جديدة
    updateCheckInterval = setInterval(() => {
        const studentLoginSection = document.getElementById('student-loginSection');
        if (studentLoginSection && !studentLoginSection.classList.contains('hidden')) {
            checkForStudentLoginUpdates();
        }
    }, 3000);
}

// بدء المراقبة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    startStudentLoginMonitoring();
});

// === TEST PERMISSIONS ===
function testPermissions() {
  console.log('=== TESTING PERMISSIONS ===');
  console.log('Current user:', currentUser);
  console.log('Can Edit:', hasPermission('edit'));
  console.log('Can Delete:', hasPermission('delete'));
  
  // عد الأزرار
  const editBtns = document.querySelectorAll('.edit-btn');
  const deleteBtns = document.querySelectorAll('.delete-btn');
  
  console.log('Total Edit buttons:', editBtns.length);
  console.log('Total Delete buttons:', deleteBtns.length);
  
  // تحقق من حالة كل زر
  editBtns.forEach((btn, i) => {
    console.log(`Edit button ${i}:`, btn.classList.contains('hidden') ? 'HIDDEN' : 'VISIBLE');
  });
  
  deleteBtns.forEach((btn, i) => {
    console.log(`Delete button ${i}:`, btn.classList.contains('hidden') ? 'HIDDEN' : 'VISIBLE');
  });
}

// يمكنك استدعاء هذه الدالة من Console للتأكد
window.testPermissions = testPermissions;