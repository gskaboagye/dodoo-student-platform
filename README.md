# Dodoo Coding Club
## Student Success & Impact Platform
---

> **Project Ownership:** Developed and maintained by **Godfred Sefa Aboagye**, a Software Development student at **Brigham Young University–Idaho (BYU-Idaho)**, as part of a CAR 398 Work-Experience Internship with Dodoo Coding Club.

# Email Verification

The platform uses **Resend** for email verification.

After registration:

1.  A six-digit verification code is generated. 
2.  The code is stored temporarily. 
3.  The code expires after 10 minutes. 
4.  The verification email is sent. 
5.  The user enters the code. 
6.  The email is marked as verified. 

Example workflow:

```
```

```
Registration
     |
     v
Generate 6-digit Code
     |
     v
Send Email
     |
     v
User Enters Code
     |
     v
Verify Code
     |
     v
emailVerified = true
```

For development/testing, Resend may restrict sending to the account owner's email address until a sending domain has been verified.

For production, a verified Dodoo Coding Club domain should be used.

---

# Student Requests

After a student verifies their email, their account remains pending.

Facilitators can access the **Student Requests** section.

Each request can be:

-  Accepted 
-  Rejected 

When accepted:

1.  A student record is created. 
2.  The user account is linked to the student record. 
3.  The account becomes active. 
4.  The student can log in. 

---

# Student Profile

Students can manage their personal information.

The profile contains:

-  First name 
-  Last name 
-  Phone number 
-  Date of birth 
-  Gender 
-  Program 
-  Education level 
-  School 
-  Address 
-  Emergency contact name 
-  Emergency contact phone 
-  Profile picture 

Students are only authorized to modify their own profile.

---

# Profile Picture Upload

Profile images are uploaded through the platform's upload API and stored using **Cloudinary**.

Supported formats:

-  JPG 
-  PNG 
-  WebP 

Maximum file size:

```
```

```
5 MB
```

Profile pictures are displayed on the student dashboard.

---

# Attendance Management

Attendance is managed by facilitators.

Facilitators can:

-  View student attendance. 
-  Search students. 
-  Mark students as Present. 
-  Mark students as Late. 
-  Mark students as Absent. 
-  Update attendance records. 

Students have view-only access to their own attendance.

Students cannot:

-  Add attendance. 
-  Edit attendance. 
-  Delete attendance. 
-  View another student's attendance. 

---

# Attendance Scoring

Attendance contributes to the student's overall progress.

The scoring system is:

| Attendance StatusScore |      |
| ---------------------- | ---- |
| Present                | 100% |
| Late                   | 50%  |
| Absent                 | 0%   |

The average attendance performance contributes **30%** of the overall student progress calculation.

---

# Progress Tracking

Student progress is calculated automatically.

The platform uses three main components:

| ComponentWeight  |          |
| ---------------- | -------- |
| Program Timeline | 20%      |
| Attendance       | 30%      |
| Projects         | 50%      |
| **Total**        | **100%** |

The calculation is:

```
```

```
Overall Progress =
(Timeline Progress × 0.20)
+
(Attendance Progress × 0.30)
+
(Project Progress × 0.50)
```

---

# Program Timeline

The platform uses the student's enrollment date and expected completion date to calculate timeline progress.

The program duration is currently configured for:

```
```

```
24 months
```

The system calculates:

-  Months completed 
-  Months remaining 
-  Program year 
-  Enrollment date 
-  Expected completion date 

---

# Project Progress

Projects contribute **50%** of the overall student progress.

The system can track:

-  Student projects 
-  Project status 
-  Project progress 
-  Project ownership 

Project progress is incorporated automatically into the student's overall progress.

---

# Learning Resources

The Resources section provides students with access to learning materials.

Resources can be managed by facilitators and made available to students through the platform.

Possible resource types include:

-  Tutorials 
-  Documentation 
-  Videos 
-  Articles 
-  Course materials 
-  Development resources 

---

# Dashboards

## Facilitator Dashboard

The facilitator dashboard provides an overview of program activity.

It can display information such as:

-  Total students 
-  Attendance statistics 
-  Active projects 
-  Available resources 
-  Recent students 
-  Student progress 

---

## Student Dashboard

The student dashboard provides personalized information for the logged-in student.

It can display:

-  Student name 
-  Profile picture 
-  Program 
-  Attendance 
-  Progress 
-  Projects 
-  Learning resources 

Students only receive information associated with their own account.

---

# Technology Stack

## Frontend

-  Next.js 
-  React 
-  JavaScript 
-  Tailwind CSS 
-  Lucide React 

## Backend

-  Next.js App Router 
-  Next.js API Routes 
-  Node.js 

## Database

-  MongoDB 
-  MongoDB Atlas 

## Authentication

-  bcryptjs 
-  JOSE 
-  JWT 
-  HTTP-only cookies 

## Email

-  Resend 

## Image Storage

-  Cloudinary 

## Version Control

-  Git 
-  GitHub 

## Deployment

-  Vercel 

## Development Environment

-  Visual Studio Code 
-  PowerShell 
-  Windows 

---

# System Architecture

The application follows a full-stack architecture.

```
```

```
                    USER
                     |
                     v
              Next.js Frontend
                     |
          +----------+----------+
          |                     |
          v                     v
      API Routes            Authentication
          |                     |
          +----------+----------+
                     |
              Application Logic
                     |
        +------------+------------+
        |            |            |
        v            v            v
     MongoDB      Resend      Cloudinary
     Database      Email       Images
```

---

# Project Structure

```
```

```
dodoo-student-platform/
│
├── public/
│   └── images/
│
├── src/
│   │
│   ├── app/
│   │   │
│   │   ├── api/
│   │   │   ├── attendance/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.js
│   │   │   │   ├── register/
│   │   │   │   │   └── route.js
│   │   │   │   └── verify-email/
│   │   │   │       └── route.js
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   ├── progress/
│   │   │   ├── projects/
│   │   │   ├── resources/
│   │   │   ├── student/
│   │   │   ├── student-requests/
│   │   │   ├── students/
│   │   │   └── upload/
│   │   │
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── progress/
│   │   ├── projects/
│   │   ├── register/
│   │   ├── resources/
│   │   ├── student/
│   │   │   └── profile/
│   │   ├── student-requests/
│   │   ├── students/
│   │   ├── verify-email/
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── page.js
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   ├── StatCard.jsx
│   │   └── StudentCard.jsx
│   │
│   └── lib/
│       ├── auth.js
│       └── mongodb.js
│
├── .env.local
├── .gitignore
├── next.config.js
├── package.json
├── package-lock.json
└── README.md
```

---

# Database Design

The application uses MongoDB Atlas.

The main collections are:

## users

Stores authentication and account information.

Example fields:

```
```

```
name
email
passwordHash
role
program
status
studentId
emailVerified
emailVerificationCode
emailVerificationExpiresAt
createdAt
updatedAt
```

---

## students

Stores student program and profile information.

Example fields:

```
```

```
firstName
lastName
email
phone
dateOfBirth
gender
program
educationLevel
school
address
emergencyContactName
emergencyContactPhone
enrollmentDate
expectedCompletionDate
programDurationMonths
status
progress
profileImage
createdAt
updatedAt
```

---

## attendance

Stores attendance records.

Typical information includes:

```
```

```
studentId
date
status
createdAt
updatedAt
```

---

## projects

Stores student project information.

Project information may include:

```
```

```
studentId
title
description
status
progress
createdAt
updatedAt
```

---

## resources

Stores learning resources available to students.

Resources can include:

```
```

```
title
description
url
category
createdAt
updatedAt
```

---

# API Structure

The application uses Next.js API routes.

## Authentication

```
```

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-email
```

---

## Students

```
```

```
GET    /api/students
PUT    /api/students
DELETE /api/students
```

---

## Student Requests

```
```

```
GET  /api/student-requests
POST /api/student-requests
```

---

## Attendance

```
```

```
GET    /api/attendance
POST   /api/attendance
PUT    /api/attendance
DELETE /api/attendance
```

---

## Progress

```
```

```
GET /api/progress
```

Progress is calculated automatically rather than being manually edited.

---

## Dashboard

```
```

```
GET /api/dashboard
```

---

## Student Profile

```
```

```
GET /api/student/profile
PUT /api/student/profile
```

---

## Image Upload

```
```

```
POST /api/upload
```

---

# Authorization Rules

The application uses role-based authorization.

## Facilitator-only operations

The following operations are restricted to facilitators:

-  Student management 
-  Student approval 
-  Student rejection 
-  Attendance creation 
-  Attendance modification 
-  Attendance deletion 
-  Resource management 
-  Project management 
-  Viewing all students 

---

## Student restrictions

Students can only access information associated with their own account.

Students cannot access administrative operations.

---

# Environment Variables

The application uses environment variables for sensitive configuration.

Create:

```
```

```
.env.local
```

in the project root.

Example:

```
```

```
MONGODB_URI=your_mongodb_connection_string
DB_NAME=DCCPlatform

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FACILITATOR_CODE=your_private_invitation_code
AUTH_SECRET=your_long_random_secret

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Dodoo Coding Club <noreply@your-domain.com>
```

### Never commit these values to GitHub.

The `.env.local` file should remain private.

---

# .gitignore

The project should include:

```
```

```
node_modules/
.next/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

# Getting Started

## Prerequisites

Before running the application, install:

-  Node.js 
-  npm 
-  Git 
-  MongoDB Atlas account 
-  Cloudinary account 
-  Resend account 

---

## Clone the Repository

```
```

```
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate into the project:

```
```

```
cd dodoo-student-platform
```

---

## Install Dependencies

```
```

```
npm install
```

---

## Configure Environment Variables

Create:

```
```

```
.env.local
```

Add the required environment variables.

---

## Start Development Server

```
```

```
npm run dev
```

The application will normally be available at:

```
```

```
http://localhost:3000
```

---

# Development Commands

## Start development server

```
```

```
npm run dev
```

## Build the application

```
```

```
npm run build
```

## Start production server

```
```

```
npm start
```

---

# Testing

Testing should include the following workflows.

## Authentication Testing

-  Register student. 
-  Register facilitator. 
-  Test strong password validation. 
-  Test invalid email. 
-  Test duplicate email. 
-  Test incorrect facilitator invitation code. 
-  Verify student email. 
-  Verify facilitator email. 
-  Test login with unverified account. 
-  Test login with pending student. 
-  Test login with rejected student. 
-  Test successful login. 

---

## Student Testing

-  View dashboard. 
-  View profile. 
-  Edit profile. 
-  Upload profile picture. 
-  View attendance. 
-  View progress. 
-  View projects. 
-  Access resources. 
-  Attempt unauthorized administrative actions. 

---

## Facilitator Testing

-  View dashboard. 
-  View students. 
-  Review student requests. 
-  Accept student. 
-  Reject student. 
-  Manage attendance. 
-  View progress. 
-  Manage projects. 
-  Manage resources. 

---

# Security

Security is an important part of the platform.

The application includes:

-  Password hashing using bcrypt. 
-  HTTP-only session cookies. 
-  JWT-based authentication. 
-  Role-based authorization. 
-  Protected API routes. 
-  Student ownership checks. 
-  Email verification. 
-  Strong password requirements. 
-  Facilitator invitation code. 
-  Environment variables for sensitive credentials. 
-  Server-side validation. 

Sensitive credentials should never be stored directly in source code.

---

# Deployment

The application can be deployed using **Vercel**.

## Deployment process

1.  Push the project to GitHub. 
2.  Create a Vercel project. 
3.  Connect the GitHub repository. 
4.  Configure environment variables. 
5.  Deploy the application. 
6.  Test authentication. 
7.  Test database connectivity. 
8.  Test email verification. 
9.  Test Cloudinary image uploads. 
10.  Test role-based permissions. 

---

# Production Email Configuration

During development, Resend may restrict testing emails to the account owner's email address.

For production, the project should use a verified Dodoo Coding Club domain.

Example:

```
```

```
EMAIL_FROM=Dodoo Coding Club <noreply@dodoocodingclub.com>
```

The sending domain must be verified in Resend before sending verification emails to general users.

---

# Development Process

The project follows an iterative development process.

## Phase 1 — Requirements

-  Identify the organization's needs. 
-  Identify target users. 
-  Define facilitator and student responsibilities. 
-  Define required features. 

## Phase 2 — Planning

-  Design system structure. 
-  Plan database collections. 
-  Define authentication flow. 
-  Define user permissions. 

## Phase 3 — Interface Development

-  Build navigation. 
-  Build dashboard. 
-  Build authentication pages. 
-  Build student pages. 
-  Build facilitator pages. 

## Phase 4 — Backend Development

-  Create API routes. 
-  Connect MongoDB. 
-  Implement authentication. 
-  Implement authorization. 
-  Implement student management. 
-  Implement attendance. 
-  Implement progress. 

## Phase 5 — Integration

-  Integrate Resend. 
-  Integrate Cloudinary. 
-  Connect frontend to APIs. 
-  Connect student accounts to student records. 

## Phase 6 — Testing

-  Test registration. 
-  Test email verification. 
-  Test login. 
-  Test role permissions. 
-  Test student workflows. 
-  Test facilitator workflows. 
-  Test API responses. 

## Phase 7 — Deployment

-  Prepare production environment. 
-  Configure environment variables. 
-  Deploy to Vercel. 
-  Test production functionality. 

## Phase 8 — Documentation

-  Document system features. 
-  Document installation. 
-  Document API routes. 
-  Document database structure. 
-  Document user roles. 
-  Document future improvements. 

---

# Internship Deliverables

This project forms part of the **CAR 398 Work-Experience Internship** at Dodoo Coding Club.

The project focuses on the development of the:

**Student Success & Impact Platform**

Planned internship activities include:

-  Requirements gathering 
-  System analysis 
-  UI/UX planning 
-  Database design 
-  Application development 
-  Authentication 
-  Student management 
-  Attendance tracking 
-  Progress monitoring 
-  Project tracking 
-  Resource management 
-  Testing 
-  Deployment 
-  Documentation 

A future phase of the internship may also focus on the **Software Development Training Program**, which will involve practical software-development training for Dodoo Coding Club students.

---

# Future Improvements

Potential future features include:

-  Password reset. 
-  Resend verification code. 
-  Email notifications. 
-  Student achievement badges. 
-  Certificates. 
-  Advanced analytics. 
-  Program impact reports. 
-  Attendance reports. 
-  PDF reports. 
-  Excel exports. 
-  Student messaging. 
-  Facilitator activity logs. 
-  Student assignment tracking. 
-  Automated reminders. 
-  Mobile application. 
-  Custom DCC email domain. 
-  Improved dashboard analytics. 
-  Search and filtering improvements. 

---

# Known Limitations

The current development version has some limitations:

1.  Email sending depends on the Resend account configuration. 
2.  Resend testing accounts may restrict recipient addresses until a domain is verified. 
3.  Production deployment requires production environment variables. 
4.  Some advanced reporting features are planned for future development. 
5.  The platform currently focuses primarily on the core student management workflow. 

---

# Project Information

## Organization

**Dodoo Coding Club**

## Project

**Student Success & Impact Platform**

## Internship Course

**CAR 398 — Work-Experience Internship**

## Project Start

**September 18, 2026**

## Sponsor

**Sir Prince**

Lead Facilitator

Dodoo Coding Club

## Organization Location

Pokuase Community Library, Ghana

## Websites

[https://dodoocodingclub.com/](https://dodoocodingclub.com/)

https://www.dccstudentplatform.com/progress

---

# Author & Ownership

## Godfred Sefa Aboagye

**Software Developer | Web Developer | Graphic Designer**

### School

**Brigham Young University–Idaho (BYU-Idaho)**  
Bachelor's Degree in Software Development — In Progress  
Expected Graduation: **2027**

### GitHub

https://github.com/gskaboagye

### LinkedIn

[https://www.linkedin.com/in/godfred-aboagye-1ba6982b4](https://www.linkedin.com/in/godfred-aboagye-1ba6982b4)

### Ownership & Attribution

This project was designed and developed by **Godfred Sefa Aboagye** as part of the **CAR 398 Work-Experience Internship** at **Dodoo Coding Club**, while pursuing a Bachelor's Degree in Software Development at **Brigham Young University–Idaho**.

The source code, system architecture, application logic, interface implementation, database design, authentication workflow, and documentation are the work of the author unless otherwise stated. Third-party services and libraries are acknowledged in the Technology Stack and project documentation.

For reuse, modification, or redistribution of this project, please retain the original author attribution and acknowledge the Dodoo Coding Club internship context.

---

# Acknowledgment

This project was developed as part of a CAR 398 Work-Experience Internship with Dodoo Coding Club.

The project is intended to support the organization's student management, learning activities, and program impact tracking through a centralized digital platform.
