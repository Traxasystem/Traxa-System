// server.js - نسخة معدلة بالكامل لتعمل على أي سيرفر (محلي أو سحابي)

const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');
const cors = require('cors');
const WebSocket = require('ws');
const os = require('os');
const bcrypt = require('bcrypt');

const app = express();
const saltRounds = 10;

// ============================================
// ✅ IMPORTANT FIX: استخدام PORT من البيئة
// ============================================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'attendance_system_2026_production_key_change_this';

// ============================================
// ✅ IMPORTANT FIX: تحديد مسار قاعدة البيانات
// ============================================
// على Render، استخدم المسار المثبت (Persistent Disk)
// على الخدمات الأخرى، استخدم المسار المحلي
const DB_DIR = process.env.RENDER 
    ? '/opt/render/project/src/database'  // مسار Render Disk
    : path.join(__dirname, 'database');

const BACKUPS_DIR = path.join(__dirname, 'backups');
const TEMP_UPLOADS = path.join(__dirname, 'temp_uploads');
const SSL_KEY_PATH = path.join(__dirname, 'server.key');
const SSL_CERT_PATH = path.join(__dirname, 'server.crt');
const CAMERA_REQUEST_FILE = path.join(__dirname, 'temp_camera_request.json');

// ============================================
// ✅ التأكد من وجود المجلدات
// ============================================
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_UPLOADS)) fs.mkdirSync(TEMP_UPLOADS, { recursive: true });

// ============================================
// ✅ CORS - التصحيح
// ============================================
app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// ============================================
// ✅ HEALTH CHECK ENDPOINT (مهم لـ Render)
// ============================================
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: fs.existsSync(DB_DIR),
        port: PORT
    });
});

// ============================================
// ✅ تعريف المتغيرات العامة قبل الاستخدام
// ============================================
let users = [];
let students = [];
let doctors = [];
let teachingAssistants = [];
let subjects = [];
let lectures = [];
let departments = [];
let locations = [];
let timeslots = [];
let days = [];
let recycleBin = [];
let grades = [];
let attendanceRecords = [];
let attendanceSessions = [];
let attendanceReports = [];
let studentLoginData = [];
let faceDescriptors = [];
let taPermissions = [];
let failedLoginAttempts = [];
let ipBlacklist = [];
let manualBlacklist = [];
let autoBannedIPs = [];
let auditLogs = [];
let endpointStats = {};
let activeSessionsStore = [];
let sessionAttendanceData = {};
let sessionListeners = {};
let studentLoginLastUpdate = {};
let backupSchedule = {
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    lastRun: null,
    nextRun: null,
    retentionDays: 30,
    status: 'idle',
    lastError: null
};

// ============================================
// ✅ دوال مساعدة
// ============================================
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const HOST_DEVICE_IP = getLocalIP();

function loadJSON(filename) {
    const filePath = path.join(DB_DIR, filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        return [];
    }
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return [];
    }
}

function saveJSON(filename, data) {
    const filePath = path.join(DB_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// تحميل جميع البيانات
users = loadJSON('users.json');
students = loadJSON('students.json');
doctors = loadJSON('doctors.json');
teachingAssistants = loadJSON('teaching_assistants.json');
subjects = loadJSON('subjects.json');
lectures = loadJSON('lectures.json');
departments = loadJSON('departments.json');
locations = loadJSON('locations.json');
timeslots = loadJSON('timeslots.json');
days = loadJSON('days.json');
recycleBin = loadJSON('recyclebin.json');
grades = loadJSON('grades.json');
attendanceRecords = loadJSON('attendance.json');
studentLoginData = loadJSON('student_login.json');

// ============================================
// ✅ AUTHENTICATION MIDDLEWARE
// ============================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// ============================================
// ✅ LOGIN ENDPOINTS
// ============================================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const passwordValid = await bcrypt.compare(password, user.password);
    
    if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
    );
    
    res.json({
        success: true,
        token,
        user: { id: user.id, username: user.username, role: user.role }
    });
});

// ============================================
// ✅ API ENDPOINTS - مثال
// ============================================
app.get('/api/students', authenticateToken, (req, res) => {
    res.json(students);
});

app.get('/api/doctors', authenticateToken, (req, res) => {
    res.json(doctors);
});

app.get('/api/subjects', authenticateToken, (req, res) => {
    res.json(subjects);
});

app.get('/api/lectures', authenticateToken, (req, res) => {
    res.json(lectures);
});

// ============================================
// ✅ مسارات الملفات الثابتة
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gate.html'));
});

app.get('/gate.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gate.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/students.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'students.html'));
});

app.get('/traxa_doctor_management.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'traxa_doctor_management.html'));
});

app.get('/system-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'system-dashboard.html'));
});

app.get('/exam.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exam.html'));
});

// ============================================
// ✅ تشغيل السيرفر - التصحيح النهائي
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`🚀 TRAXA SERVER IS RUNNING`);
    console.log(`========================================`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Local: http://localhost:${PORT}`);
    console.log(`📁 Database: ${DB_DIR}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
    console.log(`========================================`);
});
