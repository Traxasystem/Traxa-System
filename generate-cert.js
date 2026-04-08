// generate-cert.js - يجلب كل الـ IPs تلقائياً
const forge = require('node-forge');
const fs = require('fs');
const os = require('os');
const { networkInterfaces } = require('os');

// دالة تجلب كل الـ IPs (حتى الـ 10.142.62.221)
function getAllNetworkIPs() {
    const ips = new Set(); // استخدام Set لتجنب التكرار
    
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // نجيب كل الـ IPv4 addresses (حتى لو مش internal)
            if (iface.family === 'IPv4') {
                ips.add(iface.address);
            }
        }
    }
    
    // إضافة IPs مهمة
    ips.add('127.0.0.1');
    ips.add('localhost');
    ips.add('0.0.0.0'); // للسماح بأي IP
    
    return Array.from(ips);
}

const allIPs = getAllNetworkIPs();
console.log('🔐 Creating certificate for all IPs:');
allIPs.forEach(ip => console.log(`   - ${ip}`));

// إنشاء المفتاح
const keys = forge.pki.rsa.generateKeyPair(2048);
const privateKey = forge.pki.privateKeyToPem(keys.privateKey);

// إنشاء الشهادة
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
    name: 'commonName',
    value: 'TRAXA Server'
}, {
    name: 'countryName',
    value: 'EG'
}, {
    shortName: 'ST',
    value: 'Cairo'
}, {
    name: 'localityName',
    value: 'Cairo'
}, {
    name: 'organizationName',
    value: 'TRAXA'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// إضافة كل الـ IPs كـ Subject Alternative Names
const altNames = [];

// إضافة كل الـ IPs
allIPs.forEach(ip => {
    if (ip.includes('.') && !ip.includes('localhost')) {
        altNames.push({ type: 7, ip: ip }); // type 7 = IP Address
    } else if (ip === 'localhost') {
        altNames.push({ type: 2, value: 'localhost' }); // type 2 = DNS
    }
});

// إضافة 0.0.0.0 للسماح بأي IP
altNames.push({ type: 7, ip: '0.0.0.0' });

console.log('\n📌 Alternative Names added:');
altNames.forEach(name => {
    if (name.type === 7) console.log(`   - IP: ${name.ip}`);
    else console.log(`   - DNS: ${name.value}`);
});

cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
}, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    keyEncipherment: true,
    dataEncipherment: true
}, {
    name: 'subjectAltName',
    altNames: altNames
}]);

cert.sign(keys.privateKey, forge.md.sha256.create());
const certPem = forge.pki.certificateToPem(cert);

// حفظ الملفات
fs.writeFileSync('server.key', privateKey);
fs.writeFileSync('server.crt', certPem);

console.log('\n✅ SSL certificates created successfully!');
console.log('\n📌 Now run: npm start');