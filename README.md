# Dodoo Coding Club — Student Success & Impact Platform

A full-stack student management platform developed for Dodoo Coding Club to support student registration, attendance, progress tracking, projects, resources, and facilitator administration.

> Developed by **Godfred Sefa Aboagye** as part of a **CAR 398 Work-Experience Internship** with Dodoo Coding Club.

## Overview

The Student Success & Impact Platform provides a centralized system for managing student information and monitoring program participation and progress.

### Key Features

- Student registration and email verification
- Role-based authentication for students and facilitators
- Student approval and account management
- Student profiles and profile picture uploads
- Attendance management
- Automated progress tracking
- Project tracking
- Learning resources
- Facilitator and student dashboards
- Protected API routes
- Session-based authentication
- Email notifications and verification

## Progress Calculation

Student progress is calculated using three components:

| Component | Weight |
|---|---:|
| Program Timeline | 20% |
| Attendance | 30% |
| Projects | 50% |
| **Total** | **100%** |

Attendance scoring:

| Status | Score |
|---|---:|
| Present | 100% |
| Late | 50% |
| Absent | 0% |

## Technology Stack

**Frontend**
- Next.js
- React
- JavaScript
- Tailwind CSS
- Lucide React

**Backend**
- Next.js App Router
- Next.js API Routes
- Node.js

**Database & Services**
- MongoDB Atlas
- Resend
- Cloudinary

**Authentication**
- JWT
- JOSE
- bcryptjs
- HTTP-only cookies

**Deployment**
- Vercel

## Architecture

```text
User
  │
  ▼
Next.js Application
  │
  ├── Frontend
  ├── API Routes
  ├── Authentication
  └── Application Logic
       │
       ├── MongoDB
       ├── Resend
       └── Cloudinary
