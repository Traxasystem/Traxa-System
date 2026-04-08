// server.js - الكود الكامل النهائي مع إضافة Recycle Bin
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const archiver = require('archiver');
const unzipper = require('unzipper');
const cors = require('cors');
const WebSocket = require('ws');  // ✅ يجب أن يكون هنا قبل استخدامه
const os = require('os');
const bcrypt = require('bcrypt');
const saltRounds = 10; // عدد مرات التشفير (كلما زاد كان أقوى وأبطأ)

const app = express();
const PORT = process.env.PORT || 3000;

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

console.log(`🌍 Render URL: ${RENDER_URL}`);

const JWT_SECRET = 'attendance_system_2026_production_key_change_this';

// ✅ انقل هذين السطرين هنا
const SSL_KEY_PATH = path.join(__dirname, 'server.key');
const SSL_CERT_PATH = path.join(__dirname, 'server.crt');
// === JSON PARSER AFTER ALL UPLOAD ROUTES ===
app.use(express.json());
// دالة للحصول على IP المحلي
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

const HOST_DEVICE_IP = getLocalIP(); // يستخدم IP الجهاز الحالي تلقائياً
const CAMERA_REQUEST_FILE = path.join(__dirname, 'temp_camera_request.json');

//========================================================================================
//========================================================================================

// ============================================
// HTTP SECURITY HEADERS - FINAL FIXED VERSION
// ============================================

app.use((req, res, next) => {
    // 1. منع وضع الموقع داخل iframe
    res.setHeader('X-Frame-Options', 'DENY');
    
    // 2. منع المتصفح من تخمين نوع الملفات
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // 3. حماية XSS للمتصفحات القديمة
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // 4. التحكم بمعلومات الـ Referer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // 5. التحكم بالميزات المسموح بها - السماح بالكاميرا
    res.setHeader('Permissions-Policy', 
        'camera=(self), ' +
        'geolocation=(), ' +
        'microphone=(), ' +
        'payment=(), ' +
        'usb=(), ' +
        'bluetooth=()'
    );
    
    // 6. سياسة أمان المحتوى (CSP) - نسخة مبسطة تعمل مع جميع المكتبات
    res.setHeader('Content-Security-Policy', 
        "default-src 'self' https: http: data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; " +
        "style-src 'self' 'unsafe-inline' https: http:; " +
        "font-src 'self' https: http: data:; " +
        "img-src 'self' data: blob: https: http:; " +
        "connect-src 'self' ws: wss: https: http: blob:; " +
        "frame-ancestors 'none'; " +
        "form-action 'self';"
    );
    
    // 7. إضافة HSTS إذا كان الموقع يعمل عبر HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // 8. منع تخزين الصفحات الحساسة في الكاش
    const sensitivePaths = ['/system-dashboard', '/api/locked-users', '/api/security'];
    if (sensitivePaths.some(path => req.path.startsWith(path))) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
    }
    
    next();
});


// منع تخزين الجلسات في الكاش للمستخدمين المسجلين
app.use((req, res, next) => {
    if (req.headers.authorization) {
        // المستخدم مسجل دخول، منع الكاش لجميع الصفحات
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
    next();
});
//========================================================================================
// ============================================
// IP BAN PAGE - HTML TEMPLATE
// ============================================

function getBanPageHTML(ip, reason) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access Denied - System Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #fff;
        }
        
        .ban-container {
            text-align: center;
            padding: 40px;
            max-width: 500px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .ban-icon {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
            }
            50% {
                transform: scale(1.05);
                box-shadow: 0 0 0 15px rgba(239, 68, 68, 0);
            }
        }
        
        .ban-icon i {
            font-size: 50px;
            color: white;
        }
        
        h1 {
            font-size: 28px;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #fff, #9ca3af);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .message {
            color: #9ca3af;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .ip-card {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            padding: 15px;
            margin: 20px 0;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .ip-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .ip-address {
            font-size: 24px;
            font-weight: bold;
            font-family: monospace;
            color: #ef4444;
            margin-top: 5px;
        }
        
        .reason-box {
            background: rgba(239, 68, 68, 0.1);
            border-left: 3px solid #ef4444;
            padding: 12px;
            margin: 20px 0;
            text-align: left;
            border-radius: 8px;
        }
        
        .reason-label {
            font-size: 12px;
            color: #ef4444;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .reason-text {
            color: #f3f4f6;
            font-size: 14px;
        }
        
        .support-text {
            font-size: 12px;
            color: #6b7280;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .support-text a {
            color: #ef4444;
            text-decoration: none;
        }
        
        .support-text a:hover {
            text-decoration: underline;
        }
        
        .timestamp {
            font-size: 11px;
            color: #4b5563;
            margin-top: 15px;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
    <div class="ban-container">
        <div class="ban-icon">
            <i class="fas fa-ban"></i>
        </div>
        
        <h1>Access Denied</h1>
        
        <div class="message">
            Your device does not have permission to access this system.
        </div>
        
        <div class="ip-card">
            <div class="ip-label">
                <i class="fas fa-network-wired"></i> YOUR IP ADDRESS
            </div>
            <div class="ip-address">${escapeHtmlForBanPage(ip)}</div>
        </div>
        
        <div class="reason-box">
            <div class="reason-label">
                <i class="fas fa-info-circle"></i> REASON
            </div>
            <div class="reason-text">
                ${escapeHtmlForBanPage(reason || 'Your IP address has been banned from accessing this system. Please contact the system administrator for assistance.')}
            </div>
        </div>
        
        <div class="support-text">
            <i class="fas fa-headset"></i> If you believe this is a mistake, please contact the system administrator.<br>
            <a href="mailto:admin@system.com">admin@system.com</a>
        </div>
        
        <div class="timestamp">
            <i class="fas fa-clock"></i> ${new Date().toLocaleString()}
        </div>
    </div>
    
    <script>
        // Optional: Prevent back button from refreshing the page
        history.pushState(null, null, location.href);
        window.addEventListener('popstate', function () {
            history.pushState(null, null, location.href);
        });
    </script>
</body>
</html>`;
}

// دالة مساعدة لتجنب XSS في صفحة الحظر
function escapeHtmlForBanPage(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


// Middleware لمنع الـ IPs المحظورة - يعرض صفحة HTML بدلاً من JSON
app.use((req, res, next) => {
    loadIpBlacklist(); // يحمل الـ auto-banned IPs
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    
    // التحقق من القائمة اليدوية أيضاً
    const isManuallyBanned = manualBlacklist && manualBlacklist.some(b => b.ip === clientIp);
    const bannedEntry = isManuallyBanned ? manualBlacklist.find(b => b.ip === clientIp) : null;
    
    if (ipBlacklist.includes(clientIp) || isManuallyBanned) {
        const banReason = bannedEntry?.reason || 'Multiple failed login attempts detected';
        
        console.log(`🚫 BLOCKED: IP ${clientIp} attempted to access ${req.method} ${req.url}`);
        
        // إرجاع صفحة HTML بدلاً من JSON
        return res.status(403).send(getBanPageHTML(clientIp, banReason));
    }
    
    next();
});
// ============================================
// RATE LIMITING - حماية من هجمات DDoS و Brute Force
// ============================================

const rateLimit = require('express-rate-limit');

// === Rate Limiters الديناميكية ===

// دالة لإنشاء Rate Limiter ديناميكي
function createDynamicLimiter(type) {
    return (req, res, next) => {
        const config = getRateLimitConfig(type);
        
        if (!config.enabled) {
            return next(); // تخطي الـ rate limit إذا كان معطلاً
        }
        
        const limiter = rateLimit({
            windowMs: config.windowMs,
            max: config.max,
            message: config.message,
            standardHeaders: config.standardHeaders,
            legacyHeaders: config.legacyHeaders
        });
        
        return limiter(req, res, next);
    };
}

// === Rate Limiters Definitions ===

// 1. عام على جميع الـ API
const generalLimiter = (req, res, next) => {
    const config = getRateLimitConfig('general');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            const exemptPaths = ['/api/health', '/api/active-sessions-all', '/api/active-sessions', '/api/rate-limit-config'];
            return exemptPaths.some(path => req.path.startsWith(path));
        }
    })(req, res, next);
};



// 2. خاص بـ Login endpoints
const loginLimiter = (req, res, next) => {
    const config = getRateLimitConfig('login');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        skipSuccessfulRequests: true,
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

// 3. للـ API المحمية
const apiLimiter = (req, res, next) => {
    const config = getRateLimitConfig('api');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

// 4. للـ Backup
const backupLimiter = (req, res, next) => {
    const config = getRateLimitConfig('backup');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

// 5. للـ Restore
const restoreLimiter = (req, res, next) => {
    const config = getRateLimitConfig('restore');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

// 6. للطلاب
const studentLimiter = (req, res, next) => {
    const config = getRateLimitConfig('student');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            return req.path === '/api/grades/student/:studentId/visible';
        }
    })(req, res, next);
};

// 7. للدكاترة
const doctorLimiter = (req, res, next) => {
    const config = getRateLimitConfig('doctor');
    if (!config.enabled) return next();
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

// === تطبيق الـ Rate Limiters ===

// 1. عام على جميع الـ API
app.use('/api/', generalLimiter);

// 2. خاص بـ Login endpoints (أقوى)
app.use('/api/login', loginLimiter);
app.use('/api/doctor/login', loginLimiter);
app.use('/api/student/login', loginLimiter);
app.use('/api/dev/login', loginLimiter);

// 3. خاص بـ Backup و Restore
app.use('/api/backup', backupLimiter);
app.use('/api/backup-now', backupLimiter);
app.use('/api/restore', restoreLimiter);

// 4. خاص بـ API المحمية
app.use('/api/students', apiLimiter);
app.use('/api/doctors', apiLimiter);
app.use('/api/subjects', apiLimiter);
app.use('/api/lectures', apiLimiter);
app.use('/api/grades', apiLimiter);
app.use('/api/attendance', apiLimiter);
app.use('/api/recyclebin', apiLimiter);
app.use('/api/student-logins', apiLimiter);

// 5. خاص بـ Student endpoints
app.use('/api/grades/student', studentLimiter);
app.use('/api/student', studentLimiter);

// 6. خاص بـ Doctor endpoints
app.use('/api/doctor', doctorLimiter);

// === Middleware لتسجيل تجاوزات الـ Rate Limit ===
app.use((req, res, next) => {
    // تخزين الوقت الأصلي
    const startTime = Date.now();
    
    // الاستماع لحدث انتهاء الطلب
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // إذا كان الـ response 429 (Too Many Requests)
        if (res.statusCode === 429) {
            const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
            console.log(`⚠️ Rate limit exceeded: ${clientIp} on ${req.method} ${req.path} (${duration}ms)`);
            
            // تسجيل في الـ audit log
            logAudit(null, 'system', 'RATE_LIMIT_EXCEEDED', 
                `IP ${clientIp} exceeded rate limit on ${req.path}`, clientIp);
        }
    });
    
    next();
});

// === إضافة Rate Limit Headers للردود ===
app.use((req, res, next) => {
    const oldJson = res.json;
    res.json = function(data) {
        // إضافة headers قبل الإرسال
        if (res.statusCode !== 429) {
            res.setHeader('X-RateLimit-Limit', '200');
            res.setHeader('X-RateLimit-Remaining', 'unknown');
            res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 900);
        }
        return oldJson.call(this, data);
    };
    next();
});


//========================================================================================
// ============================================
// RATE LIMITS MANAGEMENT APIs
// ============================================

// GET: جلب إعدادات الـ Rate Limits الحالية
app.get('/api/rate-limit-config', authenticateToken, (req, res) => {
    // فقط admin و it يمكنهم رؤية الإعدادات
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    res.json({
        success: true,
        config: rateLimitsConfig,
        timestamp: new Date().toISOString()
    });
});

// POST: تحديث إعدادات الـ Rate Limits
app.post('/api/rate-limit-config', authenticateToken, (req, res) => {
    // فقط admin و it يمكنهم تعديل الإعدادات
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const { type, setting, value } = req.body;
    
    // إذا كان التحديث لجميع الإعدادات دفعة واحدة
    if (type === 'all' && req.body.config) {
        // التحقق من صحة البيانات
        const newConfig = req.body.config;
        for (const key in newConfig) {
            if (rateLimitsConfig[key]) {
                rateLimitsConfig[key] = { ...rateLimitsConfig[key], ...newConfig[key] };
            }
        }
        saveRateLimitsConfig();
        logAudit(req.user.id, req.user.username, 'RATE_LIMITS_UPDATED', 
                 `Rate limits configuration updated`, req.ip);
        
        return res.json({ 
            success: true, 
            message: 'Rate limits configuration updated successfully',
            config: rateLimitsConfig
        });
    }
    
    // تحديث إعداد محدد
    if (type && rateLimitsConfig[type]) {
        if (setting === 'max' && value !== undefined) {
            rateLimitsConfig[type].max = parseInt(value);
        } else if (setting === 'windowMs' && value !== undefined) {
            rateLimitsConfig[type].windowMs = parseInt(value);
        } else if (setting === 'enabled' && value !== undefined) {
            rateLimitsConfig[type].enabled = value === true || value === 'true';
        } else {
            return res.status(400).json({ error: 'Invalid setting or value' });
        }
        
        saveRateLimitsConfig();
        logAudit(req.user.id, req.user.username, 'RATE_LIMIT_UPDATED', 
                 `Updated ${type}.${setting} to ${value}`, req.ip);
        
        return res.json({ 
            success: true, 
            message: `Rate limit for ${type} updated successfully`,
            config: rateLimitsConfig
        });
    }
    
    res.status(400).json({ error: 'Invalid type or configuration' });
});

// POST: إعادة تعيين الـ Rate Limits إلى الإعدادات الافتراضية
app.post('/api/rate-limit-config/reset', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    rateLimitsConfig = JSON.parse(JSON.stringify(DEFAULT_RATE_LIMITS));
    saveRateLimitsConfig();
    
    logAudit(req.user.id, req.user.username, 'RATE_LIMITS_RESET', 
             `Rate limits reset to defaults`, req.ip);
    
    res.json({ 
        success: true, 
        message: 'Rate limits reset to defaults',
        config: rateLimitsConfig
    });
});

// GET: إحصائيات الـ Rate Limits الحالية
app.get('/api/rate-limit-stats', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const stats = {
        config: rateLimitsConfig,
        active: true,
        timestamp: new Date().toISOString(),
        limits: {}
    };
    
    // إضافة معلومات إضافية
    for (const [key, config] of Object.entries(rateLimitsConfig)) {
        stats.limits[key] = {
            max: config.max,
            windowMinutes: config.windowMs / 60000,
            enabled: config.enabled !== false,
            requestsPerMinute: Math.round(config.max / (config.windowMs / 60000))
        };
    }
    
    res.json(stats);
});



// === GET: حالة الـ Rate Limit (للمشرفين) ===
app.get('/api/rate-limit-status', authenticateToken, (req, res) => {
    // فقط admin و it يمكنهم رؤية حالة الـ rate limit
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
        message: 'Rate limiting is active',
        limits: {
            general: '200 requests per 15 minutes',
            login: '10 attempts per 15 minutes',
            api: '50 requests per 5 minutes',
            backup: '5 operations per hour',
            restore: '2 operations per hour',
            student: '300 requests per 15 minutes',
            doctor: '150 requests per 15 minutes'
        },
        notes: 'Rate limits are applied per IP address'
    });
});


// ============================================
// USER LOCK SYSTEM - بعد 5 محاولات فاشلة
// ============================================

// تخزين المستخدمين المحظورين
let lockedUsers = [];

// دالة لحظر مستخدم
function lockUser(username, userId, reason, ip) {
    const existingLock = lockedUsers.find(u => u.username === username);
    if (existingLock) return;
    
    const lockData = {
        id: lockedUsers.length + 1,
        username: username,
        userId: userId,
        reason: reason,
        lockedAt: new Date().toISOString(),
        lockedBy: 'system',
        ip: ip,
        failedAttempts: failedLoginAttempts.filter(a => a.username === username).length,
        status: 'locked',
        unlockedAt: null,
        unlockedBy: null,
        newPassword: null
    };
    
    lockedUsers.push(lockData);
    console.log(`🔒 User locked: ${username} (${reason})`);
    
    // تسجيل في audit log
    logAudit(userId, username, 'USER_LOCKED', `User locked due to ${reason} from IP ${ip}`, ip);
    
    return lockData;
}

// دالة لفك حظر مستخدم
function unlockUser(username, newPassword = null, unlockedBy = 'admin') {
    const index = lockedUsers.findIndex(u => u.username === username);
    if (index === -1) return null;
    
    lockedUsers[index].status = 'unlocked';
    lockedUsers[index].unlockedAt = new Date().toISOString();
    lockedUsers[index].unlockedBy = unlockedBy;
    lockedUsers[index].newPassword = newPassword;
    
    console.log(`🔓 User unlocked: ${username} by ${unlockedBy}`);
    
    // تسجيل في audit log
    const user = users.find(u => u.username === username);
    logAudit(user?.id, username, 'USER_UNLOCKED', `User unlocked by ${unlockedBy}`, 'system');
    
    // حذف محاولات الفشل السابقة
    failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
    
    // إذا تم توفير كلمة مرور جديدة، قم بتحديثها
    if (newPassword && user) {
        // تحديث كلمة المرور
        updateUserPassword(user.id, newPassword, unlockedBy);
    }
    
    return lockedUsers[index];
}

// دالة لتحديث كلمة مرور المستخدم
async function updateUserPassword(userId, newPassword, updatedBy) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);
    
    users[userIndex].password = hashedPassword;
    saveJSON('users.json', users);
    
    console.log(`🔑 Password updated for user: ${users[userIndex].username} by ${updatedBy}`);
    logAudit(userId, users[userIndex].username, 'PASSWORD_UPDATED', `Password updated by ${updatedBy}`, 'system');
    
    return true;
}

// دالة للتحقق مما إذا كان المستخدم محظوراً
function isUserLocked(username) {
    const lock = lockedUsers.find(u => u.username === username && u.status === 'locked');
    return lock ? lock : null;
}

// ============================================
// USER LOCK MANAGEMENT ENDPOINTS
// ============================================

// GET: جلب جميع المستخدمين المحظورين
app.get('/api/locked-users', authenticateToken, (req, res) => {
    // فقط admin و it يمكنهم رؤية المستخدمين المحظورين
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const locked = lockedUsers.filter(u => u.status === 'locked');
    res.json({
        total: locked.length,
        users: locked
    });
});

// GET: جلب تفاصيل مستخدم محظور
app.get('/api/locked-users/:username', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const username = req.params.username;
    const lockInfo = lockedUsers.find(u => u.username === username && u.status === 'locked');
    
    if (!lockInfo) {
        return res.status(404).json({ error: 'User not locked' });
    }
    
    // جلب معلومات المستخدم الإضافية
    let userDetails = null;
    
    // البحث في جميع الجداول
    const systemUser = users.find(u => u.username === username);
    if (systemUser) userDetails = { type: 'system', ...systemUser };
    
    const doctor = doctors.find(d => d.username === username);
    if (doctor) userDetails = { type: 'doctor', ...doctor };
    
    const ta = teachingAssistants.find(t => t.username === username);
    if (ta) userDetails = { type: 'teaching-assistant', ...ta };
    
    const student = students.find(s => s.student_id === username);
    if (student) userDetails = { type: 'student', ...student };
    
    res.json({
        lockInfo: lockInfo,
        userDetails: userDetails,
        failedAttempts: failedLoginAttempts.filter(a => a.username === username)
    });
});

// ============================================
// UNLOCK USER ENDPOINT
// ============================================

app.post('/api/unlock-user/:username', authenticateToken, async (req, res) => {
    // فقط admin و it يمكنهم فك الحظر
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const username = req.params.username;
    // ✅ إصلاح: تأكد من أن req.body موجودة، وإلا أعطِ قيمة افتراضية
    const { keepCurrentPassword, newPassword } = req.body || {}; 
    
    console.log(`🔓 Unlock request for user: ${username}`);
    
    // التحقق من وجود req.body وعدم كونه فارغاً
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Missing request body. Please provide unlock options.' });
    }
    
    // البحث عن المستخدم في lockedUsers
    if (!lockedUsers) {
        // تهيئة lockedUsers إذا لم تكن موجودة
        global.lockedUsers = [];
    }
    
    const lockIndex = lockedUsers.findIndex(u => u.username === username && u.status === 'locked');
    if (lockIndex === -1) {
        return res.status(404).json({ error: 'User is not locked' });
    }
    
    // البحث عن المستخدم في جداول البيانات
    let user = null;
    let userType = null;
    
    // البحث في جدول المستخدمين
    user = users.find(u => u.username === username);
    if (user) userType = 'system';
    
    // البحث في جدول الأطباء
    if (!user) {
        user = doctors.find(d => d.username === username);
        if (user) userType = 'doctor';
    }
    
    // البحث في جدول المعيدين
    if (!user) {
        user = teachingAssistants.find(t => t.username === username);
        if (user) userType = 'teaching-assistant';
    }
    
    // البحث في جدول الطلاب
    if (!user) {
        const student = students.find(s => s.student_id === username);
        if (student) {
            user = student;
            userType = 'student';
        }
    }
    
    if (!user) {
        return res.status(404).json({ error: 'User not found in any database' });
    }
    
    // تحديث كلمة المرور إذا تم توفيرها
    if (newPassword && !keepCurrentPassword) {
        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }
        
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);
        
        // تحديث حسب نوع المستخدم
        if (userType === 'system') {
            const userIndex = users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                users[userIndex].password = hashedPassword;
                saveJSON('users.json', users);
            }
        } else if (userType === 'doctor') {
            const doctorIndex = doctors.findIndex(d => d.id === user.id);
            if (doctorIndex !== -1) {
                doctors[doctorIndex].password = hashedPassword;
                saveJSON('doctors.json', doctors);
            }
        } else if (userType === 'teaching-assistant') {
            const taIndex = teachingAssistants.findIndex(t => t.id === user.id);
            if (taIndex !== -1) {
                teachingAssistants[taIndex].password = hashedPassword;
                saveJSON('teaching_assistants.json', teachingAssistants);
            }
        } else if (userType === 'student') {
            const loginIndex = studentLoginData.findIndex(l => l.student_id === username);
            if (loginIndex !== -1) {
                studentLoginData[loginIndex].password = hashedPassword;
                studentLoginData[loginIndex].is_default_password = false;
                studentLoginData[loginIndex].updated_at = new Date().toISOString();
                saveJSON('student_login.json', studentLoginData);
            }
        }
        
        console.log(`🔑 Password updated for user: ${username}`);
    }
    
    // فك الحظر
    lockedUsers[lockIndex].status = 'unlocked';
    lockedUsers[lockIndex].unlockedAt = new Date().toISOString();
    lockedUsers[lockIndex].unlockedBy = req.user.username;
    lockedUsers[lockIndex].newPassword = newPassword || null;
    
    // إزالة المحاولات الفاشلة
    if (typeof failedLoginAttempts !== 'undefined') {
        failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
    }
    
    console.log(`✅ User unlocked: ${username} by ${req.user.username}`);
    
    // تسجيل في audit log
    if (typeof logAudit === 'function') {
        logAudit(user.id, username, 'USER_UNLOCKED', 
            `User unlocked by ${req.user.username}${newPassword ? ' with new password' : ''}`, req.ip);
    }
    
    res.json({ 
        success: true, 
        message: `User ${username} unlocked successfully${newPassword ? ' with new password' : ''}`,
        user: {
            username: username,
            type: userType,
            unlockedAt: lockedUsers[lockIndex].unlockedAt,
            unlockedBy: req.user.username
        }
    });
});

// POST: إعادة تعيين كلمة المرور لمستخدم محظور
app.post('/api/reset-locked-user-password/:username', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const username = req.params.username;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    const lockInfo = lockedUsers.find(u => u.username === username);
    if (!lockInfo) {
        return res.status(404).json({ error: 'User not found or not locked' });
    }
    
    // تحديث كلمة المرور
    let updated = false;
    
    const systemUser = users.find(u => u.username === username);
    if (systemUser) {
        const salt = bcrypt.genSaltSync(10);
        systemUser.password = bcrypt.hashSync(newPassword, salt);
        saveJSON('users.json', users);
        updated = true;
    }
    
    const doctor = doctors.find(d => d.username === username);
    if (doctor) {
        const salt = bcrypt.genSaltSync(10);
        doctor.password = bcrypt.hashSync(newPassword, salt);
        saveJSON('doctors.json', doctors);
        updated = true;
    }
    
    const ta = teachingAssistants.find(t => t.username === username);
    if (ta) {
        const salt = bcrypt.genSaltSync(10);
        ta.password = bcrypt.hashSync(newPassword, salt);
        saveJSON('teaching_assistants.json', teachingAssistants);
        updated = true;
    }
    
    const student = students.find(s => s.student_id === username);
    if (student) {
        const studentLogin = studentLoginData.find(l => l.student_id === username);
        if (studentLogin) {
            const salt = bcrypt.genSaltSync(10);
            studentLogin.password = bcrypt.hashSync(newPassword, salt);
            studentLogin.is_default_password = false;
            saveJSON('student_login.json', studentLoginData);
            updated = true;
        }
    }
    
    if (!updated) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
        success: true,
        message: `Password reset for ${username}`,
        newPassword: newPassword
    });
});

//========================================================================================
//========================================================================================
// API للهوست لفحص الطلبات الجديدة
app.get('/api/camera/pending-request', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    
    // تحقق من أن الطلب قادم من جهاز الهوست
    if (clientIp !== HOST_DEVICE_IP) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        if (fs.existsSync(CAMERA_REQUEST_FILE)) {
            const data = fs.readFileSync(CAMERA_REQUEST_FILE, 'utf8');
            const request = JSON.parse(data);
            
            // حذف الطلبات الأقدم من 30 ثانية
            if (Date.now() - request.payload.timestamp > 30000) {
                fs.unlinkSync(CAMERA_REQUEST_FILE);
                return res.json({ hasRequest: false });
            }
            
            // حذف الملف بعد القراءة
            fs.unlinkSync(CAMERA_REQUEST_FILE);
            
            res.json({ 
                hasRequest: true,
                ...request
            });
        } else {
            res.json({ hasRequest: false });
        }
    } catch (error) {
        console.error('Error reading camera request:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ============================================
// PERMISSIONS SYSTEM - COMPLETE FIX
// ============================================

// قائمة بكل الصلاحيات الممكنة (مصدر واحد للحقيقة)
const ALL_PERMISSION_KEYS = [
  // Navigation - Sidebar
  'nav.students', 'nav.doctors', 'nav.teaching-assistants', 'nav.subjects', 
  'nav.lectures', 'nav.reports', 'nav.management', 'nav.recyclebin', 'nav.student-login',
  
  // Students
  'btn.students.add', 'btn.students.edit', 'btn.students.delete',
  
  // Doctors
  'btn.doctors.add', 'btn.doctors.edit', 'btn.doctors.delete',
  
  // Teaching Assistants - كاملة
  'nav.teaching-assistants',
  'btn.teaching-assistants.view',
  'btn.teaching-assistants.add',
  'btn.teaching-assistants.edit',
  'btn.teaching-assistants.delete',
  
  // Subjects
  'btn.subjects.add', 'btn.subjects.edit', 'btn.subjects.delete',
  
  // Lectures
  'btn.lectures.add', 'btn.lectures.edit', 'btn.lectures.delete',
  
  // Reports Cards
  'card.reports.students', 'card.reports.doctors', 'card.reports.subjects', 
  'card.reports.lectures', 'card.reports.qr',
  
  // Management Cards
  'card.management.users', 'card.management.backup', 'card.management.restore', 
  'card.management.verify', 'card.management.database',
  
  // Recycle Bin
  'nav.recyclebin', 'btn.recyclebin.restore', 'btn.recyclebin.confirm', 'btn.recyclebin.export',
  
  // Student Login - كاملة
  'nav.student-login',
  'btn.student-login.view',
  'btn.student-login.edit',
  'btn.student-login.delete',
  'btn.student-login.reset',
  'btn.student-login.export'
];
// الصلاحيات الافتراضية لكل دور
const DEFAULT_PERMISSIONS = {
  admin: {},
  it: {},
  mng: {
    // Teaching Assistants - مفعلة للمدير
    'nav.teaching-assistants': true,
    'btn.teaching-assistants.view': true,
    'btn.teaching-assistants.add': true,
    'btn.teaching-assistants.edit': true,
    'btn.teaching-assistants.delete': true,
    
    // Student Login - غير مفعلة للمدير
    'nav.student-login': false,
    'btn.student-login.view': false,
    'btn.student-login.edit': false,
    'btn.student-login.delete': false,
    'btn.student-login.reset': false,
    'btn.student-login.export': false
  },
  emp: {
    // Teaching Assistants - مفعلة للموظف
    'nav.teaching-assistants': true,
    'btn.teaching-assistants.view': true,
    'btn.teaching-assistants.add': true,
    'btn.teaching-assistants.edit': true,
    'btn.teaching-assistants.delete': true,
    
    // Student Login - غير مفعلة للموظف
    'nav.student-login': false,
    'btn.student-login.view': false,
    'btn.student-login.edit': false,
    'btn.student-login.delete': false,
    'btn.student-login.reset': false,
    'btn.student-login.export': false
  }
};
// CORS configuration
app.use(cors({
  origin: '*',  // يسمح لأي جهاز على الشبكة
  credentials: true
}));
// Middleware لتسجيل جميع الطلبات
app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    
    // التحقق من وجود توكن في الطلب
    let token = null;
    
    if (req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
        console.log(`🔑 Token found in ${req.method} ${req.url}: ${token ? token.substring(0, 30) + '...' : 'none'}`);
    }
    
    if (token) {
        try {
            const userData = decodeAnyToken(token);
            if (userData) {
                console.log(`👤 User decoded:`, { id: userData.id, name: userData.name, role: userData.role });
                addOrUpdateSession(userData, clientIp, req.headers['user-agent'], req.path);
            } else {
                console.log(`❌ Failed to decode token`);
            }
        } catch (e) {
            console.error('Error processing token:', e);
        }
    } else {
        console.log(`ℹ️ No token in ${req.method} ${req.url}`);
    }
    
    next();
});


app.use(express.static('public'));

// Serve index.html للمسار الرئيسي
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve students.html
app.get('/students', (req, res) => {
  res.sendFile(path.join(__dirname, 'students.html'));
});

// Serve doctor page
app.get('/doctor', (req, res) => {
  res.sendFile(path.join(__dirname, 'traxa_doctor_management.html'));
});
// Serve system dashboard
app.get('/system-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'system-dashboard.html'));
});
const DB_DIR = path.join(__dirname, 'database');
const BACKUPS_DIR = path.join(__dirname, 'backups');
const TEMP_UPLOADS = path.join(__dirname, 'temp_uploads');

if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR);
if (!fs.existsSync(TEMP_UPLOADS)) fs.mkdirSync(TEMP_UPLOADS);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

// Multer configuration
const upload = multer({ 
  dest: TEMP_UPLOADS,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// ============================================
// TEACHING ASSISTANT PERMISSIONS SYSTEM - COMPLETE FIX
// ============================================

// الصلاحيات المتاحة للمعيدين
const TA_PERMISSION_KEYS = [
  // Navigation - التحكم في ظهور أزرار الشريط الجانبي
  'ta.nav.overview',
  'ta.nav.subjects',
  'ta.nav.lectures',
  'ta.nav.attendance',
  'ta.nav.reports',
  'ta.nav.grading',
  
  // Attendance Actions - التحكم في أزرار الحضور
  'ta.attendance.start',      // زر Activate Session
  'ta.attendance.end',        // زر End Session
  'ta.attendance.view',       // عرض جدول الحضور
  'ta.attendance.export',     // تصدير تقارير الحضور
  
  // Grades Permissions - التحكم في الدرجات
  'ta.grades.view',           // عرض صفحة الدرجات
  'ta.grades.edit.all',       // تعديل درجات جميع المواد
  'ta.grades.edit.specific',  // تعديل درجات مواد محددة (سنضيفها لاحقاً)
  'ta.grades.export',         // تصدير الدرجات
  
  // Subject Permissions - التحكم في المواد
  'ta.subjects.view',         // عرض المواد
  'ta.subjects.edit.all',     // تعديل جميع المواد
  'ta.subjects.edit.specific', // تعديل مواد محددة
  
  // Reports Permissions - التحكم في التقارير
  'ta.reports.view',          // عرض صفحة التقارير
  'ta.reports.export',        // تصدير التقارير
  'ta.reports.detailed',      // عرض التقارير المفصلة
  
  // Settings
  'ta.settings.view',
  'ta.settings.edit'
];

// Default TA Permissions - أضف هذه الصلاحيات الجديدة
const DEFAULT_TA_PERMISSIONS = {
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
  // صلاحيات الدرجات
  'ta.grades.view': true,        // عرض المواد في صفحة الدرجات
  'ta.grades.edit': true,        // تعديل الدرجات
  'ta.grades.visibility': false  // التحكم في إظهار/إخفاء الدرجات للطلاب
};

// تخزين صلاحيات المعيدين في ملف منفصل
let taPermissions = [];

// دالة لتحميل صلاحيات المعيدين من الملف
function loadTAPermissions() {
  try {
    const filePath = path.join(DB_DIR, 'ta_permissions.json');
    
    // التحقق من وجود الملف
    if (!fs.existsSync(filePath)) {
      console.log('📝 Creating new ta_permissions.json file...');
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      taPermissions = [];
      return [];
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    if (!fileContent || fileContent.trim() === '') {
      taPermissions = [];
      saveJSON('ta_permissions.json', []);
      return [];
    }
    
    taPermissions = JSON.parse(fileContent);
    console.log(`✅ Loaded ${taPermissions.length} TA permission records`);
    return taPermissions;
  } catch (error) {
    console.error('❌ Error loading ta_permissions.json:', error);
    // إنشاء الملف إذا كان هناك خطأ
    try {
      fs.writeFileSync(path.join(DB_DIR, 'ta_permissions.json'), JSON.stringify([], null, 2));
      taPermissions = [];
    } catch (e) {
      console.error('Could not create ta_permissions.json:', e);
    }
    return [];
  }
}

// دالة لحفظ صلاحيات المعيدين
function saveTAPermissionsToFile(permissionsArray) {
  try {
    const filePath = path.join(DB_DIR, 'ta_permissions.json');
    fs.writeFileSync(filePath, JSON.stringify(permissionsArray, null, 2));
    console.log(`💾 Saved ${permissionsArray.length} TA permission records`);
    return true;
  } catch (error) {
    console.error('❌ Error saving ta_permissions.json:', error);
    return false;
  }
}

// تحميل الصلاحيات عند بدء التشغيل
taPermissions = loadTAPermissions();

// دالة محسنة للحصول على صلاحيات معيد معين
function getTAPermissions(taId) {
  try {
    if (!Array.isArray(taPermissions)) {
      taPermissions = loadTAPermissions();
    }
    
    const permissionRecord = taPermissions.find(p => p.taId === taId);
    
    if (permissionRecord && permissionRecord.permissions) {
      // دمج الصلاحيات المحفوظة مع الافتراضية
      const mergedPermissions = { ...DEFAULT_TA_PERMISSIONS };
      Object.keys(permissionRecord.permissions).forEach(key => {
        if (key in mergedPermissions) {
          mergedPermissions[key] = permissionRecord.permissions[key];
        }
      });
      return mergedPermissions;
    }
  } catch (error) {
    console.error(`Error getting permissions for TA ${taId}:`, error);
  }
  
  return { ...DEFAULT_TA_PERMISSIONS };
}

// دالة لحفظ صلاحيات معيد
function saveTAPermissions(taId, permissions) {
  try {
    // التأكد من أن taPermissions مصفوفة
    if (!Array.isArray(taPermissions)) {
      taPermissions = loadTAPermissions();
    }
    
    const existingIndex = taPermissions.findIndex(p => p.taId === taId);
    
    const permissionData = {
      taId: taId,
      permissions: permissions,
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // تحديث السجل الموجود
      taPermissions[existingIndex] = { ...taPermissions[existingIndex], ...permissionData };
      console.log(`🔄 Updated permissions for TA ${taId}`);
    } else {
      // إضافة سجل جديد
      permissionData.id = taPermissions.length > 0 ? Math.max(...taPermissions.map(p => p.id)) + 1 : 1;
      permissionData.createdAt = new Date().toISOString();
      taPermissions.push(permissionData);
      console.log(`✅ Created new permissions for TA ${taId}`);
    }
    
    // حفظ التغييرات في الملف
    const saved = saveTAPermissionsToFile(taPermissions);
    
    if (saved) {
      return permissionData;
    } else {
      throw new Error('Failed to save permissions to file');
    }
  } catch (error) {
    console.error(`Error saving permissions for TA ${taId}:`, error);
    throw error;
  }
}


// ============================================
// SERVE DATABASE FILES STATICALLY
// ============================================

// Serve JSON files from database folder
app.use(express.static(__dirname));
app.use('/database', express.static(path.join(__dirname, 'database')));

// Make database files accessible directly
app.get('/doctors.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'database', 'doctors.json'));
});

app.get('/subjects.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'database', 'subjects.json'));
});

app.get('/lectures.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'database', 'lectures.json'));
});

app.get('/locations.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'database', 'locations.json'));
});

app.get('/timeslots.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'database', 'timeslots.json'));
});

app.get('/students.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'database', 'students.json'));
});
// دالة للتحقق من التوكن البسيط للدكاترة
function verifyDoctorToken(token) {
  try {
    // محاولة فك التوكن (base64)
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // التحقق من صلاحية التوكن (لم تنتهِ مدته)
    if (decoded.exp && decoded.exp < Date.now()) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

// تحديث middleware التحقق من التوكن
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // أولاً: تجربة التوكن البسيط (للدكاترة)
  const doctorToken = verifyDoctorToken(token);
  if (doctorToken) {
    req.user = doctorToken;
    return next();
  }

  // ثانياً: تجربة JWT العادي
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}
// === UPDATED AUTHORIZATION FOR INDIVIDUAL PERMISSIONS ===
function checkPermission(permissionKey) {
  return (req, res, next) => {
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(403).json({ error: `User not found` });
    }
    
    // إذا كان المستخدم admin أو it، امنح كل الصلاحيات
    if (user.role === 'admin' || user.role === 'it') {
      return next();
    }
    
    // التحقق من الصلاحية المحددة
    const userPermissions = user.permissions || {};
    const hasPermission = userPermissions[permissionKey] === true;
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: `Access denied: No permission for ${permissionKey}` 
      });
    }
    
    next();
  };
}

// تحديث ENTITY_PERMISSIONS لاستخدام النظام الجديد
// استبدل ENTITY_PERMISSIONS الموجودة بهذه النسخة
const ENTITY_PERMISSIONS = {
  students: { 
    view: ['admin', 'it', 'mng', 'emp'], 
    add: ['admin', 'it', 'mng', 'emp'], 
    edit: ['admin', 'it', 'mng'], 
    delete: ['admin', 'it', 'mng'], 
    manage: ['admin', 'it'] 
  },
  doctors: { 
    view: ['admin', 'it', 'mng', 'emp'], 
    add: ['admin', 'it', 'mng', 'emp'], 
    edit: ['admin', 'it', 'mng'], 
    delete: ['admin', 'it', 'mng'], 
    manage: ['admin', 'it'] 
  },
  'teaching-assistants': { 
    view: ['admin', 'it', 'mng', 'emp'], 
    add: ['admin', 'it', 'mng', 'emp'], 
    edit: ['admin', 'it', 'mng', 'emp'], 
    delete: ['admin', 'it', 'mng', 'emp'], 
    manage: ['admin', 'it'] 
  },
  subjects: { 
    view: ['admin', 'it', 'mng', 'emp'], 
    add: ['admin', 'it', 'mng', 'emp'], 
    edit: ['admin', 'it', 'mng'], 
    delete: ['admin', 'it', 'mng'], 
    manage: ['admin', 'it'] 
  },
  lectures: { 
    view: ['admin', 'it', 'mng', 'emp'], 
    add: ['admin', 'it', 'mng', 'emp'], 
    edit: ['admin', 'it', 'mng'], 
    delete: ['admin', 'it', 'mng'], 
    manage: ['admin', 'it'] 
  },
  users: { 
    view: ['admin', 'it'], 
    add: ['admin', 'it'], 
    edit: ['admin', 'it'], 
    delete: ['admin', 'it'], 
    manage: ['admin', 'it'] 
  },
  system: { 
    manage: ['admin', 'it'] 
  },
  'student-login': { 
    view: ['admin', 'it', 'mng', 'emp'], 
    edit: ['admin', 'it'], 
    delete: ['admin', 'it'], 
    reset: ['admin', 'it'], 
    export: ['admin', 'it', 'mng', 'emp'], 
    manage: ['admin', 'it'] 
  }
};

// === DEFAULT PERMISSIONS HELPER ===
// دالة للحصول على الصلاحية الافتراضية
function getDefaultPermission(permissionKey, role) {
  if (role === 'admin' || role === 'it') return true;
  return DEFAULT_PERMISSIONS[role]?.[permissionKey] || false;
}
// دالة للتحقق من الصلاحية
function checkPermission(user, permissionKey) {
  if (!user) return false;
  
  // Admin و IT كل الصلاحيات مفعلة
  if (user.role === 'admin' || user.role === 'it') return true;
  
  // التحقق من الصلاحية المخصصة
  if (user.permissions && user.permissions[permissionKey] !== undefined) {
    return user.permissions[permissionKey];
  }
  
  // استخدام الصلاحية الافتراضية
  return getDefaultPermission(permissionKey, user.role);
}
// Middleware للتحقق من الصلاحيات
function checkPermissionMiddleware(permissionKey) {
  return (req, res, next) => {
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const hasPermission = checkPermission(user, permissionKey);
    
    if (!hasPermission) {
      console.log(`❌ Access denied: User ${user.username} (${user.role}) missing permission: ${permissionKey}`);
      return res.status(403).json({ 
        error: 'Access denied: Insufficient permissions',
        required: permissionKey
      });
    }
    
    console.log(`✅ Access granted: ${user.username} (${user.role}) for ${permissionKey}`);
    next();
  };
}
// === MIDDLEWARES ===
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// === UPDATED AUTHORIZATION MIDDLEWARE ===
// استبدل دالة authorizeEntity بهذه النسخة
function authorizeEntity(entity, action) {
  return (req, res, next) => {
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(403).json({ error: `User not found` });
    }
    
    // إذا كان المستخدم admin أو it، امنح كل الصلاحيات
    if (user.role === 'admin' || user.role === 'it') {
      return next();
    }
    
    // تحويل entity و action إلى permission key
    let permissionKey = '';
    
    if (entity === 'teaching-assistants') {
      if (action === 'view') permissionKey = 'nav.teaching-assistants';
      else if (action === 'add') permissionKey = 'btn.teaching-assistants.add';
      else if (action === 'edit') permissionKey = 'btn.teaching-assistants.edit';
      else if (action === 'delete') permissionKey = 'btn.teaching-assistants.delete';
      else if (action === 'manage') permissionKey = 'nav.management';
    }
    else if (entity === 'student-login') {
      if (action === 'view') permissionKey = 'nav.student-login';
      else if (action === 'edit') permissionKey = 'btn.student-login.edit';
      else if (action === 'delete') permissionKey = 'btn.student-login.delete';
      else if (action === 'reset') permissionKey = 'btn.student-login.reset';
      else if (action === 'export') permissionKey = 'btn.student-login.export';
      else if (action === 'manage') permissionKey = 'nav.management';
    }
    else {
      // للكيانات الأخرى
      if (entity === 'students') {
        if (action === 'view') permissionKey = 'nav.students';
        else if (action === 'add') permissionKey = 'btn.students.add';
        else if (action === 'edit') permissionKey = 'btn.students.edit';
        else if (action === 'delete') permissionKey = 'btn.students.delete';
      }
      else if (entity === 'doctors') {
        if (action === 'view') permissionKey = 'nav.doctors';
        else if (action === 'add') permissionKey = 'btn.doctors.add';
        else if (action === 'edit') permissionKey = 'btn.doctors.edit';
        else if (action === 'delete') permissionKey = 'btn.doctors.delete';
      }
      else if (entity === 'subjects') {
        if (action === 'view') permissionKey = 'nav.subjects';
        else if (action === 'add') permissionKey = 'btn.subjects.add';
        else if (action === 'edit') permissionKey = 'btn.subjects.edit';
        else if (action === 'delete') permissionKey = 'btn.subjects.delete';
      }
      else if (entity === 'lectures') {
        if (action === 'view') permissionKey = 'nav.lectures';
        else if (action === 'add') permissionKey = 'btn.lectures.add';
        else if (action === 'edit') permissionKey = 'btn.lectures.edit';
        else if (action === 'delete') permissionKey = 'btn.lectures.delete';
      }
      else if (entity === 'users' || entity === 'system') {
        if (action === 'view' || action === 'manage') permissionKey = 'nav.management';
        else if (action === 'add' || action === 'edit' || action === 'delete') permissionKey = 'card.management.users';
      }
    }
    
    // التحقق من الصلاحية
    const userPermissions = user.permissions || {};
    let hasPermission = false;
    
    if (permissionKey && userPermissions[permissionKey] !== undefined) {
      hasPermission = userPermissions[permissionKey];
    } else {
      // استخدام الصلاحية الافتراضية
      hasPermission = getDefaultPermission(permissionKey, user.role);
    }
    
    if (!hasPermission) {
      console.log(`❌ Access denied: ${user.role} cannot ${action} ${entity} (missing ${permissionKey})`);
      return res.status(403).json({ 
        error: `Access denied: Insufficient permissions for ${action} ${entity}` 
      });
    }
    
    console.log(`✅ Access granted: ${user.role} can ${action} ${entity}`);
    next();
  };
}

// === دالة لطلب تأكيد قبل الحذف أو التعديل ===
function requireConfirmation(req, res, next) {
  // التحقق من وجود تعليق في الطلب
  const { confirmationComment } = req.body;
  
  if (!confirmationComment || confirmationComment.trim() === '') {
    return res.status(400).json({ 
      error: 'Confirmation required', 
      message: 'Please provide a comment explaining this change' 
    });
  }
  
  // تخزين التعليق في الطلب لاستخدامه لاحقاً
  req.confirmationComment = confirmationComment.trim();
  next();
}

// دالة مساعدة للتحقق من كلمة المرور (للاستخدام في أي مكان)
async function verifyPassword(plainPassword, hashedPassword) {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

// دالة لتشفير جميع كلمات المرور في جميع الملفات
async function hashAllPasswordsInFiles() {
  console.log('🔐 Checking and hashing all passwords in database...');
  
  const filesToCheck = ['users.json', 'doctors.json', 'teaching_assistants.json', 'student_login.json'];
  const salt = bcrypt.genSaltSync(10);
  let anyUpdate = false;
  
  for (const filename of filesToCheck) {
    const filePath = path.join(DB_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!Array.isArray(data) || data.length === 0) continue;
      
      let needsUpdate = false;
      const updatedData = data.map(item => {
        if (item.password && typeof item.password === 'string' && !item.password.startsWith('$2b$')) {
          needsUpdate = true;
          console.log(`   🔐 Hashing: ${filename} - ${item.username || item.student_id || item.name}`);
          const hashedPassword = bcrypt.hashSync(item.password, salt);
          return { ...item, password: hashedPassword };
        }
        return item;
      });
      
      if (needsUpdate) {
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        console.log(`   ✅ Updated: ${filename}`);
        anyUpdate = true;
      }
    } catch (err) {
      console.error(`   ❌ Error processing ${filename}:`, err.message);
    }
  }
  
  if (anyUpdate) {
    console.log('✅ All passwords have been hashed successfully!');
  } else {
    console.log('✅ All passwords are already hashed.');
  }
}

// === DATA HELPERS ===
function loadJSON(filename) {
  console.log(`📂 Loading ${filename}...`);
  const filePath = path.join(DB_DIR, filename);
  
  // تحقق من وجود الملف في مجلد database
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ ${filename} not found in ${DB_DIR}, checking root directory...`);
    
    // البحث في المجلد الرئيسي كـ fallback
    const rootFilePath = path.join(__dirname, filename);
    if (fs.existsSync(rootFilePath)) {
      console.log(`✅ Found ${filename} in root directory, moving to database folder...`);
      
      // نسخ الملف إلى مجلد database
      fs.copyFileSync(rootFilePath, filePath);
      
      // حذف الملف من المجلد الرئيسي
      fs.unlinkSync(rootFilePath);
    } else {
      console.log(`📝 Creating default ${filename}...`);
      
      // إنشاء ملف افتراضي
      let defaultData = [];
      
      if (filename === 'users.json') {
        // استخدام bcrypt لتشفير كلمات المرور الافتراضية
        const salt = bcrypt.genSaltSync(10);
        defaultData = [
          { 
            id: 1, 
            username: "admin", 
            password: bcrypt.hashSync("admin", salt), 
            role: "admin",
            permissions: {
              'nav.students': true,
              'btn.students.add': true,
              'btn.students.edit': true,
              'btn.students.delete': true,
              'nav.doctors': true,
              'btn.doctors.add': true,
              'btn.doctors.edit': true,
              'btn.doctors.delete': true,
              'nav.subjects': true,
              'btn.subjects.add': true,
              'btn.subjects.edit': true,
              'btn.subjects.delete': true,
              'nav.lectures': true,
              'btn.lectures.add': true,
              'btn.lectures.edit': true,
              'btn.lectures.delete': true,
              'nav.reports': true,
              'card.reports.students': true,
              'card.reports.doctors': true,
              'card.reports.subjects': true,
              'card.reports.lectures': true,
              'card.reports.qr': true,
              'nav.management': true,
              'card.management.users': true,
              'card.management.backup': true,
              'card.management.restore': true,
              'card.management.verify': true,
              'card.management.database': true,
              'nav.recyclebin': true,
              'btn.recyclebin.restore': true,
              'btn.recyclebin.confirm': true,
              'btn.recyclebin.export': true
            }
          },
          { 
            id: 2, 
            username: "it", 
            password: bcrypt.hashSync("it", salt), 
            role: "it",
            permissions: {
              'nav.students': true,
              'btn.students.add': true,
              'btn.students.edit': true,
              'btn.students.delete': true,
              'nav.doctors': true,
              'btn.doctors.add': true,
              'btn.doctors.edit': true,
              'btn.doctors.delete': true,
              'nav.subjects': true,
              'btn.subjects.add': true,
              'btn.subjects.edit': true,
              'btn.subjects.delete': true,
              'nav.lectures': true,
              'btn.lectures.add': true,
              'btn.lectures.edit': true,
              'btn.lectures.delete': true,
              'nav.reports': true,
              'card.reports.students': true,
              'card.reports.doctors': true,
              'card.reports.subjects': true,
              'card.reports.lectures': true,
              'card.reports.qr': true,
              'nav.management': true,
              'card.management.users': true,
              'card.management.backup': true,
              'card.management.restore': true,
              'card.management.verify': true,
              'card.management.database': true,
              'nav.recyclebin': true,
              'btn.recyclebin.restore': true,
              'btn.recyclebin.confirm': true,
              'btn.recyclebin.export': true
            }
          },
          { 
            id: 3, 
            username: "mng", 
            password: bcrypt.hashSync("mng", salt), 
            role: "mng",
            permissions: {
              'nav.students': true,
              'btn.students.add': true,
              'btn.students.edit': true,
              'btn.students.delete': false,
              'nav.doctors': true,
              'btn.doctors.add': true,
              'btn.doctors.edit': true,
              'btn.doctors.delete': false,
              'nav.subjects': true,
              'btn.subjects.add': true,
              'btn.subjects.edit': true,
              'btn.subjects.delete': false,
              'nav.lectures': true,
              'btn.lectures.add': true,
              'btn.lectures.edit': true,
              'btn.lectures.delete': false,
              'nav.reports': true,
              'card.reports.students': true,
              'card.reports.doctors': true,
              'card.reports.subjects': true,
              'card.reports.lectures': true,
              'card.reports.qr': false,
              'nav.management': false,
              'card.management.users': false,
              'card.management.backup': false,
              'card.management.restore': false,
              'card.management.verify': false,
              'card.management.database': false,
              'nav.recyclebin': false,
              'btn.recyclebin.restore': false,
              'btn.recyclebin.confirm': false,
              'btn.recyclebin.export': false
            }
          },
          { 
            id: 4, 
            username: "emp", 
            password: bcrypt.hashSync("emp", salt), 
            role: "emp",
            permissions: {
              'nav.students': true,
              'btn.students.add': true,
              'btn.students.edit': false,
              'btn.students.delete': false,
              'nav.doctors': true,
              'btn.doctors.add': true,
              'btn.doctors.edit': false,
              'btn.doctors.delete': false,
              'nav.subjects': true,
              'btn.subjects.add': true,
              'btn.subjects.edit': false,
              'btn.subjects.delete': false,
              'nav.lectures': true,
              'btn.lectures.add': true,
              'btn.lectures.edit': false,
              'btn.lectures.delete': false,
              'nav.reports': true,
              'card.reports.students': true,
              'card.reports.doctors': true,
              'card.reports.subjects': true,
              'card.reports.lectures': true,
              'card.reports.qr': false,
              'nav.management': false,
              'card.management.users': false,
              'card.management.backup': false,
              'card.management.restore': false,
              'card.management.verify': false,
              'card.management.database': false,
              'nav.recyclebin': false,
              'btn.recyclebin.restore': false,
              'btn.recyclebin.confirm': false,
              'btn.recyclebin.export': false
            }
          }
        ];
      } else if (filename === 'days.json') {
        defaultData = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      } else if (filename === 'recyclebin.json') {
        defaultData = [];
      }
      
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      console.log(`✅ Created default ${filename} with ${defaultData.length} records`);
      return defaultData;
    }
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8').trim();
    
    if (!fileContent) {
      console.warn(`⚠️ ${filename} is empty, returning empty array`);
      return [];
    }
    
    const data = JSON.parse(fileContent);
    
    // إذا كان الملف هو users.json، قم بتشفير كلمات المرور غير المشفرة
    if (filename === 'users.json' && data.length > 0) {
      let needsUpdate = false;
      const salt = bcrypt.genSaltSync(10);
      
      const updatedData = data.map(user => {
        // التحقق مما إذا كانت كلمة المرور غير مشفرة (لا تبدأ بـ $2b$)
        if (user.password && typeof user.password === 'string' && !user.password.startsWith('$2b$')) {
          needsUpdate = true;
          console.log(`🔐 Hashing password for user: ${user.username}`);
          const hashedPassword = bcrypt.hashSync(user.password, salt);
          return { ...user, password: hashedPassword };
        }
        return user;
      });
      
      if (needsUpdate) {
        console.log('💾 Saving hashed passwords to users.json');
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
        return updatedData;
      }
    }
    // إذا كان الملف هو doctors.json، قم بتشفير كلمات المرور غير المشفرة
if (filename === 'doctors.json' && data.length > 0) {
  let needsUpdate = false;
  const salt = bcrypt.genSaltSync(10);
  
  const updatedData = data.map(doctor => {
    if (doctor.password && typeof doctor.password === 'string' && !doctor.password.startsWith('$2b$')) {
      needsUpdate = true;
      console.log(`🔐 Hashing password for doctor: ${doctor.username}`);
      const hashedPassword = bcrypt.hashSync(doctor.password, salt);
      return { ...doctor, password: hashedPassword };
    }
    return doctor;
  });
  
  if (needsUpdate) {
    console.log('💾 Saving hashed passwords to doctors.json');
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    return updatedData;
  }
}
// إذا كان الملف هو teaching_assistants.json، قم بتشفير كلمات المرور غير المشفرة
if (filename === 'teaching_assistants.json' && data.length > 0) {
  let needsUpdate = false;
  const salt = bcrypt.genSaltSync(10);
  
  const updatedData = data.map(ta => {
    if (ta.password && typeof ta.password === 'string' && !ta.password.startsWith('$2b$')) {
      needsUpdate = true;
      console.log(`🔐 Hashing password for teaching assistant: ${ta.username}`);
      const hashedPassword = bcrypt.hashSync(ta.password, salt);
      return { ...ta, password: hashedPassword };
    }
    return ta;
  });
  
  if (needsUpdate) {
    console.log('💾 Saving hashed passwords to teaching_assistants.json');
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    return updatedData;
  }
}

// إذا كان الملف هو student_login.json، قم بتشفير كلمات المرور
if (filename === 'student_login.json' && data.length > 0) {
  let needsUpdate = false;
  const salt = bcrypt.genSaltSync(10);
  
  const updatedData = data.map(login => {
    if (login.password && typeof login.password === 'string' && !login.password.startsWith('$2b$')) {
      needsUpdate = true;
      console.log(`🔐 Hashing password for student: ${login.student_id}`);
      const hashedPassword = bcrypt.hashSync(login.password, salt);
      return { ...login, password: hashedPassword };
    }
    return login;
  });
  
  if (needsUpdate) {
    console.log('💾 Saving hashed passwords to student_login.json');
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2));
    return updatedData;
  }
}
    
    console.log(`✅ ${filename} loaded successfully with ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`❌ Error loading ${filename}:`, error.message);
    
    // إنشاء نسخة احتياطية من الملف التالف
    const backupPath = filePath + '.corrupted_' + Date.now();
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`📦 Created backup of corrupted file at: ${backupPath}`);
    }
    
    // إعادة إنشاء الملف
    fs.writeFileSync(filePath, '[]');
    console.log(`🔄 Recreated ${filename} as empty array`);
    return [];
  }
}

function saveJSON(filename, data) {
  const filePath = path.join(DB_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved ${filename} with ${data.length} records`);
}

// دالة لإصلاح الملفات الفارغة
function fixEmptyFiles() {
  console.log('🔧 Checking and fixing empty files...');
  
  const filesToCheck = [
    'students.json',
    'subjects.json', 
    'locations.json',
    'timeslots.json',
    'recyclebin.json',
    'teaching_assistants.json'
  ];
  
  filesToCheck.forEach(filename => {
    const filePath = path.join(DB_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (!content || content === '[]' || content === '{}') {
          console.log(`   Creating default data for ${filename}...`);
          
          let defaultData = [];
          
          if (filename === 'students.json') {
            defaultData = [
              { id: 1, name: "Student One", student_id: "ST001", level: 1, department: "Computer Science", photos: [] },
              { id: 2, name: "Student Two", student_id: "ST002", level: 2, department: "Information Technology", photos: [] }
            ];
          } else if (filename === 'subjects.json') {
            defaultData = [
              { id: 1, name: "Mathematics", doctor_id: 1, doctor_name: "Dr. Ahmed" },
              { id: 2, name: "Physics", doctor_id: 2, doctor_name: "Dr. Sara" }
            ];
          } else if (filename === 'locations.json') {
            defaultData = [
              { id: 1, name: "Room 101", capacity: 50 },
              { id: 2, name: "Room 102", capacity: 60 },
              { id: 3, name: "Lab 1", capacity: 30 }
            ];
          } else if (filename === 'timeslots.json') {
            defaultData = [
              { id: 1, start: "08:00", end: "09:30", display: "08:00 - 09:30" },
              { id: 2, start: "09:45", end: "11:15", display: "09:45 - 11:15" },
              { id: 3, start: "11:30", end: "13:00", display: "11:30 - 13:00" }
            ];
          } else if (filename === 'recyclebin.json') {
            defaultData = [];
          }
          
          fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
          console.log(`   ✅ Created default data for ${filename} (${defaultData.length} records)`);
        }
      } catch (error) {
        console.error(`   ❌ Error checking ${filename}:`, error);
      }
    }
  });
}

// Load all data
let users = loadJSON('users.json');
let students = loadJSON('students.json');
let doctors = loadJSON('doctors.json');
let teachingAssistants = loadJSON('teaching_assistants.json');  // أضف هذا السطر
let subjects = loadJSON('subjects.json');
let lectures = loadJSON('lectures.json');
let departments = loadJSON('departments.json');
let locations = loadJSON('locations.json');
let timeslots = loadJSON('timeslots.json');
let days = loadJSON('days.json');
let recycleBin = loadJSON('recyclebin.json');

// تشفير جميع كلمات المرور (يتم مرة واحدة فقط)
setTimeout(async () => {
  await hashAllPasswordsInFiles();
  
  // إعادة تحميل البيانات بعد التشفير
  users = loadJSON('users.json');
  doctors = loadJSON('doctors.json');
  teachingAssistants = loadJSON('teaching_assistants.json');
  studentLoginData = loadJSON('student_login.json');
  
  console.log('🔄 Data reloaded after password hashing');
}, 1000);

// إذا كان الملف غير موجود، أنشئ مصفوفة فارغة
if (!recycleBin) recycleBin = [];

// === دالة لتسجيل عملية في الـ Recycle Bin ===
function logToRecycleBin(action, entityType, entityId, oldData, newData, comment, userId, username) {
  const logEntry = {
    id: recycleBin.length ? Math.max(...recycleBin.map(r => r.id)) + 1 : 1,
    action: action, // 'delete' or 'edit'
    entityType: entityType, // 'student', 'doctor', 'subject', 'lecture', etc.
    entityId: entityId,
    oldData: oldData,
    newData: newData,
    comment: comment,
    userId: userId,
    username: username,
    timestamp: new Date().toISOString(),
    status: 'pending', // 'pending', 'confirmed', 'restored'
    confirmedBy: null,
    confirmedAt: null,
    restoredBy: null,
    restoredAt: null
  };
  
  recycleBin.push(logEntry);
  saveJSON('recyclebin.json', recycleBin);
  
  console.log(`📝 Recycle Bin: ${action} by ${username} on ${entityType}#${entityId}`);
  return logEntry;
}

//==========sddsdsdsdsdssdsdsdsdsdsdsaddassadsadsadasasd======================




// === RESTORE ROUTE (النسخة المحسنة) ===
app.post('/api/restore', authenticateToken, authorizeEntity('system', 'manage'), upload.single('backup'), async (req, res) => {
  console.log('=== 🗂️ RESTORE PROCESS STARTED ===');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No backup file uploaded' });
  }

  const originalName = req.file.originalname || '';
  console.log('📄 File:', originalName);
  
  if (!originalName.toLowerCase().endsWith('.zip')) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Only .zip files are allowed' });
  }

  const zipPath = req.file.path;
  console.log('📦 Temp zip path:', zipPath);

  let tempBackupDir = null;

  try {
    // 1. إنشاء نسخة احتياطية سريعة للبيانات الحالية
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    tempBackupDir = path.join(__dirname, 'temp_restore_backup_' + backupTimestamp);
    
    if (fs.existsSync(DB_DIR)) {
      fs.cpSync(DB_DIR, tempBackupDir, { recursive: true });
      console.log('💾 Temporary backup created at:', tempBackupDir);
    }

    // 2. حذف مجلد database بالكامل
    console.log('🗑️ Deleting old database folder...');
    if (fs.existsSync(DB_DIR)) {
      fs.rmSync(DB_DIR, { recursive: true, force: true });
      console.log('✅ Old database folder deleted');
    }

    // 3. استخراج الـ ZIP إلى المجلد الرئيسي
    console.log('📂 Extracting ZIP to root directory...');
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: __dirname }))
        .on('close', () => {
          console.log('✅ Extraction completed');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Extraction error:', err);
          reject(err);
        });
    });

    // 4. البحث عن مجلد database في عدة أماكن محتملة
    console.log('🔍 Looking for database folder...');
    
    let foundDatabaseDir = null;
    const possiblePaths = [
      path.join(__dirname, 'database'),          // المجلد الرئيسي
      path.join(__dirname, 'database/database'), // داخل مجلد فرعي
      path.join(__dirname, 'backup/database'),   // داخل مجلد backup
      __dirname                                  // قد تكون الملفات في الجذر
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        console.log(`✅ Found database at: ${possiblePath}`);
        foundDatabaseDir = possiblePath;
        break;
      }
    }
    
    if (!foundDatabaseDir) {
      // البحث عن أي مجلد يحتوي على ملفات JSON
      const allDirs = fs.readdirSync(__dirname).filter(item => {
        const fullPath = path.join(__dirname, item);
        return fs.statSync(fullPath).isDirectory();
      });
      
      for (const dir of allDirs) {
        const dirPath = path.join(__dirname, dir);
        const files = fs.readdirSync(dirPath);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        if (jsonFiles.length > 0) {
          console.log(`✅ Found ${jsonFiles.length} JSON files in: ${dir}`);
          foundDatabaseDir = dirPath;
          break;
        }
      }
    }
    
    if (!foundDatabaseDir) {
      throw new Error('No database folder or JSON files found in backup');
    }

    // 5. إذا كان مجلد database داخل مجلد آخر، انقله للمكان الصحيح
    if (foundDatabaseDir !== DB_DIR) {
      console.log(`🔄 Moving database from ${foundDatabaseDir} to ${DB_DIR}...`);
      
      // إنشاء مجلد database الهدف
      fs.mkdirSync(DB_DIR, { recursive: true });
      
      // نسخ جميع الملفات
      const filesToCopy = fs.readdirSync(foundDatabaseDir);
      console.log(`📋 Files to copy:`, filesToCopy);
      
      for (const file of filesToCopy) {
        const sourcePath = path.join(foundDatabaseDir, file);
        const destPath = path.join(DB_DIR, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
          // نسخ المجلدات بشكل متكرر
          fs.cpSync(sourcePath, destPath, { recursive: true });
        } else {
          // نسخ الملفات
          fs.copyFileSync(sourcePath, destPath);
        }
        console.log(`✅ Copied: ${file}`);
      }
      
      // حذف المصدر
      fs.rmSync(foundDatabaseDir, { recursive: true, force: true });
      console.log(`🗑️ Cleaned up source directory`);
    }

    // 6. تشغيل فحص وإصلاح الملفات الفارغة
    console.log('🔧 Running file fix check...');
    fixEmptyFiles();

    // 7. التحقق من وجود جميع الملفات الأساسية
    console.log('🔎 Verifying essential files...');
    const essentialFiles = [
      'students.json',
      'doctors.json', 
      'subjects.json',
      'lectures.json',
      'users.json',
      'departments.json',
      'locations.json',
      'timeslots.json',
      'days.json',
      'recyclebin.json'
    ];
    
    const missingFiles = [];
    const existingFiles = fs.readdirSync(DB_DIR);
    console.log('📁 Files in database folder:', existingFiles);
    
    for (const essentialFile of essentialFiles) {
      if (!existingFiles.includes(essentialFile)) {
        missingFiles.push(essentialFile);
        console.warn(`⚠️ Missing: ${essentialFile}`);
      } else {
        console.log(`✅ Found: ${essentialFile}`);
      }
    }
    
    if (missingFiles.length > 0) {
      console.log(`⚠️ Creating missing files: ${missingFiles.join(', ')}`);
      
      for (const missingFile of missingFiles) {
        const filePath = path.join(DB_DIR, missingFile);
        fs.writeFileSync(filePath, '[]');
        console.log(`✅ Created empty: ${missingFile}`);
      }
    }

    // 8. التحقق من محتوى كل ملف JSON
    console.log('📁 Checking each JSON file content after restore:');
    
    const jsonFiles = ['students.json', 'subjects.json', 'locations.json', 'doctors.json', 'lectures.json', 'recyclebin.json'];
    jsonFiles.forEach(file => {
      const filePath = path.join(DB_DIR, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          console.log(`   ${file}: ${data.length} records`);
          
          if (data.length === 0) {
            console.warn(`   ⚠️ WARNING: ${file} is EMPTY!`);
          }
        } catch (error) {
          console.error(`   ❌ Error reading ${file}:`, error.message);
        }
      } else {
        console.warn(`   ⚠️ ${file} does NOT exist!`);
      }
    });

    // 9. إعادة تحميل البيانات في الذاكرة
    console.log('🔄 Reloading all data in memory...');
    
    users = loadJSON('users.json');
    students = loadJSON('students.json');
    doctors = loadJSON('doctors.json');
    subjects = loadJSON('subjects.json');
    lectures = loadJSON('lectures.json');
    departments = loadJSON('departments.json');
    locations = loadJSON('locations.json');
    timeslots = loadJSON('timeslots.json');
    days = loadJSON('days.json');
    recycleBin = loadJSON('recyclebin.json');
    
    // التحقق من التحميل
    const loadedData = {
      users: users.length,
      students: students.length,
      doctors: doctors.length,
      subjects: subjects.length,
      lectures: lectures.length,
      departments: departments.length,
      locations: locations.length,
      timeslots: timeslots.length,
      days: days.length,
      recycleBin: recycleBin.length
    };
    
    console.log('📊 Loaded data counts:', loadedData);

    // 10. حذف الملف المؤقت
    fs.unlinkSync(zipPath);
    console.log('🗑️ Temp zip deleted');

    // 11. تنظيف أي ملفات JSON متبقية في المجلد الرئيسي
    console.log('🧹 Cleaning up stray JSON files in root...');
    const rootFiles = fs.readdirSync(__dirname);
    rootFiles.forEach(file => {
      if (file.endsWith('.json') && file !== 'package.json') {
        const filePath = path.join(__dirname, file);
        console.log(`Moving ${file} to database folder...`);
        
        const targetPath = path.join(DB_DIR, file);
        fs.renameSync(filePath, targetPath);
      }
    });

    // 12. تنظيف النسخة الاحتياطية المؤقتة
    if (tempBackupDir && fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
      console.log('🗑️ Temporary backup cleaned');
    }

    console.log('✅ === RESTORE PROCESS COMPLETED ===');
    
    res.json({ 
      message: 'Database restored successfully with all files',
      stats: loadedData,
      files: existingFiles,
      missingFiles: missingFiles
    });

  } catch (error) {
    console.error('❌ RESTORE FAILED:', error);
    
    // محاولة الاستعادة من النسخة الاحتياطية المؤقتة
    try {
      if (tempBackupDir && fs.existsSync(tempBackupDir)) {
        console.log('🔄 Attempting emergency rollback...');
        
        if (fs.existsSync(DB_DIR)) {
          fs.rmSync(DB_DIR, { recursive: true, force: true });
        }
        
        fs.mkdirSync(DB_DIR, { recursive: true });
        fs.cpSync(tempBackupDir, DB_DIR, { recursive: true });
        
        // إعادة التحميل بعد الـ rollback
        users = loadJSON('users.json');
        students = loadJSON('students.json');
        doctors = loadJSON('doctors.json');
        subjects = loadJSON('subjects.json');
        lectures = loadJSON('lectures.json');
        recycleBin = loadJSON('recyclebin.json');
        
        console.log('✅ Emergency rollback completed');
      }
    } catch (rollbackError) {
      console.error('❌ Rollback also failed:', rollbackError);
    }
    
    // تنظيف
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (tempBackupDir && fs.existsSync(tempBackupDir)) {
      fs.rmSync(tempBackupDir, { recursive: true, force: true });
    }
    
    res.status(500).json({ 
      error: 'Restore failed',
      details: error.message,
      stack: error.stack
    });
  }
});

// === JSON PARSER AFTER ALL UPLOAD ROUTES ===
app.use(express.json());

// === LOGIN ===
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    const userAgent = req.headers['user-agent'];
    
    console.log(`🔐 Login attempt: ${username} from ${clientIp}`);
    
    if (!username || !password) {
        logFailedLoginAttempt('unknown', clientIp, userAgent);
        return res.status(400).json({ 
            success: false,
            error: 'Username and password required' 
        });
    }

    // التحقق من أن المستخدم ليس محظوراً
    const lockInfo = isUserLocked(username);
    if (lockInfo) {
        console.log(`🔒 Blocked login attempt for locked user: ${username}`);
        return res.status(423).json({ 
            success: false,
            error: 'ACCOUNT_LOCKED',
            locked: true,
            lockedAt: lockInfo.lockedAt,
            reason: lockInfo.reason,
            failedAttempts: lockInfo.failedAttempts,
            message: 'Your account has been locked due to multiple failed login attempts. Please contact administrator to unlock your account.',
            unlockAfter: 'Manual unlock required'
        });
    }

    const user = users.find(u => u.username === username);
    
    if (!user) {
        logFailedLoginAttempt(username, clientIp, userAgent);
        logAudit(null, username, 'LOGIN_FAILED', `Failed login attempt from ${clientIp}`, clientIp);
        return res.status(401).json({ 
            success: false,
            error: 'Invalid credentials',
            remainingAttempts: calculateRemainingAttempts(username)
        });
    }
    
    // التحقق من كلمة المرور
    let passwordValid = false;
    try {
        passwordValid = await bcrypt.compare(password, user.password);
        console.log(`   Password valid: ${passwordValid}`);
    } catch (err) {
        console.error('Password comparison error:', err);
        passwordValid = false;
    }
    
    if (!passwordValid) {
        logFailedLoginAttempt(username, clientIp, userAgent);
        logAudit(user.id, user.username, 'LOGIN_FAILED', `Invalid password from ${clientIp}`, clientIp);
        
        const remaining = calculateRemainingAttempts(username);
        return res.status(401).json({ 
            success: false,
            error: 'Invalid credentials',
            remainingAttempts: remaining,
            message: remaining <= 0 ? 'Account will be locked after next failed attempt' : `${remaining} attempts remaining before lock`
        });
    }
    
    console.log(`✅ Login successful: ${username}`);
    
    // إزالة أي محاولات فاشلة سابقة للمستخدم
    failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
    
    // تسجيل محاولة ناجحة
    logAudit(user.id, user.username, 'LOGIN_SUCCESS', `User logged in from ${clientIp}`, clientIp);
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    res.json({ 
        success: true,
        token, 
        user: { 
            id: user.id,
            username: user.username, 
            role: user.role 
        } 
    });

    // Track login and register session
    addOrUpdateSession(
        { id: user.id, username: user.username, role: user.role, name: user.username },
        clientIp,
        userAgent,
        '/api/login'
    );
    
    // Log login event
    const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'User logged in',
        details: `User ${user.username} (${user.role}) logged in from ${clientIp}`,
        user: user.username,
        ip: clientIp
    };
    const logsPath = path.join(DB_DIR, 'system_logs.json');
    let logs = [];
    if (fs.existsSync(logsPath)) {
        try { logs = JSON.parse(fs.readFileSync(logsPath, 'utf8')); } catch (e) {}
    }
    logs.push(logEntry);
    if (logs.length > 2000) logs = logs.slice(-2000);
    fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
});

// === GET CURRENT DATA STATS ===
app.get('/api/stats', authenticateToken, (req, res) => {
  const stats = {
    users: users.length,
    students: students.length,
    doctors: doctors.length,
    subjects: subjects.length,
    lectures: lectures.length,
    departments: departments.length,
    locations: locations.length,
    timeslots: timeslots.length,
    days: days.length,
    recycleBin: recycleBin.length
  };
  res.json(stats);
});

// === GET FILE CONTENTS ===
app.get('/api/file-contents/:filename', authenticateToken, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(DB_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `File ${filename} not found` });
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    res.json({
      filename: filename,
      exists: true,
      records: data.length,
      sample: data.length > 0 ? data[0] : null,
      fullContent: data
    });
  } catch (error) {
    res.status(500).json({ 
      error: `Error reading ${filename}`,
      details: error.message 
    });
  }
});

// === GET ALL FILES STATUS ===
app.get('/api/files-status', authenticateToken, (req, res) => {
  const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
  
  const status = files.map(file => {
    const filePath = path.join(DB_DIR, file);
    const stats = fs.statSync(filePath);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      return {
        name: file,
        size: stats.size,
        modified: stats.mtime,
        records: data.length,
        isEmpty: data.length === 0,
        isValid: true
      };
    } catch (error) {
      return {
        name: file,
        size: stats.size,
        modified: stats.mtime,
        records: 0,
        isEmpty: true,
        isValid: false,
        error: error.message
      };
    }
  });
  
  // إضافة الملفات المفقودة
  const requiredFiles = [
    'students.json', 'doctors.json', 'subjects.json', 
    'lectures.json', 'users.json', 'departments.json',
    'locations.json', 'timeslots.json', 'days.json',
    'recyclebin.json'
  ];
  
  const missingFiles = requiredFiles.filter(reqFile => 
    !files.includes(reqFile)
  );
  
  res.json({
    directory: DB_DIR,
    totalFiles: files.length,
    files: status,
    missingFiles: missingFiles,
    hasAllRequiredFiles: missingFiles.length === 0
  });
});

// === INITIALIZE DEFAULT FILES ===
app.post('/api/init-defaults', authenticateToken, authorizeEntity('system', 'manage'), (req, res) => {
  console.log('🔄 Initializing default data files...');
  
  const defaultFiles = {
    'students.json': [
      { id: 1, name: "John Doe", student_id: "ST001", level: 1, department: "Computer Science", photos: [] },
      { id: 2, name: "Jane Smith", student_id: "ST002", level: 2, department: "Information Technology", photos: [] },
      { id: 3, name: "Ahmed Mohamed", student_id: "ST003", level: 3, department: "Software Engineering", photos: [] }
    ],
    'subjects.json': [
      { id: 1, name: "Mathematics", doctor_id: 1, doctor_name: "Dr. Ahmed" },
      { id: 2, name: "Physics", doctor_id: 2, doctor_name: "Dr. Sara" },
      { id: 3, name: "Programming", doctor_id: 3, doctor_name: "Dr. Ali" }
    ],
    'locations.json': [
      { id: 1, name: "Main Hall", capacity: 100 },
      { id: 2, name: "Lab 1", capacity: 30 },
      { id: 3, name: "Room 201", capacity: 50 },
      { id: 4, name: "Auditorium", capacity: 200 }
    ],
    'timeslots.json': [
      { id: 1, start: "08:00", end: "09:30", display: "08:00 - 09:30" },
      { id: 2, start: "09:45", end: "11:15", display: "09:45 - 11:15" },
      { id: 3, start: "11:30", end: "13:00", display: "11:30 - 13:00" },
      { id: 4, start: "13:30", end: "15:00", display: "13:30 - 15:00" }
    ],
    'recyclebin.json': []
  };
  
  Object.entries(defaultFiles).forEach(([filename, data]) => {
    const filePath = path.join(DB_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Created ${filename} with ${data.length} records`);
  });
  
  // إعادة تحميل البيانات في الذاكرة
  students = loadJSON('students.json');
  subjects = loadJSON('subjects.json');
  locations = loadJSON('locations.json');
  timeslots = loadJSON('timeslots.json');
  recycleBin = loadJSON('recyclebin.json');
  
  res.json({ 
    message: 'Default files initialized',
    stats: {
      students: students.length,
      subjects: subjects.length,
      locations: locations.length,
      timeslots: timeslots.length,
      recycleBin: recycleBin.length
    }
  });
});

// === STUDENTS ===
app.get('/api/students', authenticateToken, authorizeEntity('students', 'view'), (req, res) => res.json(students));

app.post('/api/students', authenticateToken, authorizeEntity('students', 'add'), (req, res) => {
  const newStudent = { id: students.length ? Math.max(...students.map(s => s.id)) + 1 : 1, ...req.body };
  students.push(newStudent);
  saveJSON('students.json', students);
  res.json(newStudent);
});

// تعديل دالة PUT للطلاب في server.js
app.put('/api/students/:id', authenticateToken, authorizeEntity('students', 'edit'), (req, res) => {
  const id = parseInt(req.params.id);
  const oldStudent = students.find(s => s.id === id);
  
  if (!oldStudent) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  // دمج البيانات القديمة مع الجديدة مع الحفاظ على face_data
  const updatedStudent = { 
    ...oldStudent, 
    ...req.body,
    // التأكد من وجود face_data
    face_data: req.body.face_data || oldStudent.face_data || {
      has_face: false,
      photos: [],
      descriptors: [],
      updated_at: null
    }
  };
  
  // تحديث الطالب
  students = students.map(s => s.id === id ? updatedStudent : s);
  saveJSON('students.json', students);
  
  console.log(`✅ Student ${id} updated successfully`);
  res.json(updatedStudent);
});

app.delete('/api/students/:id', authenticateToken, authorizeEntity('students', 'delete'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const student = students.find(s => s.id === id);
  
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  // تسجيل في الـ Recycle Bin قبل الحذف
  logToRecycleBin(
    'delete',
    'student',
    id,
    student,
    null,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  // حذف الطالب
  students = students.filter(s => s.id !== id);
  saveJSON('students.json', students);
  
  res.json({ 
    message: 'Student deleted and logged to recycle bin',
    requiresConfirmation: true
  });
});

// === DOCTORS ===
app.get('/api/doctors', authenticateToken, authorizeEntity('doctors', 'view'), (req, res) => res.json(doctors));

app.post('/api/doctors', authenticateToken, authorizeEntity('doctors', 'add'), (req, res) => {
  const newDoctor = { id: doctors.length ? Math.max(...doctors.map(d => d.id)) + 1 : 1, ...req.body };
  doctors.push(newDoctor);
  saveJSON('doctors.json', doctors);
  res.json(newDoctor);
});

app.put('/api/doctors/:id', authenticateToken, authorizeEntity('doctors', 'edit'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const oldDoctor = doctors.find(d => d.id === id);
  
  if (!oldDoctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  const newDoctor = { ...oldDoctor, ...req.body };
  
  logToRecycleBin(
    'edit',
    'doctor',
    id,
    oldDoctor,
    newDoctor,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  doctors = doctors.map(d => d.id === id ? newDoctor : d);
  saveJSON('doctors.json', doctors);
  
  res.json({ 
    message: 'Doctor updated and logged to recycle bin',
    requiresConfirmation: true
  });
});

app.delete('/api/doctors/:id', authenticateToken, authorizeEntity('doctors', 'delete'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const doctor = doctors.find(d => d.id === id);
  
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  logToRecycleBin(
    'delete',
    'doctor',
    id,
    doctor,
    null,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  doctors = doctors.filter(d => d.id !== id);
  saveJSON('doctors.json', doctors);
  
  res.json({ 
    message: 'Doctor deleted and logged to recycle bin',
    requiresConfirmation: true
  });
});

// === SUBJECTS ROUTES - MODIFIED ===
app.get('/api/subjects', authenticateToken, authorizeEntity('subjects', 'view'), (req, res) => {
  const enriched = subjects.map(s => ({
    ...s,
    doctor_name: doctors.find(d => d.id === s.doctor_id)?.name || 'Not Assigned'
  }));
  res.json(enriched);
});

app.post('/api/subjects', authenticateToken, authorizeEntity('subjects', 'add'), (req, res) => {
  const { code, name, doctor_id, level, semester } = req.body;
  
  if (!code || !name || !doctor_id || !level || !semester) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const newSubject = { 
    id: subjects.length ? Math.max(...subjects.map(s => s.id)) + 1 : 1,
    code,
    name,
    doctor_id,
    level,
    semester,
    doctor_name: doctors.find(d => d.id === doctor_id)?.name || 'Not Assigned'
  };
  
  subjects.push(newSubject);
  saveJSON('subjects.json', subjects);
  res.json(newSubject);
});

app.put('/api/subjects/:id', authenticateToken, authorizeEntity('subjects', 'edit'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const oldSubject = subjects.find(s => s.id === id);
  
  if (!oldSubject) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  
  const newSubject = { ...oldSubject, ...req.body };
  
  logToRecycleBin(
    'edit',
    'subject',
    id,
    oldSubject,
    newSubject,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  subjects = subjects.map(s => s.id === id ? newSubject : s);
  saveJSON('subjects.json', subjects);
  
  res.json({ 
    message: 'Subject updated and logged to recycle bin',
    requiresConfirmation: true
  });
});

app.delete('/api/subjects/:id', authenticateToken, authorizeEntity('subjects', 'delete'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const subject = subjects.find(s => s.id === id);
  
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  
  logToRecycleBin(
    'delete',
    'subject',
    id,
    subject,
    null,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  subjects = subjects.filter(s => s.id !== id);
  saveJSON('subjects.json', subjects);
  
  res.json({ 
    message: 'Subject deleted and logged to recycle bin',
    requiresConfirmation: true
  });
});

// === LECTURES ===
app.get('/api/lectures', authenticateToken, authorizeEntity('lectures', 'view'), (req, res) => res.json(lectures));

app.post('/api/lectures', authenticateToken, authorizeEntity('lectures', 'add'), (req, res) => {
  const newLecture = { id: lectures.length ? Math.max(...lectures.map(l => l.id)) + 1 : 1, ...req.body };
  lectures.push(newLecture);
  saveJSON('lectures.json', lectures);
  res.json(newLecture);
});

app.put('/api/lectures/:id', authenticateToken, authorizeEntity('lectures', 'edit'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const oldLecture = lectures.find(l => l.id === id);
  
  if (!oldLecture) {
    return res.status(404).json({ error: 'Lecture not found' });
  }
  
  const newLecture = { ...oldLecture, ...req.body };
  
  logToRecycleBin(
    'edit',
    'lecture',
    id,
    oldLecture,
    newLecture,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  lectures = lectures.map(l => l.id === id ? newLecture : l);
  saveJSON('lectures.json', lectures);
  
  res.json({ 
    message: 'Lecture updated and logged to recycle bin',
    requiresConfirmation: true
  });
});

app.delete('/api/lectures/:id', authenticateToken, authorizeEntity('lectures', 'delete'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const lecture = lectures.find(l => l.id === id);
  
  if (!lecture) {
    return res.status(404).json({ error: 'Lecture not found' });
  }
  
  logToRecycleBin(
    'delete',
    'lecture',
    id,
    lecture,
    null,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  lectures = lectures.filter(l => l.id !== id);
  saveJSON('lectures.json', lectures);
  
  res.json({ 
    message: 'Lecture deleted and logged to recycle bin',
    requiresConfirmation: true
  });
});

// === DEPARTMENTS ===
app.get('/api/departments', authenticateToken, authorizeEntity('departments', 'view'), (req, res) => res.json(departments));
app.post('/api/departments', authenticateToken, authorizeEntity('departments', 'add'), (req, res) => {
  const newDept = { id: departments.length ? Math.max(...departments.map(d => d.id)) + 1 : 1, ...req.body };
  departments.push(newDept);
  saveJSON('departments.json', departments);
  res.json(newDept);
});
app.put('/api/departments/:id', authenticateToken, authorizeEntity('departments', 'edit'), (req, res) => {
  const id = parseInt(req.params.id);
  departments = departments.map(d => d.id === id ? { ...d, ...req.body } : d);
  saveJSON('departments.json', departments);
  res.json({ message: 'Updated' });
});
app.delete('/api/departments/:id', authenticateToken, authorizeEntity('departments', 'delete'), (req, res) => {
  const id = parseInt(req.params.id);
  departments = departments.filter(d => d.id !== id);
  saveJSON('departments.json', departments);
  res.json({ message: 'Deleted' });
});

// === LOCATIONS ===
app.get('/api/locations', authenticateToken, authorizeEntity('locations', 'view'), (req, res) => res.json(locations));
app.post('/api/locations', authenticateToken, authorizeEntity('locations', 'add'), (req, res) => {
  const newLoc = { id: locations.length ? Math.max(...locations.map(l => l.id)) + 1 : 1, ...req.body };
  locations.push(newLoc);
  saveJSON('locations.json', locations);
  res.json(newLoc);
});
app.put('/api/locations/:id', authenticateToken, authorizeEntity('locations', 'edit'), (req, res) => {
  const id = parseInt(req.params.id);
  locations = locations.map(l => l.id === id ? { ...l, ...req.body } : l);
  saveJSON('locations.json', locations);
  res.json({ message: 'Updated' });
});
app.delete('/api/locations/:id', authenticateToken, authorizeEntity('locations', 'delete'), (req, res) => {
  const id = parseInt(req.params.id);
  locations = locations.filter(l => l.id !== id);
  saveJSON('locations.json', locations);
  res.json({ message: 'Deleted' });
});

// === TIMESLOTS ===
app.get('/api/timeslots', authenticateToken, authorizeEntity('timeslots', 'view'), (req, res) => res.json(timeslots));
app.post('/api/timeslots', authenticateToken, authorizeEntity('timeslots', 'add'), (req, res) => {
  const newSlot = { id: timeslots.length ? Math.max(...timeslots.map(t => t.id)) + 1 : 1, ...req.body };
  timeslots.push(newSlot);
  saveJSON('timeslots.json', timeslots);
  res.json(newSlot);
});
app.put('/api/timeslots/:id', authenticateToken, authorizeEntity('timeslots', 'edit'), (req, res) => {
  const id = parseInt(req.params.id);
  timeslots = timeslots.map(t => t.id === id ? { ...t, ...req.body } : t);
  saveJSON('timeslots.json', timeslots);
  res.json({ message: 'Updated' });
});
app.delete('/api/timeslots/:id', authenticateToken, authorizeEntity('timeslots', 'delete'), (req, res) => {
  const id = parseInt(req.params.id);
  timeslots = timeslots.filter(t => t.id !== id);
  saveJSON('timeslots.json', timeslots);
  res.json({ message: 'Deleted' });
});

// === DAYS ===
app.get('/api/days', authenticateToken, authorizeEntity('days', 'view'), (req, res) => res.json(days));
app.post('/api/days', authenticateToken, authorizeEntity('days', 'add'), (req, res) => {
  const newDay = req.body.day;
  if (newDay && !days.includes(newDay)) {
    days.push(newDay);
    saveJSON('days.json', days);
  }
  res.json(days);
});
app.delete('/api/days/:day', authenticateToken, authorizeEntity('days', 'delete'), (req, res) => {
  const day = req.params.day;
  days = days.filter(d => d !== day);
  saveJSON('days.json', days);
  res.json({ message: 'Day removed successfully' });
});

// === USERS ===
app.get('/api/users', authenticateToken, (req, res) => {
  const safeUsers = users.map(u => ({ 
    id: u.id, 
    username: u.username, 
    role: u.role,
    hasCustomPermissions: u.permissions !== undefined && Object.keys(u.permissions || {}).length > 0
  }));
  res.json(safeUsers);
});

app.post('/api/users', authenticateToken, authorizeEntity('users', 'add'), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'All fields required' });
  if (users.some(u => u.username === username)) return res.status(400).json({ error: 'Username already exists' });

  // تشفير كلمة المرور
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const newUser = { 
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1, 
    username, 
    password: hashedPassword, 
    role 
  };
  users.push(newUser);
  saveJSON('users.json', users);
  res.json({ message: 'User created successfully' });
});

app.put('/api/users/:id', authenticateToken, authorizeEntity('users', 'edit'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { username, password, role } = req.body;
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username !== user.username && users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  if (username) user.username = username;
  if (role) user.role = role;
  
  // إذا تم إدخال كلمة مرور جديدة، قم بتشفيرها
  if (password) {
    user.password = await bcrypt.hash(password, saltRounds);
  }

  saveJSON('users.json', users);
  res.json({ message: 'User updated successfully' });
});

app.delete('/api/users/:id', authenticateToken, authorizeEntity('users', 'delete'), (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const adminsCount = users.filter(u => u.role === 'admin' || u.role === 'it').length;
  if ((user.role === 'admin' || user.role === 'it') && adminsCount === 1) {
    return res.status(403).json({ error: 'Cannot delete the last admin/it user' });
  }

  users = users.filter(u => u.id !== id);
  saveJSON('users.json', users);
  res.json({ message: 'User deleted successfully' });
});

// === BACKUP ===
app.post('/api/backup', authenticateToken, authorizeEntity('system', 'manage'), (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup_${timestamp}.zip`;
  const backupPath = path.join(BACKUPS_DIR, backupName);

  const output = fs.createWriteStream(backupPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`✅ Backup created: ${backupName} (${archive.pointer()} bytes)`);
    
    // تسجيل تفاصيل الملفات في الـ backup
    const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
    console.log('📁 Files included in backup:', files);
    
    // تسجيل عدد السجلات في كل ملف
    files.forEach(file => {
      const filePath = path.join(DB_DIR, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        console.log(`   ${file}: ${data.length} records`);
      } catch (error) {
        console.error(`   Error reading ${file}:`, error);
      }
    });
    
    res.json({ 
      message: 'Backup created successfully', 
      filename: backupName,
      stats: {
        files: files.length,
        timestamp: new Date().toISOString()
      }
    });
  });

  archive.on('error', err => {
    console.error('❌ Backup error:', err);
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  });
  
  archive.pipe(output);
  
  // إضافة جميع ملفات JSON من مجلد database
  const jsonFiles = fs.readdirSync(DB_DIR).filter(file => file.endsWith('.json'));
  
  if (jsonFiles.length === 0) {
    console.warn('⚠️ No JSON files found in database folder!');
  }
  
  jsonFiles.forEach(file => {
    const filePath = path.join(DB_DIR, file);
    archive.file(filePath, { name: `database/${file}` });
    console.log(`📦 Adding to backup: ${file}`);
  });
  
  archive.finalize();
});

// === HEALTH CHECK ===
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: {
      directory: DB_DIR,
      exists: fs.existsSync(DB_DIR),
      files: fs.existsSync(DB_DIR) ? fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json')).length : 0
    }
  });
});

// GET BACKUPS LIST - بدون توكن
app.get('/api/backups', (req, res) => {
  console.log('📦 Backups list requested from:', req.ip);
  
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      return res.json([]);
    }
    
    const backupFiles = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.zip'));
    const backups = backupFiles.map(file => {
      const filePath = path.join(BACKUPS_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        type: file.includes('auto') ? 'auto' : 'manual'
      };
    }).sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json(backups);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// GET DATABASE INFO - بدون توكن
app.get('/api/database-info', (req, res) => {
  console.log('📁 Database info requested from:', req.ip);
  
  const info = {
    directory: DB_DIR,
    exists: fs.existsSync(DB_DIR),
    files: []
  };
  
  if (fs.existsSync(DB_DIR)) {
    const files = fs.readdirSync(DB_DIR);
    info.files = files.map(file => {
      const filePath = path.join(DB_DIR, file);
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      return {
        name: file,
        exists: fs.existsSync(filePath),
        size: stats ? stats.size : 0,
        modified: stats ? stats.mtime : null
      };
    });
  }
  
  res.json(info);
});

// === GET CURRENT USER INFO ===
// GET: معلومات المستخدم الحالي
app.get('/api/users/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // بناء الصلاحيات الكاملة
  const permissions = {};
  ALL_PERMISSION_KEYS.forEach(key => {
    if (user.permissions && user.permissions[key] !== undefined) {
      permissions[key] = user.permissions[key];
    } else {
      permissions[key] = getDefaultPermission(key, user.role);
    }
  });
  
  const safeUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: permissions
  };
  
  console.log('Returning current user:', safeUser);
  res.json(safeUser);
});

// === GET USER PERMISSIONS ===
// GET: جلب صلاحيات مستخدم معين
app.get('/api/users/:id/permissions', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // بناء كائن الصلاحيات الكامل
  const permissions = {};
  
  ALL_PERMISSION_KEYS.forEach(key => {
    if (user.permissions && user.permissions[key] !== undefined) {
      permissions[key] = user.permissions[key];
    } else {
      permissions[key] = getDefaultPermission(key, user.role);
    }
  });
  
  console.log(`Returning permissions for ${user.username}:`, permissions);
  
  res.json({
    id: user.id,
    userId: user.id,
    username: user.username,
    role: user.role,
    permissions: permissions
  });
});

// === UPDATE USER PERMISSIONS ===
// PUT: تحديث صلاحيات مستخدم
app.put('/api/users/:id/permissions', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { permissions } = req.body;
  
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'Invalid permissions object' });
  }
  
  // تخزين الصلاحيات المخصصة فقط (التي تختلف عن الافتراضية)
  const customPermissions = {};
  
  Object.entries(permissions).forEach(([key, value]) => {
    const defaultValue = getDefaultPermission(key, users[userIndex].role);
    if (value !== defaultValue) {
      customPermissions[key] = value;
    }
  });
  
  // تحديث المستخدم
  if (Object.keys(customPermissions).length > 0) {
    users[userIndex].permissions = customPermissions;
  } else {
    delete users[userIndex].permissions;
  }
  
  saveJSON('users.json', users);
  
  // بناء الرد
  const updatedPermissions = {};
  ALL_PERMISSION_KEYS.forEach(key => {
    if (users[userIndex].permissions && users[userIndex].permissions[key] !== undefined) {
      updatedPermissions[key] = users[userIndex].permissions[key];
    } else {
      updatedPermissions[key] = getDefaultPermission(key, users[userIndex].role);
    }
  });
  
  console.log(`✅ Permissions updated for ${users[userIndex].username}:`, updatedPermissions);
  
  res.json({
    success: true,
    message: 'Permissions updated successfully',
    user: {
      id: users[userIndex].id,
      username: users[userIndex].username,
      role: users[userIndex].role,
      permissions: updatedPermissions
    }
  });
});

// ============================================
// RECYCLE BIN APIs
// ============================================

// GET: جلب جميع سجلات الـ Recycle Bin
app.get('/api/recyclebin', authenticateToken, (req, res) => {
  // فقط admin و it يمكنهم رؤية الـ Recycle Bin
  if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  }
  
  res.json(recycleBin);
});

// GET: جلب سجل معين
app.get('/api/recyclebin/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  }
  
  const id = parseInt(req.params.id);
  const entry = recycleBin.find(r => r.id === id);
  
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  
  res.json(entry);
});

// POST: تأكيد عملية (Confirm)
app.post('/api/recyclebin/:id/confirm', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  }
  
  const id = parseInt(req.params.id);
  const entryIndex = recycleBin.findIndex(r => r.id === id);
  
  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  
  // تحديث الحالة
  recycleBin[entryIndex].status = 'confirmed';
  recycleBin[entryIndex].confirmedBy = req.user.username;
  recycleBin[entryIndex].confirmedAt = new Date().toISOString();
  
  saveJSON('recyclebin.json', recycleBin);
  
  res.json({ 
    message: 'Entry confirmed successfully',
    entry: recycleBin[entryIndex]
  });
});

// POST: استعادة عملية (Restore)
app.post('/api/recyclebin/:id/restore', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  }
  
  const id = parseInt(req.params.id);
  const entry = recycleBin.find(r => r.id === id);
  
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  
  // استعادة البيانات حسب نوع العملية
  if (entry.action === 'delete') {
    // استعادة العنصر المحذوف
    switch (entry.entityType) {
      case 'student':
        students.push(entry.oldData);
        saveJSON('students.json', students);
        break;
      case 'doctor':
        doctors.push(entry.oldData);
        saveJSON('doctors.json', doctors);
        break;
      case 'subject':
        subjects.push(entry.oldData);
        saveJSON('subjects.json', subjects);
        break;
      case 'lecture':
        lectures.push(entry.oldData);
        saveJSON('lectures.json', lectures);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported entity type for restore' });
    }
  } else if (entry.action === 'edit') {
    // استعادة النسخة القديمة (التراجع عن التعديل)
    switch (entry.entityType) {
      case 'student':
        students = students.map(s => s.id === entry.entityId ? entry.oldData : s);
        saveJSON('students.json', students);
        break;
      case 'doctor':
        doctors = doctors.map(d => d.id === entry.entityId ? entry.oldData : d);
        saveJSON('doctors.json', doctors);
        break;
      case 'subject':
        subjects = subjects.map(s => s.id === entry.entityId ? entry.oldData : s);
        saveJSON('subjects.json', subjects);
        break;
      case 'lecture':
        lectures = lectures.map(l => l.id === entry.entityId ? entry.oldData : l);
        saveJSON('lectures.json', lectures);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported entity type for restore' });
    }
  }
  
  // تحديث حالة الإدخال
  entry.status = 'restored';
  entry.restoredBy = req.user.username;
  entry.restoredAt = new Date().toISOString();
  
  saveJSON('recyclebin.json', recycleBin);
  
  res.json({ 
    message: 'Entry restored successfully',
    entry: entry
  });
});

// DELETE: حذف سجل من الـ Recycle Bin (تنظيف)
app.delete('/api/recyclebin/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  }
  
  const id = parseInt(req.params.id);
  const entryIndex = recycleBin.findIndex(r => r.id === id);
  
  if (entryIndex === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  
  recycleBin.splice(entryIndex, 1);
  saveJSON('recyclebin.json', recycleBin);
  
  res.json({ message: 'Entry removed from recycle bin' });
});

// GET: تصدير تقرير الـ Recycle Bin
app.get('/api/recyclebin/export', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
  }
  
  const { startDate, endDate, action, entityType, status } = req.query;
  
  let filtered = [...recycleBin];
  
  // تطبيق الفلاتر
  if (startDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
  }
  
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
  }
  
  if (action) {
    filtered = filtered.filter(e => e.action === action);
  }
  
  if (entityType) {
    filtered = filtered.filter(e => e.entityType === entityType);
  }
  
  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }
  
  res.json({
    total: filtered.length,
    entries: filtered,
    generatedAt: new Date().toISOString(),
    generatedBy: req.user.username
  });
});
// ============================================
// DOCTOR & TEACHING ASSISTANT LOGIN API
// ============================================
app.post('/api/doctor/login', async (req, res) => {
    const { username, password } = req.body || {};
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    const userAgent = req.headers['user-agent'];
    
    console.log(`🔐 Doctor login attempt: ${username} from ${clientIp}`);
    
    if (!username || !password) {
        logFailedLoginAttempt('unknown', clientIp, userAgent);
        return res.status(400).json({ 
            success: false,
            error: 'Username and password required' 
        });
    }

    // التحقق من أن المستخدم ليس محظوراً
    const lockInfo = isUserLocked(username);
    if (lockInfo) {
        console.log(`🔒 Blocked login attempt for locked doctor: ${username}`);
        return res.status(423).json({ 
            success: false,
            error: 'ACCOUNT_LOCKED',
            locked: true,
            lockedAt: lockInfo.lockedAt,
            reason: lockInfo.reason,
            failedAttempts: lockInfo.failedAttempts,
            userType: 'doctor',
            message: 'Your account has been locked due to multiple failed login attempts. Please contact administrator to unlock your account.'
        });
    }

    // البحث في جدول الأطباء
    const doctor = doctors.find(d => d.username === username);
    
    if (doctor) {
        console.log(`👨‍⚕️ Doctor found: ${doctor.name}`);
        
        // التحقق من كلمة المرور
        let passwordValid = false;
        try {
            passwordValid = await bcrypt.compare(password, doctor.password);
            console.log(`   Password valid: ${passwordValid}`);
        } catch (err) {
            console.error('Password comparison error:', err);
            passwordValid = false;
        }
        
        if (!passwordValid) {
            console.log(`❌ Invalid password for doctor: ${username}`);
            logFailedLoginAttempt(username, clientIp, userAgent);
            logAudit(doctor.id, doctor.username, 'LOGIN_FAILED', `Invalid password from ${clientIp}`, clientIp);
            
            const remaining = calculateRemainingAttempts(username);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials',
                remainingAttempts: remaining,
                userType: 'doctor',
                message: remaining <= 0 ? 'Account will be locked after next failed attempt' : `${remaining} attempts remaining before lock`
            });
        }
        
        // إزالة أي محاولات فاشلة سابقة
        failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
        
        const token = jwt.sign(
            { 
                id: doctor.id, 
                username: doctor.username, 
                role: 'doctor',
                name: doctor.name,
                userType: 'doctor'
            }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        logAudit(doctor.id, doctor.username, 'LOGIN_SUCCESS', `Doctor logged in from ${clientIp}`, clientIp);
        
        // تسجيل الجلسة فوراً
        addOrUpdateSession(
            { id: doctor.id, username: doctor.username, name: doctor.name, role: 'doctor', userType: 'doctor' },
            clientIp,
            userAgent,
            '/api/doctor/login'
        );

        console.log(`✅ Doctor login successful: ${doctor.name}`);
        
        return res.json({ 
            success: true,
            token, 
            user: { 
                id: doctor.id,
                username: doctor.username, 
                name: doctor.name,
                email: doctor.email,
                role: 'doctor',
                userType: 'doctor'
            } 
        });
    }

    // البحث في جدول المعيدين
    const teachingAssistant = teachingAssistants.find(ta => ta.username === username);
    
    if (teachingAssistant) {
        console.log(`👨‍🏫 Teaching Assistant found: ${teachingAssistant.name}`);
        
        // التحقق من كلمة المرور
        let passwordValid = false;
        try {
            passwordValid = await bcrypt.compare(password, teachingAssistant.password);
            console.log(`   Password valid: ${passwordValid}`);
        } catch (err) {
            console.error('Password comparison error:', err);
            passwordValid = false;
        }
        
        if (!passwordValid) {
            console.log(`❌ Invalid password for TA: ${username}`);
            logFailedLoginAttempt(username, clientIp, userAgent);
            logAudit(teachingAssistant.id, teachingAssistant.username, 'LOGIN_FAILED', `Invalid password from ${clientIp}`, clientIp);
            
            const remaining = calculateRemainingAttempts(username);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials',
                remainingAttempts: remaining,
                userType: 'teaching-assistant',
                message: remaining <= 0 ? 'Account will be locked after next failed attempt' : `${remaining} attempts remaining before lock`
            });
        }
        
        // إزالة أي محاولات فاشلة سابقة
        failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
        
        const supervisorDoctor = doctors.find(d => d.id === teachingAssistant.supervisor_doctor_id);
        const permissions = getTAPermissions(teachingAssistant.id);

        const token = jwt.sign(
            { 
                id: teachingAssistant.id,
                taId: teachingAssistant.id,
                doctorId: supervisorDoctor.id,
                username: teachingAssistant.username, 
                role: 'teaching-assistant',
                name: teachingAssistant.name,
                supervisorDoctorName: supervisorDoctor.name,
                supervisorDoctorId: supervisorDoctor.id,
                userType: 'teaching-assistant',
                permissions: permissions
            }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        logAudit(teachingAssistant.id, teachingAssistant.username, 'LOGIN_SUCCESS', `Teaching Assistant logged in from ${clientIp}`, clientIp);
        
        // تسجيل الجلسة فوراً
        addOrUpdateSession(
            { 
                id: teachingAssistant.id, 
                username: teachingAssistant.username, 
                name: teachingAssistant.name, 
                role: 'teaching-assistant', 
                userType: 'teaching-assistant' 
            },
            clientIp,
            userAgent,
            '/api/doctor/login'
        );
        
        console.log(`✅ TA login successful: ${teachingAssistant.name}`);
        
        return res.json({ 
            success: true,
            token, 
            user: { 
                id: teachingAssistant.id,
                taId: teachingAssistant.id,
                doctorId: supervisorDoctor.id,
                username: teachingAssistant.username, 
                name: teachingAssistant.name,
                email: teachingAssistant.email,
                role: 'teaching-assistant',
                userType: 'teaching-assistant',
                supervisorDoctorId: supervisorDoctor.id,
                supervisorDoctorName: supervisorDoctor.name,
                permissions: permissions
            } 
        });
    }

    // تسجيل محاولة فاشلة
    console.log(`❌ No doctor or TA found with username: ${username}`);
    logFailedLoginAttempt(username, clientIp, userAgent);
    logAudit(null, username, 'LOGIN_FAILED', `Failed doctor login attempt from ${clientIp}`, clientIp);
    
    const remaining = calculateRemainingAttempts(username);
    return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials',
        remainingAttempts: remaining,
        message: remaining <= 0 ? 'Account will be locked after next failed attempt' : `${remaining} attempts remaining before lock`
    });
});


// ============================================
// STUDENT LOGIN MANAGEMENT
// ============================================

let studentLoginData = [];
try {
  studentLoginData = loadJSON('student_login.json');
  console.log(`✅ Loaded ${studentLoginData.length} student login records`);
} catch (error) {
  console.log('Creating new student_login.json');
  studentLoginData = [];
  saveJSON('student_login.json', studentLoginData);
}

// ============================================
// STUDENT LOGIN - نسخة محسنة مع تحسين التصحيح
// ============================================
app.post('/api/student/login', async (req, res) => {
    const { username, password, isFirstLogin } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    const userAgent = req.headers['user-agent'];
    
    console.log('='.repeat(50));
    console.log(`📝 Student login attempt: ${username} from ${clientIp}`);
    
    if (!username || !password) {
        logFailedLoginAttempt('unknown', clientIp, userAgent);
        return res.status(400).json({ 
            success: false,
            error: 'Username and password required' 
        });
    }
    
    // التحقق من أن الطالب ليس محظوراً
    const lockInfo = isUserLocked(username);
    if (lockInfo) {
        console.log(`🔒 Blocked login attempt for locked student: ${username}`);
        return res.status(423).json({ 
            success: false,
            error: 'ACCOUNT_LOCKED',
            locked: true,
            lockedAt: lockInfo.lockedAt,
            reason: lockInfo.reason,
            failedAttempts: lockInfo.failedAttempts,
            userType: 'student',
            message: 'Your account has been locked due to multiple failed login attempts. Please contact administrator to unlock your account.'
        });
    }
    
    // البحث عن الطالب باستخدام student_id
    const student = students.find(s => s.student_id === username);
    
    if (!student) {
        logFailedLoginAttempt(username, clientIp, userAgent);
        logAudit(null, username, 'LOGIN_FAILED', `Student not found: ${username} from ${clientIp}`, clientIp);
        console.log(`❌ Student ID not found: ${username}`);
        
        const remaining = calculateRemainingAttempts(username);
        return res.status(404).json({ 
            success: false,
            error: 'Student ID not found',
            remainingAttempts: remaining,
            message: remaining <= 0 ? 'Account will be locked after next failed attempt' : `${remaining} attempts remaining before lock`
        });
    }
    
    console.log(`✅ Student found: ${student.name} (ID: ${student.id})`);
    
    // استخراج آخر 4 أرقام من student_id ككلمة مرور افتراضية
    const studentIdStr = username.toString();
    const defaultPassword = studentIdStr.slice(-4).replace(/[^0-9]/g, '');
    
    // البحث عن بيانات تسجيل الدخول
    let loginRecord = studentLoginData.find(l => l.student_id === username);
    
    if (isFirstLogin) {
        // أول مرة تسجيل دخول - إنشاء حساب جديد
        console.log(`📝 Creating new account for ${username} with default password`);
        
        const salt = bcrypt.genSaltSync(10);
        const hashedDefaultPassword = bcrypt.hashSync(defaultPassword, salt);
        
        const newLoginRecord = {
            id: studentLoginData.length ? Math.max(...studentLoginData.map(l => l.id)) + 1 : 1,
            student_id: username,
            student_name: student.name,
            student_level: student.level,
            student_department: student.department,
            password: hashedDefaultPassword,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
            login_count: 1,
            is_default_password: true,
            updated_at: new Date().toISOString()
        };
        
        studentLoginData.push(newLoginRecord);
        saveJSON('student_login.json', studentLoginData);
        
        console.log(`✅ New student account created: ${username}`);
        
        logAudit(student.id, student.name, 'LOGIN_SUCCESS', `Student first login from ${clientIp}`, clientIp);
        
        // إنشاء توكن
        const token = Buffer.from(JSON.stringify({
            id: student.id,
            student_id: student.student_id,
            name: student.name,
            role: 'student',
            exp: Date.now() + 8 * 60 * 60 * 1000
        })).toString('base64');
        
        // تسجيل الجلسة فوراً
        addOrUpdateSession(
            { id: student.id, username: student.student_id, name: student.name, role: 'student', userType: 'student' },
            clientIp,
            userAgent,
            '/api/student/login'
        );
        
        return res.json({
            success: true,
            message: 'Account created successfully',
            token: token,
            isFirstLogin: false,
            isDefaultPassword: true,
            student: {
                id: student.id,
                student_id: student.student_id,
                name: student.name,
                level: student.level,
                department: student.department
            }
        });
        
    } else {
        // تسجيل دخول عادي
        if (!loginRecord) {
            logFailedLoginAttempt(username, clientIp, userAgent);
            logAudit(null, username, 'LOGIN_FAILED', `No account found for student ${username} from ${clientIp}`, clientIp);
            
            const remaining = calculateRemainingAttempts(username);
            return res.status(404).json({ 
                success: false,
                error: 'No account found. This is your first login.',
                isFirstLogin: true,
                defaultPassword: defaultPassword,
                remainingAttempts: remaining
            });
        }
        
        // التحقق من كلمة المرور
        let passwordValid = false;
        
        // إذا كانت كلمة المرور مشفرة (تبدأ بـ $2b$)
        if (loginRecord.password && loginRecord.password.startsWith('$2b$')) {
            try {
                passwordValid = await bcrypt.compare(password, loginRecord.password);
                console.log(`   Password valid (bcrypt): ${passwordValid}`);
            } catch (err) {
                console.error('bcrypt compare error:', err);
                passwordValid = false;
            }
        } else {
            // كلمة مرور قديمة (نص عادي)
            passwordValid = (loginRecord.password === password);
            console.log(`   Password valid (plain): ${passwordValid}`);
            
            // إذا تطابقت، قم بتشفيرها
            if (passwordValid) {
                console.log(`🔄 Upgrading to hashed password for student: ${username}`);
                const salt = bcrypt.genSaltSync(10);
                loginRecord.password = bcrypt.hashSync(password, salt);
                loginRecord.is_default_password = false;
                loginRecord.updated_at = new Date().toISOString();
                saveJSON('student_login.json', studentLoginData);
            }
        }
        
        if (!passwordValid) {
            logFailedLoginAttempt(username, clientIp, userAgent);
            logAudit(student.id, student.name, 'LOGIN_FAILED', `Invalid password from ${clientIp}`, clientIp);
            console.log(`❌ Password mismatch for ${username}`);
            
            const remaining = calculateRemainingAttempts(username);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid password',
                remainingAttempts: remaining,
                message: remaining <= 0 ? 'Account will be locked after next failed attempt' : `${remaining} attempts remaining before lock`
            });
        }
        
        console.log(`✅ Password correct for ${username}`);
        
        // إزالة أي محاولات فاشلة سابقة
        failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
        
        // تحديث آخر تسجيل دخول
        loginRecord.last_login = new Date().toISOString();
        loginRecord.login_count = (loginRecord.login_count || 0) + 1;
        saveJSON('student_login.json', studentLoginData);
        
        console.log(`✅ Student logged in: ${username} (${student.name})`);
        
        // تسجيل محاولة ناجحة
        logAudit(student.id, student.name, 'LOGIN_SUCCESS', `Student logged in from ${clientIp}`, clientIp);
        
        // إنشاء توكن
        const token = Buffer.from(JSON.stringify({
            id: student.id,
            student_id: student.student_id,
            name: student.name,
            role: 'student',
            exp: Date.now() + 8 * 60 * 60 * 1000
        })).toString('base64');
        
        // تسجيل الجلسة فوراً
        addOrUpdateSession(
            { id: student.id, username: student.student_id, name: student.name, role: 'student', userType: 'student' },
            clientIp,
            userAgent,
            '/api/student/login'
        );
        
        // التحقق مما إذا كانت كلمة المرور لا تزال افتراضية
        const isDefaultPassword = loginRecord.is_default_password === true;
        
        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            isDefaultPassword: isDefaultPassword,
            student: {
                id: student.id,
                student_id: student.student_id,
                name: student.name,
                level: student.level,
                department: student.department
            }
        });
    }
});

// دالة مساعدة لحساب المحاولات المتبقية
function calculateRemainingAttempts(username) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentAttempts = failedLoginAttempts.filter(a => 
        a.username === username && 
        new Date(a.timestamp) > tenMinutesAgo
    );
    return Math.max(0, 5 - recentAttempts.length);
}


// GET: الحصول على كلمة المرور الافتراضية لطالب معين (للمساعدة)
app.get('/api/student/default-password/:studentId', (req, res) => {
  const studentId = req.params.studentId;
  
  const student = students.find(s => s.student_id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  // استخراج آخر 4 أرقام
  const defaultPassword = studentId.slice(-4).replace(/[^0-9]/g, '');
  
  res.json({
    student_id: studentId,
    student_name: student.name,
    default_password: defaultPassword
  });
});

// GET: جلب جميع حسابات الطلاب
app.get('/api/student-logins', authenticateToken, authorizeEntity('student-login', 'view'), (req, res) => {
  const safeData = studentLoginData.map(l => ({
    id: l.id,
    student_id: l.student_id,
    student_name: l.student_name,
    student_level: l.student_level,
    student_department: l.student_department,
    password: l.password,
    created_at: l.created_at,
    last_login: l.last_login,
    login_count: l.login_count,
    updated_at: l.updated_at,
    updated_by: l.updated_by
  }));
  
  res.json(safeData);
});


// POST: إعادة تعيين كلمة المرور (للمشرفين)
app.post('/api/student/reset-password/:student_id', authenticateToken, authorizeEntity('student-login', 'reset'), (req, res) => {
  const student_id = req.params.student_id;
  const loginRecord = studentLoginData.find(l => l.student_id === student_id);
  
  if (!loginRecord) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  loginRecord.password = 'student123';
  loginRecord.reset_at = new Date().toISOString();
  loginRecord.reset_by = req.user.username;
  saveJSON('student_login.json', studentLoginData);
  
  res.json({ 
    success: true, 
    message: 'Password reset successfully. New password: student123' 
  });
});

app.delete('/api/student-login/:id', authenticateToken, authorizeEntity('student-login', 'delete'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const loginIndex = studentLoginData.findIndex(l => l.id === id);
  
  if (loginIndex === -1) {
    return res.status(404).json({ error: 'Student login record not found' });
  }
  
  const deletedStudent = studentLoginData[loginIndex];
  studentLoginData.splice(loginIndex, 1);
  saveJSON('student_login.json', studentLoginData);
  
  logToRecycleBin(
    'delete',
    'student-login',
    id,
    deletedStudent,
    null,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  res.json({ 
    success: true, 
    message: 'Student login deleted successfully',
    deleted: {
      id: deletedStudent.id,
      student_id: deletedStudent.student_id,
      student_name: deletedStudent.student_name
    }
  });
});




// ============================================
// GRADES MANAGEMENT APIs (محدثة مع isVisible)
// ============================================

let grades = [];
try {
  grades = loadJSON('grades.json');
  
  // التأكد من أن جميع الدرجات تحتوي على حقل isVisible
  grades = grades.map(g => ({
    ...g,
    isVisible: g.isVisible !== undefined ? g.isVisible : false
  }));
  saveJSON('grades.json', grades);
} catch (error) {
  console.log('Creating new grades.json');
  grades = [];
  saveJSON('grades.json', grades);
}

// POST: إضافة أو تحديث درجة (للدكتور أو المشرفين)
app.post('/api/grades', authenticateToken, (req, res) => {
  const { student_id, subject_id, doctor_id, midterm, oral, practical, attendance, assignment, isVisible } = req.body;
  
  console.log('Saving grade:', req.body);
  
  // التحقق من الصلاحيات
  if (req.user.role === 'doctor' && doctor_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only add grades for yourself' });
  }
  
  // البحث عن الطالب والمادة
  const student = students.find(s => s.id === student_id);
  const subject = subjects.find(s => s.id === subject_id);
  
  if (!student || !subject) {
    return res.status(404).json({ error: 'Student or subject not found' });
  }
  
  // التحقق من وجود درجة سابقة
  const existingIndex = grades.findIndex(g => 
    g.student_id === student_id && g.subject_id === subject_id
  );
  
  const gradeData = {
    student_id,
    student_name: student.name,
    subject_id,
    subject_name: subject.name,
    doctor_id,
    level: subject.level,
    department: subject.department,
    midterm: midterm || 0,
    oral: oral || 0,
    practical: practical || 0,
    attendance: attendance || 0,
    assignment: assignment || 0,
    total: (midterm || 0) + (oral || 0) + (practical || 0) + (attendance || 0) + (assignment || 0),
    semester: subject.semester,
    academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    isVisible: isVisible !== undefined ? isVisible : (existingIndex >= 0 ? grades[existingIndex].isVisible : false)
  };
  
  if (existingIndex >= 0) {
    // تحديث الدرجة الموجودة
    grades[existingIndex] = { ...grades[existingIndex], ...gradeData };
    console.log('Updated existing grade');
  } else {
    // إضافة درجة جديدة
    const newGrade = {
      id: grades.length ? Math.max(...grades.map(g => g.id)) + 1 : 1,
      ...gradeData
    };
    grades.push(newGrade);
    console.log('Added new grade with id:', newGrade.id);
  }
  
  saveJSON('grades.json', grades);
  res.json({ success: true, message: 'Grade saved successfully' });
});

// PUT: تحديث حالة ظهور الدرجات لمادة معينة
app.put('/api/grades/subject/:subjectId/visibility', authenticateToken, (req, res) => {
  const subjectId = parseInt(req.params.subjectId);
  const { isVisible } = req.body;
  
  // التحقق من الصلاحيات
  if (req.user.role === 'doctor') {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject || subject.doctor_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not teach this subject' });
    }
  } else if (req.user.role !== 'admin' && req.user.role !== 'it') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // تحديث جميع درجات هذه المادة
  let updatedCount = 0;
  grades = grades.map(g => {
    if (g.subject_id === subjectId) {
      updatedCount++;
      return { ...g, isVisible };
    }
    return g;
  });
  
  saveJSON('grades.json', grades);
  
  res.json({ 
    success: true, 
    message: `Updated visibility for ${updatedCount} grades`,
    updatedCount
  });
});

// GET: جلب درجات الطالب (للطالب نفسه - فقط المرئية)
app.get('/api/grades/student/:studentId', authenticateToken, (req, res) => {
  const studentId = parseInt(req.params.studentId);
  
  // إذا كان المستخدم طالب، تأكد من أنه يطلب درجاته هو فقط
  if (req.user.role === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'You can only view your own grades' });
  }
  
  // للطالب: إرجاع الدرجات المرئية فقط
  let studentGrades = grades.filter(g => g.student_id === studentId);
  
  if (req.user.role === 'student') {
    studentGrades = studentGrades.filter(g => g.isVisible === true);
  }
  
  res.json(studentGrades);
});

// GET: جلب درجات دكتور معين (للدكتور - جميع الدرجات)
app.get('/api/grades/doctor/:doctorId', authenticateToken, (req, res) => {
  const doctorId = parseInt(req.params.doctorId);
  
  console.log(`Fetching grades for doctor ${doctorId}, user:`, req.user);
  
  if (req.user.role === 'doctor' && req.user.id !== doctorId) {
    return res.status(403).json({ error: 'You can only view your own grades' });
  }
  
  const doctorGrades = grades.filter(g => g.doctor_id === doctorId);
  console.log(`Found ${doctorGrades.length} grades for doctor ${doctorId}`);
  
  res.json(doctorGrades);
});
// استبدل endpoint /api/grades/student/:studentId/visible الموجود بهذا الكود المعدل:

// GET: جلب درجات الطالب المرئية فقط (لصفحة الطالب) - بدون صلاحيات صارمة
app.get('/api/grades/student/:studentId/visible', (req, res) => {
  const studentId = parseInt(req.params.studentId);
  
  console.log(`📊 Fetching visible grades for student ${studentId}`);
  
  try {
    // البحث عن درجات الطالب
    const studentGrades = grades.filter(g => g.student_id === studentId);
    
    // تصفية الدرجات المرئية فقط
    const visibleGrades = studentGrades.filter(g => g.isVisible === true);
    
    console.log(`📝 Found ${studentGrades.length} total grades, ${visibleGrades.length} visible for student ${studentId}`);
    
    // إضافة معلومات إضافية للتصحيح
    if (visibleGrades.length === 0 && studentGrades.length > 0) {
      console.log('⚠️ Grades exist but are not visible:');
      studentGrades.forEach(g => {
        console.log(`   - ${g.subject_name}: Total=${g.total}, Visible=${g.isVisible}`);
      });
    }
    
    res.json(visibleGrades);
  } catch (error) {
    console.error('❌ Error fetching student grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: فحص حالة درجات طالب معين (للتصحيح)
app.get('/api/grades/student/:studentId/debug', (req, res) => {
  const studentId = parseInt(req.params.studentId);
  
  const studentGrades = grades.filter(g => g.student_id === studentId);
  
  const debug = {
    studentId: studentId,
    totalGrades: studentGrades.length,
    visibleGrades: studentGrades.filter(g => g.isVisible).length,
    hiddenGrades: studentGrades.filter(g => !g.isVisible).length,
    grades: studentGrades.map(g => ({
      subject: g.subject_name,
      total: g.total,
      isVisible: g.isVisible,
      midterm: g.midterm,
      oral: g.oral,
      practical: g.practical,
      attendance: g.attendance,
      assignment: g.assignment
    }))
  };
  
  res.json(debug);
});

// GET: التحقق من حالة نظام الدرجات
app.get('/api/grades/status', authenticateToken, (req, res) => {
  const stats = {
    totalGrades: grades.length,
    studentsWithGrades: [...new Set(grades.map(g => g.student_id))].length,
    subjectsWithGrades: [...new Set(grades.map(g => g.subject_id))].length,
    visibleGrades: grades.filter(g => g.isVisible).length,
    fileExists: fs.existsSync(path.join(DB_DIR, 'grades.json')),
    filePath: path.join(DB_DIR, 'grades.json')
  };
  
  res.json(stats);
});
// GET: إحصائيات الدرجات لمادة معينة (للدكتور)
app.get('/api/grades/stats/:subjectId', authenticateToken, (req, res) => {
  const subjectId = parseInt(req.params.subjectId);
  
  console.log(`Fetching stats for subject ${subjectId}`);
  
  const subjectGrades = grades.filter(g => g.subject_id === subjectId);
  
  if (subjectGrades.length === 0) {
    return res.json({ 
      total: 0, 
      average: 0, 
      max: 0, 
      min: 0, 
      passed: 0, 
      failed: 0,
      visibleCount: 0
    });
  }
  
  const totals = subjectGrades.map(g => g.total);
  const average = totals.reduce((a, b) => a + b, 0) / totals.length;
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const passed = subjectGrades.filter(g => g.total >= 25).length;
  const failed = subjectGrades.filter(g => g.total < 25).length;
  const visibleCount = subjectGrades.filter(g => g.isVisible).length;
  
  res.json({
    total: subjectGrades.length,
    average: Math.round(average * 100) / 100,
    max,
    min,
    passed,
    failed,
    visibleCount
  });
});
//===================================================================================
//===================================================================================
// === FACE DESCRIPTORS APIs ===
// ============================================
// FACE DESCRIPTORS APIs
// ============================================

let faceDescriptors = [];
try {
  faceDescriptors = loadJSON('face_descriptors.json');
  console.log(`✅ Loaded ${faceDescriptors.length} face descriptor records`);
} catch (error) {
  console.log('Creating new face_descriptors.json');
  faceDescriptors = [];
  saveJSON('face_descriptors.json', faceDescriptors);
}

// GET: جلب جميع بصمات الوجه
app.get('/api/face-descriptors', authenticateToken, (req, res) => {
  res.json(faceDescriptors);
});

// GET: جلب بصمات وجه طالب معين
app.get('/api/face-descriptors/student/:studentId', authenticateToken, (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const descriptors = faceDescriptors.filter(f => f.student_id === studentId);
  res.json(descriptors);
});

// POST: إضافة بصمات وجه لطالب
app.post('/api/face-descriptors', authenticateToken, (req, res) => {
  const { student_id, photos, descriptors } = req.body;
  
  if (!student_id || !photos || !Array.isArray(photos) || !descriptors || !Array.isArray(descriptors)) {
    return res.status(400).json({ error: 'Student ID, photos array, and descriptors array required' });
  }
  
  if (photos.length !== 10 || descriptors.length !== 10) {
    return res.status(400).json({ error: 'Exactly 10 photos and 10 descriptors required' });
  }
  
  // حذف البصمات القديمة للطالب (إذا وجدت)
  faceDescriptors = faceDescriptors.filter(f => f.student_id !== student_id);
  
  // إنشاء إدخال جديد للطالب
  const newDescriptor = {
    id: faceDescriptors.length ? Math.max(...faceDescriptors.map(f => f.id)) + 1 : 1,
    student_id: student_id,
    photos: photos,
    descriptors: descriptors,
    created_at: new Date().toISOString(),
    created_by: req.user.username,
    updated_at: new Date().toISOString(),
    updated_by: req.user.username,
    count: photos.length
  };
  
  faceDescriptors.push(newDescriptor);
  saveJSON('face_descriptors.json', faceDescriptors);
  
  res.json({ 
    success: true, 
    message: `Saved ${photos.length} face photos for student`,
    descriptor: newDescriptor
  });
});

// PUT: تحديث بصمات وجه طالب
app.put('/api/face-descriptors/student/:studentId', authenticateToken, (req, res) => {
  const studentId = parseInt(req.params.studentId);
  const { photos, descriptors } = req.body;
  
  if (!photos || !Array.isArray(photos) || !descriptors || !Array.isArray(descriptors)) {
    return res.status(400).json({ error: 'Photos and descriptors arrays required' });
  }
  
  if (photos.length !== 10 || descriptors.length !== 10) {
    return res.status(400).json({ error: 'Exactly 10 photos and 10 descriptors required' });
  }
  
  const existingIndex = faceDescriptors.findIndex(f => f.student_id === studentId);
  
  const faceData = {
    student_id: studentId,
    photos: photos,
    descriptors: descriptors,
    updated_at: new Date().toISOString(),
    updated_by: req.user.username,
    count: photos.length
  };
  
  if (existingIndex >= 0) {
    // تحديث البصمات الموجودة
    faceDescriptors[existingIndex] = {
      ...faceDescriptors[existingIndex],
      ...faceData,
      id: faceDescriptors[existingIndex].id
    };
    
    saveJSON('face_descriptors.json', faceDescriptors);
    
    res.json({ 
      success: true, 
      message: `Updated ${photos.length} face photos for student`,
      descriptor: faceDescriptors[existingIndex]
    });
  } else {
    // إضافة جديدة
    const newDescriptor = {
      id: faceDescriptors.length ? Math.max(...faceDescriptors.map(f => f.id)) + 1 : 1,
      ...faceData,
      created_at: new Date().toISOString(),
      created_by: req.user.username
    };
    
    faceDescriptors.push(newDescriptor);
    saveJSON('face_descriptors.json', faceDescriptors);
    
    res.json({ 
      success: true, 
      message: `Saved ${photos.length} face photos for student`,
      descriptor: newDescriptor
    });
  }
});

// DELETE: حذف بصمات وجه طالب
app.delete('/api/face-descriptors/student/:studentId', authenticateToken, (req, res) => {
  const studentId = parseInt(req.params.studentId);
  
  faceDescriptors = faceDescriptors.filter(f => f.student_id !== studentId);
  saveJSON('face_descriptors.json', faceDescriptors);
  
  res.json({ success: true, message: 'Face descriptors deleted' });
});
//===================================================================================
//===================================================================================
// ============================================
// TEACHING ASSISTANTS APIs (مبسطة)
// ============================================

try {
  teachingAssistants = loadJSON('teaching_assistants.json');
  console.log(`✅ Loaded ${teachingAssistants.length} teaching assistants`);
} catch (error) {
  console.log('Creating new teaching_assistants.json');
  teachingAssistants = [];
  saveJSON('teaching_assistants.json', teachingAssistants);
}

// استبدل دوال Teaching Assistants بهذه النسخة
// GET: جلب جميع المعيدين
app.get('/api/teaching-assistants', authenticateToken, authorizeEntity('teaching-assistants', 'view'), (req, res) => {
  // إضافة أسماء الدكاترة المشرفين
  const enriched = teachingAssistants.map(ta => ({
    ...ta,
    supervisor_doctor_name: doctors.find(d => d.id === ta.supervisor_doctor_id)?.name || 'Not Assigned'
  }));
  res.json(enriched);
});

app.post('/api/teaching-assistants', authenticateToken, authorizeEntity('teaching-assistants', 'add'), async (req, res) => {
  const { name, username, password, email, supervisor_doctor_id } = req.body;
  
  if (!name || !username || !password || !supervisor_doctor_id) {
    return res.status(400).json({ error: 'Required fields: name, username, password, supervisor_doctor_id' });
  }
  
  // التحقق من عدم تكرار اليوزرنيم
  if (teachingAssistants.some(ta => ta.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // تشفير كلمة المرور
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const newTA = {
    id: teachingAssistants.length ? Math.max(...teachingAssistants.map(t => t.id)) + 1 : 101,
    name,
    username,
    password: hashedPassword,
    email: email || null,
    supervisor_doctor_id,
    supervisor_doctor_name: doctors.find(d => d.id === supervisor_doctor_id)?.name || 'Not Assigned'
  };
  
  teachingAssistants.push(newTA);
  saveJSON('teaching_assistants.json', teachingAssistants);
  
  res.json(newTA);
});

app.put('/api/teaching-assistants/:id', authenticateToken, authorizeEntity('teaching-assistants', 'edit'), requireConfirmation, async (req, res) => {
  const id = parseInt(req.params.id);
  const oldTA = teachingAssistants.find(t => t.id === id);
  
  if (!oldTA) {
    return res.status(404).json({ error: 'Teaching assistant not found' });
  }
  
  const newTA = { ...oldTA, ...req.body };
  
  // إذا تم إدخال كلمة مرور جديدة، قم بتشفيرها
  if (req.body.password && req.body.password !== oldTA.password) {
    newTA.password = await bcrypt.hash(req.body.password, saltRounds);
  } else {
    newTA.password = oldTA.password; // احتفظ بكلمة المرور القديمة المشفرة
  }
  
  // تحديث اسم المشرف إذا تغير الـ ID
  if (req.body.supervisor_doctor_id && req.body.supervisor_doctor_id !== oldTA.supervisor_doctor_id) {
    newTA.supervisor_doctor_name = doctors.find(d => d.id === req.body.supervisor_doctor_id)?.name || 'Not Assigned';
  }
  
  logToRecycleBin(
    'edit',
    'teaching-assistant',
    id,
    oldTA,
    newTA,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  teachingAssistants = teachingAssistants.map(t => t.id === id ? newTA : t);
  saveJSON('teaching_assistants.json', teachingAssistants);
  
  res.json({ 
    message: 'Teaching assistant updated and logged to recycle bin',
    requiresConfirmation: true
  });
});

// DELETE: حذف معيد
app.delete('/api/teaching-assistants/:id', authenticateToken, authorizeEntity('teaching-assistants', 'delete'), requireConfirmation, (req, res) => {
  const id = parseInt(req.params.id);
  const ta = teachingAssistants.find(t => t.id === id);
  
  if (!ta) {
    return res.status(404).json({ error: 'Teaching assistant not found' });
  }
  
  logToRecycleBin(
    'delete',
    'teaching-assistant',
    id,
    ta,
    null,
    req.confirmationComment,
    req.user.id,
    req.user.username
  );
  
  teachingAssistants = teachingAssistants.filter(t => t.id !== id);
  saveJSON('teaching_assistants.json', teachingAssistants);
  
  res.json({ 
    message: 'Teaching assistant deleted and logged to recycle bin',
    requiresConfirmation: true
  });
});

// ============================================
// STUDENT PASSWORD UPDATE - مع تحسين التصحيح
// ============================================


// ============================================
// REAL-TIME UPDATES TRACKING SYSTEM (معدل)
// ============================================

// تخزين آخر تحديث لكل طالب
let studentLoginLastUpdate = {};

// POST: إشعار بتحديث كلمة المرور
app.post('/api/student-login/notify-update', (req, res) => {
    const { student_id } = req.body;
    
    if (!student_id) {
        return res.status(400).json({ error: 'Student ID required' });
    }
    
    // تحديث timestamp
    const now = new Date().toISOString();
    studentLoginLastUpdate[student_id] = now;
    
    console.log(`📢 Student login update notification for: ${student_id}`);
    console.log(`   Current timestamp: ${now}`);
    
    res.json({ 
        success: true, 
        message: 'Update notification sent',
        timestamp: now
    });
});

// GET: التحقق من وجود تحديثات
app.get('/api/student-login/check-updates', authenticateToken, (req, res) => {
    const { lastCheck } = req.query;
    
    const lastCheckTime = lastCheck ? new Date(lastCheck) : new Date(0);
    
    // البحث عن أي تحديثات بعد lastCheckTime
    const updates = [];
    
    Object.entries(studentLoginLastUpdate).forEach(([studentId, timestamp]) => {
        if (new Date(timestamp) > lastCheckTime) {
            updates.push({
                student_id: studentId,
                updated_at: timestamp
            });
        }
    });
    
    // تنظيف التحديثات القديمة (أكثر من ساعة)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    Object.keys(studentLoginLastUpdate).forEach(key => {
        if (new Date(studentLoginLastUpdate[key]) < oneHourAgo) {
            delete studentLoginLastUpdate[key];
        }
    });
    
    console.log(`🔍 Update check: lastCheck=${lastCheck}, found ${updates.length} updates`);
    
    res.json({
        hasUpdates: updates.length > 0,
        updates: updates,
        currentTime: new Date().toISOString()
    });
});
// Middleware خاص بالطلاب (أبسط من authenticateToken)
function authenticateStudent(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, student) => {
        if (err) {
            console.log('Student token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        // نفترض إن payload التوكن فيه student_id
        req.student = student;
        next();
    });
}
// ==================== NEW ENDPOINT - استبدل القديم بهذا ====================
app.post('/api/student/change-password', (req, res) => {
    console.log('='.repeat(50));
    console.log('📥 POST /api/student/change-password');
    console.log('Received body:', req.body);
    console.log('Content-Type header:', req.headers['content-type']);

    // محاولة قراءة الحقول بأكثر من اسم محتمل (مرونة مع الـ frontend)
    let student_id   = req.body.student_id   || req.body.studentId   || req.body.id       || req.body.studentID;
    let new_password = req.body.new_password || req.body.newPassword || req.body.password || req.body.newPass;

    if (!student_id || !new_password) {
        console.log('Missing required fields. Received keys:', Object.keys(req.body));
        return res.status(400).json({
            success: false,
            error: 'student_id and new_password are required',
            received_keys: Object.keys(req.body),
            note: 'Supported field names: student_id / studentId / id / studentID  and  new_password / newPassword / password / newPass'
        });
    }

    if (typeof new_password !== 'string' || new_password.trim().length < 4) {
        console.log('Invalid password length or type');
        return res.status(400).json({
            success: false,
            error: 'Password must be a string with at least 4 characters'
        });
    }

    try {
        const loginIndex = studentLoginData.findIndex(l => l.student_id === student_id);

        if (loginIndex === -1) {
            console.log(`❌ Student login record not found for student_id: ${student_id}`);
            return res.status(404).json({
                success: false,
                error: 'Student login account not found'
            });
        }

        const now = new Date().toISOString();

        // تحديث البيانات في الـ memory
        studentLoginData[loginIndex] = {
            ...studentLoginData[loginIndex],
            password: new_password.trim(),
            updated_at: now,
            updated_by: 'student-self',
            is_default_password: false
        };

        // حفظ التغييرات على الـ disk
        saveJSON('student_login.json', studentLoginData);

        console.log(`✅ Password updated successfully`);
        console.log(`   student_id     : ${student_id}`);
        console.log(`   new password   : ${new_password}`);
        console.log(`   updated_at     : ${now}`);
        console.log(`   record index   : ${loginIndex}`);

        // تحديث متغير المراقبة إذا كان موجوداً
        if (typeof lastStudentLoginCheck !== 'undefined') {
            lastStudentLoginCheck = now;
        }

        return res.json({
            success: true,
            message: 'Password updated successfully',
            student_id: student_id,
            updated_at: now
        });

    } catch (err) {
        console.error('❌ Error while updating student password:');
        console.error(err);

        return res.status(500).json({
            success: false,
            error: 'Server error while updating password',
            details: err.message
        });
    }
});
// ============================================
// ATTENDANCE RECORDS APIs
// ============================================

let attendanceRecords = [];
try {
  attendanceRecords = loadJSON('attendance.json');
  console.log(`✅ Loaded ${attendanceRecords.length} attendance records`);
} catch (error) {
  console.log('Creating new attendance.json');
  attendanceRecords = [];
  saveJSON('attendance.json', attendanceRecords);
}

// GET: جلب جميع سجلات الحضور
app.get('/api/attendance', authenticateToken, (req, res) => {
  res.json(attendanceRecords);
});

// GET: جلب سجلات حضور لمادة معينة
app.get('/api/attendance/lecture/:lectureId', authenticateToken, (req, res) => {
  const lectureId = parseInt(req.params.lectureId);
  const records = attendanceRecords.filter(r => r.lecture_id === lectureId);
  res.json(records);
});

// GET: جلب سجلات حضور لجلسة معينة
app.get('/api/attendance/session/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const records = attendanceRecords.filter(r => r.session_id === sessionId);
  res.json(records);
});

// POST: إضافة سجل حضور جديد
app.post('/api/attendance', authenticateToken, (req, res) => {
  const newRecord = {
    id: attendanceRecords.length ? Math.max(...attendanceRecords.map(r => r.id)) + 1 : 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  
  attendanceRecords.push(newRecord);
  saveJSON('attendance.json', attendanceRecords);
  
  res.json(newRecord);
});

// GET: تقارير الحضور مع إحصائيات
app.get('/api/attendance/reports', authenticateToken, (req, res) => {
  const { lectureId, startDate, endDate } = req.query;
  
  let filtered = [...attendanceRecords];
  
  if (lectureId) {
    filtered = filtered.filter(r => r.lecture_id == lectureId);
  }
  
  if (startDate) {
    filtered = filtered.filter(r => new Date(r.date) >= new Date(startDate));
  }
  
  if (endDate) {
    filtered = filtered.filter(r => new Date(r.date) <= new Date(endDate));
  }
  
  // Group by lecture
  const grouped = {};
  filtered.forEach(r => {
    if (!grouped[r.lecture_id]) {
      grouped[r.lecture_id] = {
        lecture_id: r.lecture_id,
        subject_name: r.subject_name,
        records: [],
        confirmed: 0,
        total: 0
      };
    }
    grouped[r.lecture_id].records.push(r);
    if (r.status === 'confirmed') {
      grouped[r.lecture_id].confirmed++;
    }
    grouped[r.lecture_id].total++;
  });
  
  res.json({
    total: filtered.length,
    byLecture: Object.values(grouped)
  });
});

// ============================================
// ATTENDANCE SESSIONS APIs - FIX 404 ERRORS
// ============================================

let attendanceSessions = [];
try {
  attendanceSessions = loadJSON('attendance_sessions.json');
  console.log(`✅ Loaded ${attendanceSessions.length} attendance sessions`);
} catch (error) {
  console.log('Creating new attendance_sessions.json');
  attendanceSessions = [];
  saveJSON('attendance_sessions.json', attendanceSessions);
}

let attendanceReports = [];
try {
  attendanceReports = loadJSON('attendance_reports.json');
  console.log(`✅ Loaded ${attendanceReports.length} attendance reports`);
} catch (error) {
  console.log('Creating new attendance_reports.json');
  attendanceReports = [];
  saveJSON('attendance_reports.json', attendanceReports);
}

// POST: إنشاء جلسة حضور جديدة
app.post('/api/attendance-sessions', authenticateToken, (req, res) => {
  const sessionData = req.body;
  
  // التحقق من وجود البيانات المطلوبة
  if (!sessionData.sessionId || !sessionData.lectureId || !sessionData.doctorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // إضافة الجلسة
  const newSession = {
    id: attendanceSessions.length ? Math.max(...attendanceSessions.map(s => s.id)) + 1 : 1,
    ...sessionData,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  attendanceSessions.push(newSession);
  saveJSON('attendance_sessions.json', attendanceSessions);
  
  console.log(`✅ Attendance session created: ${sessionData.sessionId}`);
  res.json(newSession);
});

// GET: جلب جلسة حضور محددة
app.get('/api/attendance-sessions/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const session = attendanceSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

// PUT: تحديث جلسة حضور
app.put('/api/attendance-sessions/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionIndex = attendanceSessions.findIndex(s => s.sessionId === sessionId);
  
  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  attendanceSessions[sessionIndex] = {
    ...attendanceSessions[sessionIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  saveJSON('attendance_sessions.json', attendanceSessions);
  res.json(attendanceSessions[sessionIndex]);
});

// DELETE: إنهاء جلسة حضور وحفظ التقرير
app.delete('/api/attendance-sessions/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionIndex = attendanceSessions.findIndex(s => s.sessionId === sessionId);
  
  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = attendanceSessions[sessionIndex];
  
  // إنشاء تقرير الحضور
  const report = {
    id: attendanceReports.length ? Math.max(...attendanceReports.map(r => r.id)) + 1 : 1,
    sessionId: session.sessionId,
    lectureId: session.lectureId,
    subjectName: session.subjectName,
    doctorId: session.doctorId,
    doctorName: session.doctorName,
    date: new Date().toISOString().split('T')[0],
    startTime: session.startTime,
    endTime: new Date().toISOString(),
    totalStudents: session.totalStudents || 0,
    present: req.body.present || 0,
    pending: req.body.pending || 0,
    students: req.body.students || [],
    createdAt: new Date().toISOString()
  };
  
  attendanceReports.push(report);
  saveJSON('attendance_reports.json', attendanceReports);
  
  // إزالة الجلسة من الجلسات النشطة
  attendanceSessions.splice(sessionIndex, 1);
  saveJSON('attendance_sessions.json', attendanceSessions);
  
  console.log(`✅ Session ended and report saved: ${sessionId}`);
  res.json({ message: 'Session ended', report });
});

// GET: جلب جميع تقارير الحضور
app.get('/api/attendance-reports', authenticateToken, (req, res) => {
  const { doctorId, lectureId, startDate, endDate } = req.query;
  
  let filtered = [...attendanceReports];
  
  if (doctorId) {
    filtered = filtered.filter(r => r.doctorId == doctorId);
  }
  
  if (lectureId) {
    filtered = filtered.filter(r => r.lectureId == lectureId);
  }
  
  if (startDate) {
    filtered = filtered.filter(r => new Date(r.date) >= new Date(startDate));
  }
  
  if (endDate) {
    filtered = filtered.filter(r => new Date(r.date) <= new Date(endDate));
  }
  
  res.json(filtered);
});


// GET: جلب تقارير لمادة معينة
app.get('/api/attendance-reports/lecture/:lectureId', authenticateToken, (req, res) => {
  const lectureId = parseInt(req.params.lectureId);
  const reports = attendanceReports.filter(r => r.lectureId === lectureId);
  res.json(reports);
});

// GET: جلب إحصائيات الحضور
app.get('/api/attendance-stats', authenticateToken, (req, res) => {
  const stats = {
    totalSessions: attendanceSessions.length,
    totalReports: attendanceReports.length,
    bySubject: {},
    byDate: {}
  };
  
  // إحصائيات حسب المادة
  attendanceReports.forEach(report => {
    if (!stats.bySubject[report.subjectName]) {
      stats.bySubject[report.subjectName] = {
        subjectName: report.subjectName,
        sessions: 0,
        totalStudents: 0,
        present: 0
      };
    }
    stats.bySubject[report.subjectName].sessions++;
    stats.bySubject[report.subjectName].totalStudents += report.totalStudents || 0;
    stats.bySubject[report.subjectName].present += report.present || 0;
  });
  
  // إحصائيات حسب التاريخ
  attendanceReports.forEach(report => {
    if (!stats.byDate[report.date]) {
      stats.byDate[report.date] = {
        date: report.date,
        sessions: 0,
        present: 0
      };
    }
    stats.byDate[report.date].sessions++;
    stats.byDate[report.date].present += report.present || 0;
  });
  
  res.json(stats);
});

// ============================================
// TEACHING ASSISTANT SETTINGS & PERMISSIONS APIs - FIXED
// ============================================

// GET: جلب جميع المعيدين التابعين لدكتور معين
app.get('/api/doctor/:doctorId/teaching-assistants', authenticateToken, (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);
    
    // التحقق من الصلاحية
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
      if (req.user.userType === 'teaching-assistant') {
        return res.status(403).json({ error: 'Access denied' });
      } else if (req.user.id !== doctorId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const doctorTAs = teachingAssistants.filter(ta => ta.supervisor_doctor_id === doctorId);
    
    // إضافة معلومات الصلاحيات لكل معيد
    const enrichedTAs = doctorTAs.map(ta => {
      try {
        const permissions = getTAPermissions(ta.id);
        // إخفاء كلمة المرور
        const { password, ...taWithoutPassword } = ta;
        return {
          ...taWithoutPassword,
          permissions: permissions
        };
      } catch (error) {
        console.error(`Error getting permissions for TA ${ta.id}:`, error);
        const { password, ...taWithoutPassword } = ta;
        return {
          ...taWithoutPassword,
          permissions: { ...DEFAULT_TA_PERMISSIONS }
        };
      }
    });
    
    res.json(enrichedTAs);
  } catch (error) {
    console.error('Error in GET /api/doctor/:doctorId/teaching-assistants:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET: جلب صلاحيات معيد معين
app.get('/api/teaching-assistant/:taId/permissions', authenticateToken, (req, res) => {
  try {
    const taId = parseInt(req.params.taId);
    const ta = teachingAssistants.find(t => t.id === taId);
    
    if (!ta) {
      return res.status(404).json({ error: 'Teaching assistant not found' });
    }
    
    // التحقق من الصلاحية
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
      if (req.user.userType === 'teaching-assistant') {
        return res.status(403).json({ error: 'Access denied' });
      } else if (req.user.id !== ta.supervisor_doctor_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const permissions = getTAPermissions(taId);
    
    res.json({
      taId: taId,
      taName: ta.name,
      doctorId: ta.supervisor_doctor_id,
      permissions: permissions,
      allPermissions: TA_PERMISSION_KEYS
    });
  } catch (error) {
    console.error('Error in GET /api/teaching-assistant/:taId/permissions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// PUT: تحديث صلاحيات معيد
app.put('/api/teaching-assistant/:taId/permissions', authenticateToken, (req, res) => {
  try {
    const taId = parseInt(req.params.taId);
    const { permissions } = req.body;
    
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Invalid permissions object' });
    }
    
    const ta = teachingAssistants.find(t => t.id === taId);
    
    if (!ta) {
      return res.status(404).json({ error: 'Teaching assistant not found' });
    }
    
    // التحقق من الصلاحية (فقط الدكتور المشرف)
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
      if (req.user.id !== ta.supervisor_doctor_id) {
        return res.status(403).json({ error: 'Access denied. Only supervising doctor can modify permissions.' });
      }
    }
    
    // التأكد من أن كل الصلاحيات موجودة
    const completePermissions = {};
    TA_PERMISSION_KEYS.forEach(key => {
      completePermissions[key] = permissions[key] !== undefined ? permissions[key] : DEFAULT_TA_PERMISSIONS[key];
    });
    
    const savedPermissions = saveTAPermissions(taId, completePermissions);
    
    res.json({
      success: true,
      message: 'Permissions updated successfully',
      permissions: savedPermissions
    });
  } catch (error) {
    console.error('Error in PUT /api/teaching-assistant/:taId/permissions:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


// GET: جلب معلومات الدكتور الحالي
app.get('/api/doctor/profile', authenticateToken, (req, res) => {
  try {
    let doctorData = null;
    
    if (req.user.userType === 'teaching-assistant') {
      // معيد - نجيب معلومات الدكتور المشرف
      const ta = teachingAssistants.find(t => t.id === (req.user.taId || req.user.id));
      if (ta) {
        const doctor = doctors.find(d => d.id === ta.supervisor_doctor_id);
        if (doctor) {
          doctorData = {
            id: doctor.id,
            name: doctor.name,
            username: doctor.username,
            email: doctor.email,
            userType: 'doctor'
          };
        }
      }
    } else {
      // دكتور
      const doctor = doctors.find(d => d.id === req.user.id);
      if (doctor) {
        doctorData = {
          id: doctor.id,
          name: doctor.name,
          username: doctor.username,
          email: doctor.email,
          userType: 'doctor'
        };
      }
    }
    
    if (!doctorData) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    res.json(doctorData);
  } catch (error) {
    console.error('Error in GET /api/doctor/profile:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// أضف هذا في ملف server.js بعد قسم ATTENDANCE SESSIONS APIs



// ============================================
// ACTIVE SESSIONS SYNC APIs - للمزامنة بين الأجهزة
// ============================================

// استخدام activeSessionsStore الموحد
// let activeSessionsList = []; // تم إزالته - نستخدم activeSessionsStore بدلاً منه

// POST: إنشاء جلسة جديدة (مع timestamp)
app.post('/api/active-sessions', authenticateToken, (req, res) => {
  const { sessionId, lectureId, doctorId, doctorName, subjectName, level, department, startTime, deviceInfo } = req.body;
  
  if (!sessionId || !lectureId || !doctorId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const now = new Date().toISOString();
  
  // البحث عن جلسة موجودة في activeSessionsStore
  const existingIndex = activeSessionsStore.findIndex(s => s.sessionId === sessionId);
  
  if (existingIndex >= 0) {
    // تحديث الجلسة الموجودة
    activeSessionsStore[existingIndex].lastHeartbeat = now;
    activeSessionsStore[existingIndex].lastModified = now;
    if (deviceInfo) activeSessionsStore[existingIndex].deviceInfo = deviceInfo;
    res.json({ success: true, session: activeSessionsStore[existingIndex], timestamp: now });
  } else {
    // إضافة جلسة جديدة
    const sessionData = {
      sessionId,
      lectureId,
      doctorId,
      doctorName: doctorName || 'Unknown',
      subjectName: subjectName || 'Unknown',
      level: level || null,
      department: department || null,
      startTime: startTime || now,
      lastHeartbeat: now,
      lastModified: now,
      deviceInfo: deviceInfo || { hostname: req.hostname, ip: req.ip },
      isActive: true,
      type: 'Lecture Session'
    };
    
    activeSessionsStore.push(sessionData);
    console.log(`✅ Active session registered: ${sessionId} for ${subjectName}`);
    res.json({ success: true, session: sessionData, timestamp: now });
  }
});

// GET: جلب الجلسات المحدثة فقط (Polling ذكي)
app.get('/api/active-sessions/doctor/:doctorId/updates', authenticateToken, (req, res) => {
  const doctorId = parseInt(req.params.doctorId);
  const lastSync = req.query.lastSync ? new Date(req.query.lastSync) : new Date(0);
  
  // جلب الجلسات الخاصة بالدكتور
  const doctorSessions = activeSessionsStore.filter(s => s.doctorId === doctorId && s.isActive !== false);
  
  // التحقق من وجود تحديثات
  const hasUpdates = doctorSessions.some(s => new Date(s.lastModified || s.lastHeartbeat) > lastSync);
  
  res.json({
    updated: hasUpdates,
    sessions: doctorSessions,
    timestamp: new Date().toISOString()
  });
});

// GET: جلب جميع الجلسات النشطة (للمشرفين)
app.get('/api/active-sessions', (req, res) => {
  const activeSessions = activeSessionsStore.filter(s => s.isActive !== false);
  res.json(activeSessions);
});

// GET: جلب الجلسات النشطة لدكتور معين
app.get('/api/active-sessions/doctor/:doctorId', authenticateToken, (req, res) => {
  const doctorId = parseInt(req.params.doctorId);
  const doctorSessions = activeSessionsStore.filter(s => s.doctorId === doctorId && s.isActive !== false);
  res.json(doctorSessions);
});

// POST: تحديث نبض الجلسة (heartbeat)
app.post('/api/active-sessions/:sessionId/heartbeat', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionIndex = activeSessionsStore.findIndex(s => s.sessionId === sessionId);
  
  if (sessionIndex >= 0) {
    activeSessionsStore[sessionIndex].lastHeartbeat = new Date().toISOString();
    res.json({ success: true, lastHeartbeat: activeSessionsStore[sessionIndex].lastHeartbeat });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// DELETE: إنهاء جلسة نشطة
app.delete('/api/active-sessions/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionIndex = activeSessionsStore.findIndex(s => s.sessionId === sessionId);
  
  if (sessionIndex >= 0) {
    const endedSession = activeSessionsStore[sessionIndex];
    // وضع علامة منتهية بدلاً من الحذف الفوري
    activeSessionsStore[sessionIndex].isActive = false;
    activeSessionsStore[sessionIndex].endedAt = new Date().toISOString();
    console.log(`✅ Active session ended: ${sessionId}`);
    res.json({ success: true, session: endedSession });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});


// ============================================
// REAL-TIME SESSION NOTIFICATIONS
// ============================================

// تخزين الجلسات مع المستمعين
const sessionListeners = {};

// إضافة مستمع لجلسة معينة
app.post('/api/active-sessions/:sessionId/listen', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const { deviceId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  
  if (!sessionListeners[sessionId]) {
    sessionListeners[sessionId] = [];
  }
  
  // إضافة المستمع إذا لم يكن موجوداً
  if (!sessionListeners[sessionId].includes(deviceId)) {
    sessionListeners[sessionId].push(deviceId);
  }
  
  console.log(`👂 Device ${deviceId} listening to session ${sessionId}`);
  res.json({ success: true, listeners: sessionListeners[sessionId].length });
});

// إزالة مستمع
app.post('/api/active-sessions/:sessionId/unlisten', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const { deviceId } = req.body;
  
  if (sessionListeners[sessionId]) {
    sessionListeners[sessionId] = sessionListeners[sessionId].filter(d => d !== deviceId);
    
    // تنظيف إذا لم يعد هناك مستمعين
    if (sessionListeners[sessionId].length === 0) {
      delete sessionListeners[sessionId];
    }
  }
  
  res.json({ success: true });
});

// إرسال إشعار لجميع المستمعين عند إنهاء الجلسة
function notifySessionEnded(sessionId, endedBy) {
  if (sessionListeners[sessionId] && sessionListeners[sessionId].length > 0) {
    console.log(`🔔 Notifying ${sessionListeners[sessionId].length} devices that session ${sessionId} ended by ${endedBy}`);
    
    // هنا يمكنك إضافة WebSocket أو Server-Sent Events
    // للتبسيط، سنستخدم endpoint للتحقق
    return sessionListeners[sessionId].length;
  }
  return 0;
}

// تحديث DELETE endpoint لإرسال الإشعارات
const originalDeleteActiveSession = app.delete; // نحتفظ بالمرجع الأصلي مؤقتاً

app.delete('/api/active-sessions/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionIndex = activeSessionsStore.findIndex(s => s.sessionId === sessionId);
  const endedBy = req.user?.username || 'Unknown';
  
  if (sessionIndex >= 0) {
    const endedSession = activeSessionsStore[sessionIndex];
    
    // إرسال إشعار للمستمعين
    const notifiedCount = notifySessionEnded(sessionId, endedBy);
    
    // وضع علامة منتهية
    activeSessionsStore[sessionIndex].isActive = false;
    activeSessionsStore[sessionIndex].endedAt = new Date().toISOString();
    
    // تنظيف المستمعين
    delete sessionListeners[sessionId];
    
    console.log(`✅ Active session ended: ${sessionId} by ${endedBy}, notified ${notifiedCount} devices`);
    res.json({ 
      success: true, 
      session: endedSession,
      notified: notifiedCount,
      endedBy: endedBy
    });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});
// GET: التحقق من حالة الجلسة (Polling سريع)
app.get('/api/active-sessions/:sessionId/status', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const session = activeSessionsStore.find(s => s.sessionId === sessionId);
  
  if (session && session.isActive !== false) {
    res.json({ 
      active: true, 
      session: {
        sessionId: session.sessionId,
        lastHeartbeat: session.lastHeartbeat,
        activeDevices: session.activeDevices?.length || 1
      }
    });
  } else {
    res.json({ 
      active: false, 
      message: 'Session has ended' 
    });
  }
});

// ============================================
// ATTENDANCE SESSION DATA APIs - للمزامنة بين الأجهزة
// ============================================

let sessionAttendanceData = {}; // تخزين بيانات الحضور لكل جلسة

// POST: حفظ بيانات حضور جلسة معينة
app.post('/api/attendance-session-data/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const { records, pending, lastUpdate } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }
  
  // تخزين البيانات مع timestamp
  sessionAttendanceData[sessionId] = {
    records: records || [],
    pending: pending || [],
    lastUpdate: lastUpdate || new Date().toISOString(),
    updatedBy: req.user.username,
    updatedAt: new Date().toISOString()
  };
  
  console.log(`📊 Attendance data saved for session ${sessionId}: ${pending?.length || 0} pending, ${records?.filter(r => r.confirmed).length || 0} confirmed`);
  
  res.json({ 
    success: true, 
    message: 'Attendance data saved',
    timestamp: sessionAttendanceData[sessionId].lastUpdate
  });
});

// GET: جلب بيانات حضور جلسة معينة
app.get('/api/attendance-session-data/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  
  const data = sessionAttendanceData[sessionId];
  
  if (data) {
    res.json({
      success: true,
      sessionId: sessionId,
      records: data.records || [],
      pending: data.pending || [],
      lastUpdate: data.lastUpdate,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy
    });
  } else {
    // إرجاع بيانات فارغة إذا لم توجد
    res.json({
      success: true,
      sessionId: sessionId,
      records: [],
      pending: [],
      lastUpdate: null,
      message: 'No attendance data found for this session'
    });
  }
});

// DELETE: حذف بيانات جلسة (عند انتهائها)
app.delete('/api/attendance-session-data/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  
  if (sessionAttendanceData[sessionId]) {
    delete sessionAttendanceData[sessionId];
    console.log(`🗑️ Attendance data deleted for session ${sessionId}`);
  }
  
  res.json({ success: true, message: 'Session data cleared' });
});

// GET: جلب إحصائيات عامة للجلسات النشطة
app.get('/api/attendance-session-stats', authenticateToken, (req, res) => {
  const stats = {};
  
  Object.keys(sessionAttendanceData).forEach(sessionId => {
    const data = sessionAttendanceData[sessionId];
    stats[sessionId] = {
      pendingCount: data.pending?.length || 0,
      confirmedCount: data.records?.filter(r => r.confirmed).length || 0,
      totalRecords: data.records?.length || 0,
      lastUpdate: data.lastUpdate
    };
  });
  
  res.json(stats);
});

// ============================================
// ATTENDANCE REPORTS SYNC APIs - للمزامنة بين الأجهزة
// ============================================

// POST: إضافة تقرير جديد (من أي جهاز)
app.post('/api/attendance-reports', authenticateToken, (req, res) => {
  const reportData = req.body;
  
  // التحقق من البيانات المطلوبة
  if (!reportData.sessionId || !reportData.lectureId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // التأكد من وجود sessionId
  if (!reportData.sessionId) {
    reportData.sessionId = `REP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
  
  // إضافة معرف فريد و timestamp
  const newReport = {
    id: attendanceReports.length ? Math.max(...attendanceReports.map(r => r.id)) + 1 : 1,
    ...reportData,
    createdAt: new Date().toISOString(),
    createdBy: req.user.username,
    createdById: req.user.id,
    syncedAt: new Date().toISOString()
  };
  
  // التحقق من عدم وجود تقرير مكرر لنفس الجلسة
  const existingIndex = attendanceReports.findIndex(r => r.sessionId === newReport.sessionId);
  
  if (existingIndex >= 0) {
    // تحديث التقرير الموجود
    attendanceReports[existingIndex] = {
      ...attendanceReports[existingIndex],
      ...newReport,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.username
    };
    console.log(`📝 Updated existing report for session ${newReport.sessionId}`);
  } else {
    // إضافة تقرير جديد
    attendanceReports.push(newReport);
    console.log(`✅ New report saved for session ${newReport.sessionId}`);
  }
  
  // حفظ في الملف
  saveJSON('attendance_reports.json', attendanceReports);
  
  res.json({ 
    success: true, 
    message: 'Report saved successfully',
    report: newReport,
    isNew: existingIndex === -1
  });
});

// GET: جلب جميع التقارير لدكتور معين (مع فلترة)
app.get('/api/attendance-reports/doctor/:doctorId', authenticateToken, (req, res) => {
  const doctorId = parseInt(req.params.doctorId);
  
  // فلترة التقارير الخاصة بالدكتور
  let doctorReports = attendanceReports.filter(r => r.doctorId === doctorId);
  
  // إضافة معلومات إضافية للتصحيح
  console.log(`📊 Found ${doctorReports.length} reports for doctor ${doctorId}`);
  
  res.json(doctorReports);
});

// GET: جلب تقرير محدد
app.get('/api/attendance-reports/session/:sessionId', authenticateToken, (req, res) => {
  const sessionId = req.params.sessionId;
  const report = attendanceReports.find(r => r.sessionId === sessionId);
  
  if (report) {
    res.json(report);
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

// DELETE: حذف تقرير (اختياري)
app.delete('/api/attendance-reports/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = attendanceReports.findIndex(r => r.id === id);
  
  if (index >= 0) {
    const deleted = attendanceReports[index];
    attendanceReports.splice(index, 1);
    saveJSON('attendance_reports.json', attendanceReports);
    res.json({ success: true, message: 'Report deleted', report: deleted });
  } else {
    res.status(404).json({ error: 'Report not found' });
  }
});

//=============================================================sd=sds=d=s=ds=d=s=\
// ============================================
// CAMERA REQUEST API - للتحكم في فتح الكاميرا على جهاز الهوست
// ============================================

// تخزين اتصالات WebSocket من جهاز الهوست
const hostConnections = new Set();

// API لطلب فتح الكاميرا على جهاز الهوست
app.post('/api/camera/request', authenticateToken, (req, res) => {
    const { sessionId, lectureId, doctorName } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');

    console.log('='.repeat(50));
    console.log(`📷 Camera request received:`);
    console.log(`   - From: ${clientIp}`);
    console.log(`   - Session: ${sessionId}`);
    console.log(`   - Lecture: ${lectureId}`);
    console.log(`   - Doctor: ${doctorName}`);
    console.log(`   - Host Connections: ${hostConnections.size}`);

    // إرسال الأمر إلى جهاز الهوست فقط عبر WebSocket
    if (hostConnections.size > 0) {
        const message = JSON.stringify({
            type: 'OPEN_CAMERA',
            payload: {
                sessionId,
                lectureId,
                doctorName,
                requestedBy: clientIp,
                doctorId: req.user.id,
                token: req.headers['authorization'].split(' ')[1],
                timestamp: Date.now()
            }
        });

        let sentCount = 0;
        // أرسل إلى جميع اتصالات الهوست
        hostConnections.forEach(ws => {
            if (ws.readyState === 1) { // WebSocket.OPEN = 1
                ws.send(message);
                sentCount++;
                console.log(`📨 Command sent to host device.`);
            } else {
                console.log(`⚠️ WebSocket not open, state: ${ws.readyState}`);
            }
        });

        if (sentCount > 0) {
            console.log(`✅ Camera request sent to ${sentCount} host device(s)`);
            res.json({ 
                success: true, 
                message: 'Camera activation request sent to host device.',
                cameraOnHost: true 
            });
        } else {
            console.log('❌ No open WebSocket connections to host');
            res.status(503).json({ 
                success: false, 
                error: 'Host device is connected but WebSocket is not open.' 
            });
        }

    } else {
        console.log('❌ No host device connected via WebSocket.');
        console.log('   Please ensure host_listener.html is open on the host machine.');
        res.status(503).json({ 
            success: false, 
            error: 'Host device is not connected. Please ensure the host listener page is open on the server machine.' 
        });
    }
});

// ============================================
// DEVELOPER LOGIN - FOR SYSTEM DASHBOARD
// ============================================

// DEVELOPER LOGIN - FOR SYSTEM DASHBOARD
app.post('/api/dev/login', (req, res) => {
    const { username, password } = req.body || {};
    
    console.log(`🔐 Developer login attempt: ${username}`);
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // التحقق من بيانات الدخول الخاصة بالـ Dashboard
    if (username === 'dev' && password === 'dev') {
        // إنشاء توكن JWT للمطور مع صلاحيات admin
        const token = jwt.sign(
            { 
                id: 999, 
                username: 'dev', 
                role: 'admin',  // ✅ إعطاء المطور صلاحيات admin
                name: 'Developer',
                isDev: true
            }, 
            JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        console.log(`✅ Developer logged in as admin`);
        
        return res.json({ 
            success: true,
            token, 
            user: { 
                id: 999,
                username: 'dev', 
                role: 'admin',
                name: 'Developer'
            } 
        });
    }
    
    return res.status(401).json({ error: 'Invalid developer credentials' });
});

// ============================================
// SYSTEM MONITORING APIs - FOR DEV DASHBOARD
// ============================================


// Get all students (بدون توكن - للقراءة فقط)
app.get('/api/students-public', (req, res) => {
  res.json(students);
});

// Get all doctors (بدون توكن - للقراءة فقط)
app.get('/api/doctors-public', (req, res) => {
  res.json(doctors);
});

// Get all subjects (بدون توكن - للقراءة فقط)
app.get('/api/subjects-public', (req, res) => {
  const enriched = subjects.map(s => ({
    ...s,
    doctor_name: doctors.find(d => d.id === s.doctor_id)?.name || 'Not Assigned'
  }));
  res.json(enriched);
});

// Get all lectures (بدون توكن - للقراءة فقط)
app.get('/api/lectures-public', (req, res) => {
  res.json(lectures);
});

// Get all users (بدون توكن - للقراءة فقط)
app.get('/api/users-public', (req, res) => {
  const safeUsers = users.map(u => ({ 
    id: u.id, 
    username: u.username, 
    role: u.role
  }));
  res.json(safeUsers);
});

// Get system stats (بدون توكن)
app.get('/api/system-stats', (req, res) => {
  const stats = {
    version: '2.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      students: students.length,
      doctors: doctors.length,
      subjects: subjects.length,
      lectures: lectures.length,
      users: users.length
    }
  };
  
  // Get last backup if exists
  if (fs.existsSync(BACKUPS_DIR)) {
    const backups = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.zip'));
    if (backups.length > 0) {
      const lastBackup = backups.sort().reverse()[0];
      const backupStats = fs.statSync(path.join(BACKUPS_DIR, lastBackup));
      stats.lastBackup = {
        name: lastBackup,
        time: backupStats.birthtime
      };
    }
  }
  
  res.json(stats);
});



// GET: جلب الـ blacklist
app.get('/api/blacklist', (req, res) => {
    const blacklistPath = path.join(DB_DIR, 'ip_blacklist.json');
    let blacklist = [];
    
    if (fs.existsSync(blacklistPath)) {
        try {
            blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
        } catch(e) {}
    }
    
    res.json({ blacklist });
});

// POST: إضافة IP إلى الـ blacklist
app.post('/api/blacklist', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP required' });
    
    const blacklistPath = path.join(DB_DIR, 'ip_blacklist.json');
    let blacklist = [];
    
    if (fs.existsSync(blacklistPath)) {
        try {
            blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
        } catch(e) {}
    }
    
    if (!blacklist.includes(ip)) {
        blacklist.push(ip);
        fs.writeFileSync(blacklistPath, JSON.stringify(blacklist, null, 2));
        console.log(`🔒 IP ${ip} added to blacklist`);
        // تحديث الذاكرة
        ipBlacklist = blacklist;
        res.json({ success: true, message: `IP ${ip} blacklisted`, blacklist });
    } else {
        res.json({ success: false, message: 'IP already blacklisted' });
    }
});

// DELETE: إزالة IP من الـ blacklist
app.delete('/api/blacklist/:ip', (req, res) => {
    const ip = req.params.ip;
    const blacklistPath = path.join(DB_DIR, 'ip_blacklist.json');
    let blacklist = [];
    
    if (fs.existsSync(blacklistPath)) {
        try {
            blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
        } catch(e) {}
    }
    
    const newBlacklist = blacklist.filter(i => i !== ip);
    fs.writeFileSync(blacklistPath, JSON.stringify(newBlacklist, null, 2));
    ipBlacklist = newBlacklist;
    console.log(`🔓 IP ${ip} removed from blacklist`);
    
    res.json({ success: true, message: `IP ${ip} removed from blacklist`, blacklist: newBlacklist });
});


// ============================================
// ACTIVE SESSIONS TRACKING - UNIFIED VERSION
// ============================================

// تخزين الجلسات النشطة - مصدر واحد للحقيقة
let activeSessionsStore = [];

// دالة لفك التوكن من أي نوع (JWT أو Base64)
function decodeAnyToken(token) {
    if (!token) return null;
    
    try {
        // محاولة فك JWT أولاً
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded && decoded.id) return decoded;
        } catch (jwtError) {
            // ليس JWT
        }
        
        // محاولة فك Base64 (للدكاترة والطلاب)
        try {
            const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
            if (decoded && (decoded.id || decoded.student_id)) {
                // التحقق من صلاحية التوكن (exp)
                if (decoded.exp && decoded.exp < Date.now()) {
                    console.log('Token expired');
                    return null;
                }
                return decoded;
            }
        } catch (base64Error) {
            // ليس Base64
        }
        
        return null;
    } catch (e) {
        console.error('Error decoding token:', e);
        return null;
    }
}

// دالة لإضافة أو تحديث جلسة
const addOrUpdateSession = (userData, clientIp, userAgent, path) => {
    console.log('📝 addOrUpdateSession called with:', {
        userData: JSON.stringify(userData),
        clientIp,
        path
    });
    
    if (!userData) {
        console.log('❌ No userData provided');
        return;
    }
    
    // استخراج ID من عدة احتمالات
    let userId = userData.id || userData.userId || userData.student_id;
    if (!userId) {
        // محاولة استخراج ID من username إذا كان رقماً
        if (userData.username && !isNaN(userData.username)) {
            userId = parseInt(userData.username);
        } else {
            console.log('No user ID found in:', userData);
            return;
        }
    }
    
    // تحديد نوع المستخدم واسم العرض
    let userType = 'User';
    let displayName = userData.username || userData.name || `User_${userId}`;
    let role = userData.role || userData.userType || 'user';
    
    if (role === 'doctor' || userData.userType === 'doctor') {
        userType = 'Doctor';
        displayName = userData.name || userData.username;
    } else if (role === 'student' || userData.userType === 'student') {
        userType = 'Student';
        displayName = userData.name || userData.username;
    } else if (role === 'admin') {
        userType = 'Admin';
    } else if (role === 'it') {
        userType = 'IT';
    } else if (role === 'teaching-assistant' || userData.userType === 'teaching-assistant') {
        userType = 'Teaching Assistant';
        displayName = userData.name || userData.username;
    }
    
    const now = new Date().toISOString();
    const existingIndex = activeSessionsStore.findIndex(s => s.userId == userId && s.isActive !== false);
    
    if (existingIndex === -1) {
        // إضافة جلسة جديدة
        activeSessionsStore.push({
            sessionId: `${userId}_${Date.now()}`,
            userId: userId,
            username: displayName,
            role: role,
            type: userType,
            ip: clientIp,
            userAgent: userAgent,
            loginTime: now,
            lastActive: now,
            lastPath: path,
            isActive: true
        });
        console.log(`✅ [NEW SESSION] ${userType}: ${displayName} (ID:${userId}) from ${clientIp} (${path})`);
    } else {
        // تحديث الجلسة الموجودة
        activeSessionsStore[existingIndex].lastActive = now;
        activeSessionsStore[existingIndex].ip = clientIp;
        activeSessionsStore[existingIndex].lastPath = path;
        if (userAgent) activeSessionsStore[existingIndex].userAgent = userAgent;
        if (activeSessionsStore[existingIndex].username !== displayName) {
            activeSessionsStore[existingIndex].username = displayName;
        }
        console.log(`🔄 [UPDATE] ${userType}: ${displayName} active at ${new Date().toLocaleTimeString()}`);
    }
};

// Middleware لتسجيل جميع الطلبات
app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    
    // التحقق من وجود توكن في الطلب
    let token = null;
    
    if (req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
        try {
            const userData = decodeAnyToken(token);
            if (userData) {
                addOrUpdateSession(userData, clientIp, req.headers['user-agent'], req.path);
            }
        } catch (e) {
            console.error('Error processing token:', e);
        }
    }
    
    next();
});

// GET: جلب جميع الجلسات النشطة (مع تنظيف الجلسات المنتهية)
app.get('/api/active-sessions-all', (req, res) => {
    // تنظيف الجلسات القديمة (أكثر من 30 دقيقة بدون نشاط)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // تحديث حالة الجلسات المنتهية
    activeSessionsStore = activeSessionsStore.map(session => {
        if (session.isActive !== false && new Date(session.lastActive) < thirtyMinutesAgo) {
            session.isActive = false;
            session.endedAt = new Date().toISOString();
            console.log(`⏰ Session expired: ${session.username} (${session.type})`);
        }
        return session;
    });
    
    // إرجاع الجلسات النشطة فقط
    const activeSessions = activeSessionsStore.filter(session => session.isActive === true);
    
    console.log(`📊 Active sessions: ${activeSessions.length}`);
    activeSessions.forEach(s => {
        console.log(`   - ${s.type}: ${s.username} (${s.ip}) - Last active: ${new Date(s.lastActive).toLocaleTimeString()}`);
    });
    
    res.json({ 
        sessions: activeSessions,
        count: activeSessions.length,
        timestamp: new Date().toISOString()
    });
});

// POST: إنهاء جلسة حسب username
app.post('/api/terminate-session-by-name/:username', (req, res) => {
    const username = decodeURIComponent(req.params.username);
    let terminatedCount = 0;
    
    activeSessionsStore = activeSessionsStore.map(session => {
        if (session.username === username && session.isActive === true) {
            terminatedCount++;
            return { ...session, isActive: false, endedAt: new Date().toISOString() };
        }
        return session;
    });
    
    console.log(`🔴 Terminated ${terminatedCount} session(s) for ${username}`);
    res.json({ success: true, message: `${terminatedCount} session(s) terminated` });
});

// POST: إنهاء جميع الجلسات
app.post('/api/terminate-all-sessions', (req, res) => {
    const count = activeSessionsStore.filter(s => s.isActive === true).length;
    
    activeSessionsStore = activeSessionsStore.map(session => ({
        ...session,
        isActive: false,
        endedAt: new Date().toISOString()
    }));
    
    console.log(`🔴 All ${count} sessions terminated`);
    res.json({ success: true, message: `All ${count} sessions terminated` });
});
// ============================================
// IP BLACKLIST MIDDLEWARE
// ============================================

// تعريف المتغيرات أولاً
let ipBlacklist = [];      // للـ IPs المحظورة تلقائياً

// تحميل الـ blacklist من الملف
function loadIpBlacklist() {
    const blacklistPath = path.join(DB_DIR, 'ip_blacklist.json');
    if (fs.existsSync(blacklistPath)) {
        try {
            const content = fs.readFileSync(blacklistPath, 'utf8');
            ipBlacklist = JSON.parse(content);
            console.log(`📋 Loaded ${ipBlacklist.length} IPs to blacklist`);
        } catch(e) {
            ipBlacklist = [];
        }
    } else {
        fs.writeFileSync(blacklistPath, JSON.stringify([], null, 2));
        ipBlacklist = [];
    }
}


// ============================================
// LOGOUT ENDPOINT - TERMINATE SESSION
// ============================================

app.post('/api/logout', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const username = req.user.username || req.user.name;
    
    console.log(`🚪 Logout request for user: ${username} (ID: ${userId})`);
    
    // البحث عن الجلسة النشطة للمستخدم
    const sessionIndex = activeSessionsStore.findIndex(s => s.userId == userId && s.isActive === true);
    
    if (sessionIndex !== -1) {
        // إنهاء الجلسة
        activeSessionsStore[sessionIndex].isActive = false;
        activeSessionsStore[sessionIndex].endedAt = new Date().toISOString();
        console.log(`✅ Session terminated for ${username}`);
        res.json({ success: true, message: 'Logged out successfully' });
    } else {
        console.log(`⚠️ No active session found for ${username}`);
        res.json({ success: true, message: 'Logged out (no session found)' });
    }
});

// GET: التحقق من حالة جلسة مستخدم معين
app.get('/api/session-status/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const session = activeSessionsStore.find(s => s.userId == userId && s.isActive === true);
    
    res.json({
        isActive: session ? true : false,
        session: session || null
    });
});

// ============================================
// SECURITY FEATURES DATA =============================================================================
// ============================================

// سجل محاولات تسجيل الدخول الفاشلة
let failedLoginAttempts = [];

// قائمة الـ IPs المحظورة تلقائياً مع سبب الحظر
let autoBannedIPs = [];

// سجل نشاط المستخدمين
let auditLogs = [];

// مراقبة الطلبات لكل endpoint
let endpointStats = {};

// دالة لتسجيل محاولات الدخول الفاشلة مع حظر المستخدم
function logFailedLoginAttempt(username, ip, userAgent) {
    const attempt = {
        id: failedLoginAttempts.length + 1,
        username: username,
        ip: ip,
        userAgent: userAgent || 'Unknown',
        timestamp: new Date().toISOString()
    };
    failedLoginAttempts.unshift(attempt);
    
    // الاحتفاظ بآخر 100 محاولة فقط
    if (failedLoginAttempts.length > 100) failedLoginAttempts.pop();
    
    console.log(`🔴 Failed login attempt: ${username} from ${ip}`);
    
    // حساب عدد المحاولات الفاشلة لهذا المستخدم في آخر 10 دقائق
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentAttempts = failedLoginAttempts.filter(a => 
        a.username === username && 
        new Date(a.timestamp) > tenMinutesAgo
    );
    
    // إذا وصل لـ 5 محاولات فاشلة، احظر المستخدم
    if (recentAttempts.length >= 5) {
        // البحث عن المستخدم للحصول على الـ ID
        let userId = null;
        let userRole = null;
        
        // البحث في جدول المستخدمين
        const systemUser = users.find(u => u.username === username);
        if (systemUser) {
            userId = systemUser.id;
            userRole = systemUser.role;
        }
        
        // البحث في جدول الأطباء
        const doctor = doctors.find(d => d.username === username);
        if (doctor) {
            userId = doctor.id;
            userRole = 'doctor';
        }
        
        // البحث في جدول المعيدين
        const ta = teachingAssistants.find(t => t.username === username);
        if (ta) {
            userId = ta.id;
            userRole = 'teaching-assistant';
        }
        
        // البحث في جدول الطلاب
        const student = students.find(s => s.student_id === username);
        if (student) {
            userId = student.id;
            userRole = 'student';
        }
        
        lockUser(username, userId, `5 failed login attempts in 10 minutes`, ip);
        
        // إزالة المحاولات من المصفوفة لمنع الحظر المتكرر
        failedLoginAttempts = failedLoginAttempts.filter(a => a.username !== username);
    }
    
    // التحقق من الحظر التلقائي للـ IP
    const attemptsFromIP = failedLoginAttempts.filter(a => a.ip === ip).length;
    if (attemptsFromIP >= 5) {
        const lastFiveAttempts = failedLoginAttempts.filter(a => a.ip === ip).slice(0, 5);
        const withinTenMinutes = lastFiveAttempts.every(a => 
            new Date(a.timestamp) > new Date(Date.now() - 10 * 60 * 1000)
        );
        
        if (withinTenMinutes && !autoBannedIPs.some(b => b.ip === ip)) {
            autoBannedIPs.push({
                ip: ip,
                reason: `5 failed login attempts in 10 minutes`,
                bannedAt: new Date().toISOString(),
                attempts: lastFiveAttempts
            });
            console.log(`🚫 Auto-banned IP: ${ip} due to 5 failed attempts`);
        }
    }
}

// Middleware لتسجيل نشاط المستخدمين
function logAudit(userId, username, action, details, ip) {
    const log = {
        id: auditLogs.length + 1,
        userId: userId,
        username: username,
        action: action,
        details: details,
        ip: ip,
        timestamp: new Date().toISOString()
    };
    auditLogs.unshift(log);
    
    // الاحتفاظ بآخر 500 سجل
    if (auditLogs.length > 500) auditLogs.pop();
}

// Middleware لمراقبة الـ endpoints
app.use((req, res, next) => {
    const endpoint = req.path;
    const method = req.method;
    const key = `${method}:${endpoint}`;
    
    if (!endpointStats[key]) {
        endpointStats[key] = {
            endpoint: endpoint,
            method: method,
            count: 0,
            lastAccessed: null,
            uniqueIPs: new Set()
        };
    }
    
    endpointStats[key].count++;
    endpointStats[key].lastAccessed = new Date().toISOString();
    endpointStats[key].uniqueIPs.add(req.ip);
    
    next();
});

// ============================================
// SECURITY ENDPOINTS
// ============================================

// GET: جلب محاولات تسجيل الدخول الفاشلة
app.get('/api/security/failed-logins', (req, res) => {
    const { limit = 50 } = req.query;
    res.json({
        total: failedLoginAttempts.length,
        attempts: failedLoginAttempts.slice(0, parseInt(limit))
    });
});

// GET: جلب الـ IPs المحظورة تلقائياً
app.get('/api/security/auto-banned', (req, res) => {
    res.json({
        total: autoBannedIPs.length,
        banned: autoBannedIPs
    });
});

// POST: إلغاء حظر IP يدوياً
app.post('/api/security/unban/:ip', (req, res) => {
    const ip = req.params.ip;
    const index = autoBannedIPs.findIndex(b => b.ip === ip);
    if (index !== -1) {
        autoBannedIPs.splice(index, 1);
        logAudit(req.user?.id, req.user?.username || 'system', 'UNBAN_IP', `Unbanned IP: ${ip}`, req.ip);
        res.json({ success: true, message: `IP ${ip} unbanned` });
    } else {
        res.status(404).json({ error: 'IP not found in auto-ban list' });
    }
});

// GET: جلب سجل نشاط المستخدمين
app.get('/api/security/audit-logs', (req, res) => {
    const { limit = 100, user, action, startDate, endDate } = req.query;
    
    let logs = [...auditLogs];
    
    if (user) logs = logs.filter(l => l.username === user);
    if (action) logs = logs.filter(l => l.action === action);
    if (startDate) logs = logs.filter(l => new Date(l.timestamp) >= new Date(startDate));
    if (endDate) logs = logs.filter(l => new Date(l.timestamp) <= new Date(endDate));
    
    res.json({
        total: logs.length,
        logs: logs.slice(0, parseInt(limit))
    });
});

// GET: إحصائيات الـ endpoints
app.get('/api/security/endpoint-stats', (req, res) => {
    const stats = Object.values(endpointStats).map(stat => ({
        endpoint: stat.endpoint,
        method: stat.method,
        count: stat.count,
        lastAccessed: stat.lastAccessed,
        uniqueIPs: stat.uniqueIPs.size
    }));
    
    res.json({
        total: stats.length,
        endpoints: stats.sort((a, b) => b.count - a.count)
    });
});

// GET: فحص أمان كلمات المرور
app.get('/api/security/password-strength', (req, res) => {
    const passwordStats = users.map(user => {
        const password = user.password;
        let strength = 0;
        let issues = [];
        
        if (password.length < 8) issues.push('Too short (min 8 chars)');
        if (!/[A-Z]/.test(password)) issues.push('Missing uppercase letter');
        if (!/[a-z]/.test(password)) issues.push('Missing lowercase letter');
        if (!/[0-9]/.test(password)) issues.push('Missing number');
        if (!/[!@#$%^&*]/.test(password)) issues.push('Missing special character');
        
        strength = Math.min(5, 5 - issues.length);
        
        const isDefault = password === 'admin' || password === 'it' || 
                          password === 'mng' || password === 'emp' ||
                          /^\d{4}$/.test(password);
        
        return {
            userId: user.id,
            username: user.username,
            role: user.role,
            strength: strength,
            strengthLabel: strength >= 4 ? 'Strong' : strength >= 2 ? 'Medium' : 'Weak',
            issues: issues,
            isDefault: isDefault
        };
    });
    
    res.json({
        total: passwordStats.length,
        weak: passwordStats.filter(p => p.strength < 3).length,
        default: passwordStats.filter(p => p.isDefault).length,
        users: passwordStats
    });
});

// POST: فحص صلاحيات المستخدمين
app.get('/api/security/permissions-audit', (req, res) => {
    const audit = users.map(user => {
        const permissions = user.permissions || {};
        const elevatedPermissions = [];
        
        // اكتشاف الصلاحيات المفرطة للمستخدمين العاديين
        if (user.role !== 'admin' && user.role !== 'it') {
            if (permissions['btn.students.delete'] === true) elevatedPermissions.push('btn.students.delete');
            if (permissions['btn.doctors.delete'] === true) elevatedPermissions.push('btn.doctors.delete');
            if (permissions['btn.subjects.delete'] === true) elevatedPermissions.push('btn.subjects.delete');
            if (permissions['btn.lectures.delete'] === true) elevatedPermissions.push('btn.lectures.delete');
            if (permissions['card.management.users'] === true) elevatedPermissions.push('card.management.users');
            if (permissions['card.management.backup'] === true) elevatedPermissions.push('card.management.backup');
        }
        
        return {
            userId: user.id,
            username: user.username,
            role: user.role,
            hasCustomPermissions: user.permissions && Object.keys(user.permissions).length > 0,
            elevatedPermissions: elevatedPermissions,
            riskLevel: elevatedPermissions.length > 0 ? 'HIGH' : (user.permissions ? 'MEDIUM' : 'LOW')
        };
    });
    
    res.json({
        total: audit.length,
        highRisk: audit.filter(a => a.riskLevel === 'HIGH').length,
        users: audit
    });
});

// POST: تسجيل الخروج من جميع الجلسات
app.post('/api/security/terminate-all-sessions', authenticateToken, (req, res) => {
    const count = activeSessionsStore.filter(s => s.isActive === true).length;
    
    activeSessionsStore = activeSessionsStore.map(session => ({
        ...session,
        isActive: false,
        endedAt: new Date().toISOString()
    }));
    
    logAudit(req.user.id, req.user.username, 'TERMINATE_ALL_SESSIONS', `Terminated all ${count} sessions`, req.ip);
    
    res.json({ success: true, message: `All ${count} sessions terminated` });
});

// ============================================
// IP BLACKLIST MANAGEMENT - MANUAL CONTROL
// ============================================

// ملف تخزين الـ IPs المحظورة
const IP_BLACKLIST_FILE = path.join(DB_DIR, 'ip_blacklist_manual.json');
let manualBlacklist = [];

// دالة لتحميل الـ IPs المحظورة يدوياً من الملف
function loadManualBlacklist() {
    const IP_BLACKLIST_FILE = path.join(DB_DIR, 'ip_blacklist_manual.json');
    try {
        if (fs.existsSync(IP_BLACKLIST_FILE)) {
            const content = fs.readFileSync(IP_BLACKLIST_FILE, 'utf8');
            manualBlacklist = JSON.parse(content);
            console.log(`📋 Loaded ${manualBlacklist.length} manually banned IPs`);
            
            // تحديث الـ ipBlacklist المدمجة
            ipBlacklist = manualBlacklist.map(item => item.ip);
        } else {
            manualBlacklist = [];
            ipBlacklist = [];
            fs.writeFileSync(IP_BLACKLIST_FILE, JSON.stringify([], null, 2));
        }
    } catch (error) {
        console.error('Error loading manual blacklist:', error);
        manualBlacklist = [];
        ipBlacklist = [];
    }
}

// دالة لحفظ الـ IPs المحظورة يدوياً
function saveManualBlacklist() {
    const IP_BLACKLIST_FILE = path.join(DB_DIR, 'ip_blacklist_manual.json');
    try {
        fs.writeFileSync(IP_BLACKLIST_FILE, JSON.stringify(manualBlacklist, null, 2));
        // تحديث الـ ipBlacklist المدمجة
        ipBlacklist = manualBlacklist.map(item => item.ip);
        console.log(`💾 Saved ${manualBlacklist.length} manually banned IPs`);
    } catch (error) {
        console.error('Error saving manual blacklist:', error);
    }
}


// تحميل القائمة عند بدء التشغيل
loadManualBlacklist();

// GET: جلب جميع الـ IPs المحظورة يدوياً
app.get('/api/security/manual-banned-ips', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    res.json({
        total: manualBlacklist.length,
        banned: manualBlacklist
    });
});

// POST: إضافة IP إلى القائمة السوداء (يدوياً)
app.post('/api/security/ban-ip', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const { ip, reason } = req.body;
    
    if (!ip) {
        return res.status(400).json({ error: 'IP address is required' });
    }
    
    // التحقق من صيغة الـ IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
        return res.status(400).json({ error: 'Invalid IP address format' });
    }
    
    // التحقق من عدم وجود الـ IP بالفعل
    const existing = manualBlacklist.find(b => b.ip === ip);
    if (existing) {
        return res.status(400).json({ error: 'IP already banned' });
    }
    
    // إضافة الـ IP إلى القائمة
    const banEntry = {
        id: manualBlacklist.length + 1,
        ip: ip,
        reason: reason || 'Manually banned by admin',
        bannedAt: new Date().toISOString(),
        bannedBy: req.user.username,
        type: 'manual'
    };
    
    manualBlacklist.push(banEntry);
    saveManualBlacklist();  // حفظ وحذف التحديث
    
    console.log(`🔴 IP ${ip} BANNED by ${req.user.username} (Reason: ${reason || 'No reason'})`);
    
    logAudit(req.user.id, req.user.username, 'IP_BANNED', `IP ${ip} banned manually. Reason: ${reason || 'No reason'}`, req.ip);
    
    res.json({ 
        success: true, 
        message: `IP ${ip} has been banned successfully. This IP cannot access any page now.`,
        banned: banEntry
    });
});

// DELETE: إزالة IP من القائمة السوداء (رفع الحظر)
app.delete('/api/security/unban-ip/:ip', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const ip = req.params.ip;
    
    const index = manualBlacklist.findIndex(b => b.ip === ip);
    if (index === -1) {
        return res.status(404).json({ error: 'IP not found in blacklist' });
    }
    
    const removed = manualBlacklist[index];
    manualBlacklist.splice(index, 1);
    saveManualBlacklist();  // حفظ وحذف التحديث
    
    console.log(`🟢 IP ${ip} UNBANNED by ${req.user.username}`);
    
    logAudit(req.user.id, req.user.username, 'IP_UNBANNED', `IP ${ip} unbanned manually`, req.ip);
    
    res.json({ 
        success: true, 
        message: `IP ${ip} has been unbanned successfully. This IP can now access the system.`,
        unbanned: removed
    });
});

// POST: حظر IP الحالي (الـ IP اللي بيستخدمه المستخدم حالياً)
// POST: حظر IP الحالي (الـ IP اللي بيستخدمه المستخدم حالياً)
app.post('/api/security/ban-current-ip', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'it') {
        return res.status(403).json({ error: 'Access denied. Admin/IT only.' });
    }
    
    const clientIp = req.ip || req.socket.remoteAddress.replace('::ffff:', '');
    const { reason } = req.body;
    
    const existing = manualBlacklist.find(b => b.ip === clientIp);
    if (existing) {
        return res.status(400).json({ error: 'Your IP is already banned' });
    }
    
    const banEntry = {
        id: manualBlacklist.length + 1,
        ip: clientIp,
        reason: reason || 'Self-ban by admin',
        bannedAt: new Date().toISOString(),
        bannedBy: req.user.username,
        type: 'manual'
    };
    
    manualBlacklist.push(banEntry);
    saveManualBlacklist();
    ipBlacklist = [...ipBlacklist, clientIp];
    
    logAudit(req.user.id, req.user.username, 'IP_BANNED', `Current IP ${clientIp} banned`, req.ip);
    
    // إرجاع HTML بدلاً من JSON حتى تظهر الصفحة
    res.status(403).send(getBanPageHTML(clientIp, banEntry.reason));
});

// تحميل القائمة عند بدء التشغيل
loadManualBlacklist();
// ============================================
// SCHEDULED BACKUPS SYSTEM
// ============================================

// تكوين الجدولة
let backupSchedule = {
    enabled: false,
    frequency: 'daily', // daily, weekly, monthly
    time: '02:00', // وقت التنفيذ (24h format)
    dayOfWeek: 1, // 0=Sunday, 1=Monday, etc. (للجدولة الأسبوعية)
    dayOfMonth: 1, // يوم الشهر (للجدولة الشهرية)
    lastRun: null,
    nextRun: null,
    retentionDays: 30, // عدد الأيام للاحتفاظ بالنسخ الاحتياطية
    status: 'idle', // idle, running, failed
    lastError: null
};

// تحميل الإعدادات المحفوظة
function loadBackupSchedule() {
    const schedulePath = path.join(DB_DIR, 'backup_schedule.json');
    if (fs.existsSync(schedulePath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
            backupSchedule = { ...backupSchedule, ...saved };
            console.log(`📅 Loaded backup schedule: ${backupSchedule.frequency} at ${backupSchedule.time}`);
        } catch (e) {
            console.error('Error loading backup schedule:', e);
        }
    }
    calculateNextRunTime();
}

// حفظ إعدادات الجدولة
function saveBackupSchedule() {
    const schedulePath = path.join(DB_DIR, 'backup_schedule.json');
    const toSave = { ...backupSchedule };
    delete toSave.nextRun; // لا نحتاج حفظ nextRun لأنه يتم حسابه
    fs.writeFileSync(schedulePath, JSON.stringify(toSave, null, 2));
    console.log('💾 Backup schedule saved');
}

// حساب وقت التنفيذ التالي
function calculateNextRunTime() {
    if (!backupSchedule.enabled) {
        backupSchedule.nextRun = null;
        return;
    }
    
    const now = new Date();
    const [hours, minutes] = backupSchedule.time.split(':').map(Number);
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (backupSchedule.frequency === 'daily') {
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
    } 
    else if (backupSchedule.frequency === 'weekly') {
        // حساب اليوم المطلوب
        const targetDay = backupSchedule.dayOfWeek;
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        
        if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
            daysToAdd += 7;
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd);
    }
    else if (backupSchedule.frequency === 'monthly') {
        // حساب الشهر المطلوب
        const targetDay = backupSchedule.dayOfMonth;
        let targetDate = new Date(now.getFullYear(), now.getMonth(), targetDay, hours, minutes);
        
        if (targetDate <= now) {
            targetDate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, hours, minutes);
        }
        nextRun = targetDate;
    }
    
    backupSchedule.nextRun = nextRun.toISOString();
}

// تنفيذ النسخ الاحتياطي المجدول
async function executeScheduledBackup() {
    if (!backupSchedule.enabled) return;
    
    console.log('🔄 Executing scheduled backup...');
    backupSchedule.status = 'running';
    backupSchedule.lastError = null;
    saveBackupSchedule();
    
    try {
        // إنشاء نسخة احتياطية
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `auto_backup_${timestamp}.zip`;
        const backupPath = path.join(BACKUPS_DIR, backupName);
        
        // إنشاء الأرشفة
        const output = fs.createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            
            // إضافة جميع ملفات JSON
            const jsonFiles = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
            jsonFiles.forEach(file => {
                const filePath = path.join(DB_DIR, file);
                archive.file(filePath, { name: `database/${file}` });
            });
            
            archive.finalize();
        });
        
        backupSchedule.lastRun = new Date().toISOString();
        backupSchedule.status = 'idle';
        console.log(`✅ Scheduled backup created: ${backupName}`);
        
        // تسجيل في audit log
        logAudit(null, 'system', 'BACKUP_CREATED', `Scheduled backup created: ${backupName}`, 'system');
        
        // تنظيف النسخ القديمة
        await cleanupOldBackups();
        
    } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
        backupSchedule.status = 'failed';
        backupSchedule.lastError = error.message;
        logAudit(null, 'system', 'BACKUP_FAILED', `Scheduled backup failed: ${error.message}`, 'system');
    }
    
    // حساب وقت التنفيذ التالي
    calculateNextRunTime();
    saveBackupSchedule();
}

// تنظيف النسخ الاحتياطية القديمة
async function cleanupOldBackups() {
    const retentionDays = backupSchedule.retentionDays;
    if (retentionDays <= 0) return;
    
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const files = fs.readdirSync(BACKUPS_DIR);
    let deletedCount = 0;
    
    for (const file of files) {
        if (!file.endsWith('.zip')) continue;
        
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.birthtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`🗑️ Deleted old backup: ${file}`);
        }
    }
    
    if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old backups (older than ${retentionDays} days)`);
        logAudit(null, 'system', 'BACKUP_CLEANUP', `Deleted ${deletedCount} old backups`, 'system');
    }
}

// بدء مراقبة الجدولة
let scheduleChecker = null;

function startScheduleMonitor() {
    if (scheduleChecker) clearInterval(scheduleChecker);
    
    scheduleChecker = setInterval(async () => {
        if (!backupSchedule.enabled) return;
        if (backupSchedule.status === 'running') return;
        if (!backupSchedule.nextRun) {
            calculateNextRunTime();
            return;
        }
        
        const now = new Date();
        const nextRun = new Date(backupSchedule.nextRun);
        
        if (now >= nextRun) {
            await executeScheduledBackup();
        }
    }, 60000); // التحقق كل دقيقة
}

// تحميل الإعدادات وبدء المراقبة عند بدء التشغيل
loadBackupSchedule();
startScheduleMonitor();

// ============================================
// SCHEDULED BACKUP ENDPOINTS
// ============================================

// GET: جلب إعدادات الجدولة
app.get('/api/backup-schedule', (req, res) => {
    res.json({
        schedule: backupSchedule,
        nextRun: backupSchedule.nextRun,
        lastRun: backupSchedule.lastRun,
        status: backupSchedule.status
    });
});

// POST: تحديث إعدادات الجدولة
app.post('/api/backup-schedule', (req, res) => {
    const { enabled, frequency, time, dayOfWeek, dayOfMonth, retentionDays } = req.body;
    
    if (enabled !== undefined) backupSchedule.enabled = enabled;
    if (frequency) backupSchedule.frequency = frequency;
    if (time) backupSchedule.time = time;
    if (dayOfWeek !== undefined) backupSchedule.dayOfWeek = parseInt(dayOfWeek);
    if (dayOfMonth !== undefined) backupSchedule.dayOfMonth = parseInt(dayOfMonth);
    if (retentionDays !== undefined) backupSchedule.retentionDays = parseInt(retentionDays);
    
    calculateNextRunTime();
    saveBackupSchedule();
    
    logAudit(req.user?.id, req.user?.username || 'system', 'BACKUP_SCHEDULE_UPDATED', 
             `Schedule updated: ${backupSchedule.frequency} at ${backupSchedule.time}`, req.ip);
    
    res.json({ success: true, schedule: backupSchedule });
});

// POST: تنفيذ نسخة احتياطية فورية (يدوي)
app.post('/api/backup-now', authenticateToken, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `manual_backup_${timestamp}.zip`;
        const backupPath = path.join(BACKUPS_DIR, backupName);
        
        const output = fs.createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            
            const jsonFiles = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
            jsonFiles.forEach(file => {
                const filePath = path.join(DB_DIR, file);
                archive.file(filePath, { name: `database/${file}` });
            });
            
            archive.finalize();
        });
        
        logAudit(req.user.id, req.user.username, 'BACKUP_CREATED', `Manual backup created: ${backupName}`, req.ip);
        
        res.json({ success: true, message: 'Backup created successfully', filename: backupName });
        
    } catch (error) {
        console.error('Manual backup error:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// GET: إحصائيات النسخ الاحتياطية
app.get('/api/backup-stats', (req, res) => {
    const backups = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.zip'));
    const stats = {
        total: backups.length,
        auto: backups.filter(f => f.startsWith('auto_backup')).length,
        manual: backups.filter(f => f.startsWith('manual_backup')).length,
        totalSize: 0,
        oldest: null,
        newest: null
    };
    
    let totalSize = 0;
    let oldestDate = null;
    let newestDate = null;
    
    backups.forEach(file => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stat = fs.statSync(filePath);
        totalSize += stat.size;
        
        if (!oldestDate || stat.birthtime < oldestDate) oldestDate = stat.birthtime;
        if (!newestDate || stat.birthtime > newestDate) newestDate = stat.birthtime;
    });
    
    stats.totalSize = (totalSize / 1024 / 1024).toFixed(2);
    stats.oldest = oldestDate ? oldestDate.toISOString() : null;
    stats.newest = newestDate ? newestDate.toISOString() : null;
    
    res.json(stats);
});

// ============================================
// RATE LIMITS CONFIGURATION - DYNAMIC
// ============================================

// ملف تخزين إعدادات الـ Rate Limits
const RATE_LIMITS_FILE = path.join(DB_DIR, 'rate_limits.json');

// الإعدادات الافتراضية
const DEFAULT_RATE_LIMITS = {
    general: {
        windowMs: 15 * 60 * 1000, // 15 دقيقة
        max: 200,
        enabled: true
    },
    login: {
        windowMs: 15 * 60 * 1000,
        max: 10,
        enabled: true
    },
    api: {
        windowMs: 5 * 60 * 1000,
        max: 50,
        enabled: true
    },
    backup: {
        windowMs: 60 * 60 * 1000,
        max: 5,
        enabled: true
    },
    restore: {
        windowMs: 60 * 60 * 1000,
        max: 2,
        enabled: true
    },
    student: {
        windowMs: 15 * 60 * 1000,
        max: 300,
        enabled: true
    },
    doctor: {
        windowMs: 15 * 60 * 1000,
        max: 150,
        enabled: true
    }
};

// تحميل إعدادات الـ Rate Limits
let rateLimitsConfig = { ...DEFAULT_RATE_LIMITS };

function loadRateLimitsConfig() {
    try {
        if (fs.existsSync(RATE_LIMITS_FILE)) {
            const content = fs.readFileSync(RATE_LIMITS_FILE, 'utf8');
            const saved = JSON.parse(content);
            rateLimitsConfig = { ...DEFAULT_RATE_LIMITS, ...saved };
            console.log(`📋 Loaded rate limits config:`, rateLimitsConfig);
        } else {
            // إنشاء الملف بالإعدادات الافتراضية
            fs.writeFileSync(RATE_LIMITS_FILE, JSON.stringify(DEFAULT_RATE_LIMITS, null, 2));
            console.log(`📝 Created default rate limits config`);
        }
    } catch (error) {
        console.error('Error loading rate limits config:', error);
        rateLimitsConfig = { ...DEFAULT_RATE_LIMITS };
    }
}

// حفظ إعدادات الـ Rate Limits
function saveRateLimitsConfig() {
    try {
        fs.writeFileSync(RATE_LIMITS_FILE, JSON.stringify(rateLimitsConfig, null, 2));
        console.log(`💾 Rate limits config saved`);
        return true;
    } catch (error) {
        console.error('Error saving rate limits config:', error);
        return false;
    }
}

// تحميل الإعدادات عند بدء التشغيل
loadRateLimitsConfig();

// دالة للحصول على إعدادات Limiter ديناميكياً
function getRateLimitConfig(type) {
    const config = rateLimitsConfig[type] || DEFAULT_RATE_LIMITS[type];
    return {
        windowMs: config.windowMs,
        max: config.max,
        enabled: config.enabled !== false,
        message: {
            error: `Too many requests. Limit: ${config.max} requests per ${config.windowMs / 60000} minutes.`,
            retryAfter: `${config.windowMs / 60000} minutes`
        },
        standardHeaders: true,
        legacyHeaders: false
    };
}

// ============================================
// WEBSOCKET SERVER WITH WSS SUPPORT
// ============================================

let wss = null;
let wsHttpServer = null;

// التحقق من وجود شهادة HTTPS (استخدم SSL_KEY_PATH و SSL_CERT_PATH المعرفة في الأعلى)
const hasSSL = fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH);

if (hasSSL) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(SSL_KEY_PATH),
            cert: fs.readFileSync(SSL_CERT_PATH)
        };
        
        wsHttpServer = https.createServer(httpsOptions);
        wss = new WebSocket.Server({ server: wsHttpServer });
        
        wsHttpServer.listen(3001, '0.0.0.0', () => {
            console.log(`🔒 WebSocket (WSS) server running on wss://${getLocalIP()}:3001`);
        });
    } catch (error) {
        console.error('❌ Error creating WSS server:', error);
        console.log('📝 Falling back to WS (unsecure)');
        // إعادة المحاولة مع WS
        wss = new WebSocket.Server({ port: 3001 });
        console.log(`🔓 WebSocket (WS) server running on ws://${getLocalIP()}:3001`);
    }
} else {
    // WebSocket عادي (WS) على بورت 3001
    wss = new WebSocket.Server({ port: 3001 });
    console.log(`🔓 WebSocket (WS) server running on ws://${getLocalIP()}:3001`);
}

// إعدادات WebSocket
wss.on('connection', (ws, req) => {
    let clientIp = req.socket.remoteAddress;
    if (clientIp) {
        clientIp = clientIp.replace('::ffff:', '');
    }
    console.log(`[WebSocket] New connection from ${clientIp}`);

    if (clientIp === HOST_DEVICE_IP) {
        console.log('✅ Host device connected via WebSocket.');
        hostConnections.add(ws);

        ws.on('close', () => {
            console.log('🔌 Host device disconnected.');
            hostConnections.delete(ws);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error from host:', error);
            hostConnections.delete(ws);
        });
        
        ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED', message: 'Connected to host listener' }));
    } else {
        console.log(`❌ Non-host device (${clientIp}) tried to connect. Closing.`);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Only host device is allowed' }));
        ws.close();
    }
});

// تنظيف عند إغلاق السيرفر
process.on('SIGINT', () => {
    if (wsHttpServer) {
        wsHttpServer.close();
    }
    if (wss) {
        wss.close();
    }
});

// ============================================
// HTTPS SERVER - تشغيل السيرفر مع HTTPS
// ============================================

const https = require('https');
const http = require('http');

let httpsServer = null;

// التحقق من وجود الشهادة (استخدم SSL_KEY_PATH و SSL_CERT_PATH المعرفة في الأعلى)
if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    const httpsOptions = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
    };
    
    httpsServer = https.createServer(httpsOptions, app);
    console.log('✅ HTTPS enabled');
}

// تشغيل HTTPS على بورت 443
if (httpsServer) {
    const HTTPS_PORT = 443;
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS Server running on:`);
        console.log(`   - https://localhost:${HTTPS_PORT}`);
        console.log(`   - https://${getLocalIP()}:${HTTPS_PORT}`);
    });
}


// Endpoint للتحقق من صحة السيرفر (Render health check)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// تشغيل HTTP على البورت الأصلي 3000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server running on port ${PORT}`);
    console.log(`   - http://localhost:${PORT}`);
    console.log(`   - ${RENDER_URL}`);
});

// Logging middleware
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`${new Date().toISOString()} [${clientIP}] ${req.method} ${req.url}`);
  next();
});

// Logging middleware - معدل
app.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`${new Date().toISOString()} [${clientIP}] ${req.method} ${req.url}`);
  next();
});