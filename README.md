# 🎓 TRAXA System - Academic Management Platform

[![Render](https://img.shields.io/badge/Render-Deployed-brightgreen)](https://render.com)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org)

## Overview
TRAXA is an integrated academic management system with three portals:
- **Admin Dashboard** - Full system control
- **Doctor Portal** - Manage lectures, attendance, and grades
- **Student Portal** - View grades and lecture schedule

## Features
- 🔐 JWT Authentication with role-based permissions
- 👤 Face Recognition for attendance
- 📊 Professional PDF/Excel reports
- 💾 Automatic & manual backups
- 🗑️ Recycle Bin with data recovery
- 🛡️ Security features (IP Ban, Rate Limiting, Account Lock)
- 🌓 Light/Dark Mode
- 📱 Responsive Design

## Technologies
- **Backend:** Node.js + Express.js
- **Database:** JSON File System
- **Authentication:** JWT + bcrypt
- **Frontend:** HTML5, Tailwind CSS, Vanilla JS
- **AI:** face-api.js for face recognition

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Steps
```bash
git clone https://github.com/Traxasystem/Traxa-System.git
cd Traxa-System
npm install
node server.js
