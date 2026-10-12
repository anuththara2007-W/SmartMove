# 🚍 SmartMove Transport Solutions

> **Enterprise Hybrid Transport Management System**  
> *Module: Database Management II (DM-2 / HDSE 26.1)*  
> Built with **Oracle Database 19c/21c**, **MongoDB**, and **Node.js / Express**.

---

## 📌 Table of Contents
- [Project Overview](#-project-overview)
- [System Architecture](#-system-architecture)
- [Core Technologies](#-core-technologies)
- [Key Features](#-key-features)
  - [Public Passenger Experience](#1-public-passenger-experience)
  - [Executive System Portal & Operations](#2-executive-system-portal--operations)
- [Database Architecture](#-database-architecture)
  - [Oracle RDBMS (Relational Engine)](#oracle-rdbms-relational-engine)
  - [MongoDB (NoSQL Document Store)](#mongodb-nosql-document-store)
  - [Advanced PL/SQL Components](#advanced-plsql-components)
- [Team Member Responsibilities](#-team-member-responsibilities)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Installation & Getting Started](#-installation--getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup & Seeding](#database-setup--seeding)
  - [Environment Configuration](#environment-configuration)
  - [Running the Application](#running-the-application)
- [Coursework Information](#-coursework-information)

---

## 🌟 Project Overview

**SmartMove Transport Solutions** is a next-generation transport management and passenger reservation platform. Designed to solve complex fleet scheduling, multi-terminal routing, real-time ticket bookings, and sentiment-driven customer reviews, SmartMove pairs **enterprise-grade relational ACID consistency (Oracle RDBMS)** with **flexible, high-throughput document storage (MongoDB)**.

The solution features a modern public web application for passengers, coupled with a full-fledged **Executive Operations Portal** providing real-time fleet telemetry, Kanban trip scheduling, driver ratings, and business intelligence analytics powered by stored PL/SQL procedures and cursor loops.

---

## 🏗 System Architecture

SmartMove operates on a **Hybrid Enterprise Database Architecture**:

```
                              ┌────────────────────────────────────────┐
                              │            Clients / UI                │
                              │  - Public Portal (HTML5/CSS3/Vanilla)  │
                              │  - Executive Admin Portal              │
                              │  - React / TypeScript Dashboard        │
                              └───────────────────┬────────────────────┘
                                                  │ HTTP / REST
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │        Node.js / Express Server        │
                              │             (server.js)                │
                              ├───────────────────┬────────────────────┤
                              │ oracleController  │  mongoController   │
                              └─────────┬─────────┴─────────┬──────────┘
                                        │                   │
                     Connection Pool & SQL / PL/SQL     Mongoose ODM
                                        │                   │
                                        ▼                   ▼
                     ┌───────────────────────────┐ ┌───────────────────┐
                     │   Oracle Database (XE)    │ │   MongoDB NoSQL   │
                     │  - Vehicles & Maintenance │ │  - Route Reviews  │
                     │  - Routes & Trips         │ │  - Announcements  │
                     │  - Passengers & Tickets   │ │  - Vehicle Media  │
                     │  - Financial Payments     │ │  - Binary Storage │
                     │  - PL/SQL Stored Routines │ │  - Sentiment Logs │
                     └───────────────────────────┘ └───────────────────┘
```

---

## 🛠 Core Technologies

- **Runtime & Backend:** Node.js (v18+), Express.js (REST API engine)
- **Relational RDBMS:** Oracle Database 19c / 21c XE (via `oracledb` node driver)
- **NoSQL Document Database:** MongoDB (via `mongoose` and official `mongodb` driver)
- **Frontend & Presentation:** Vanilla JavaScript (ES6+), Modern Semantic HTML5, Custom CSS Design System with CSS variables and responsive glassmorphism, FontAwesome, GSAP Animations
- **Modern Client (Preview):** React, TypeScript, Material UI (MUI), Lucide Icons
- **Security & Utilities:** `dotenv` configuration management, CORS policy controls, transactional commit/rollback handlers

---

## 🚀 Key Features

### 1. Public Passenger Experience
- **Interactive Homepage:** Modern hero showcase with instant route lookups, corporate announcements ticker, and dynamic CTA consultation banner.
- **Seat Booking & Reservation:** Interactive step-by-step booking workflow with departure selection, seat selection, fare preview, and passenger detail submission.
- **Route Timetables & Exploration:** Searchable route catalog with origin/destination filtering, distance calculations, and scheduled travel times.
- **Live Travel Updates:** Real-time delay bulletins, weather warnings, and promotional notifications categorized by priority.
- **Passenger Reviews & Ratings:** Star-rating submission system with driver review feedback and public sentiment display.
- **24/7 Help & Support Portal:** Searchable FAQ accordion, direct emergency banner, and multi-channel customer assistance.

### 2. Executive System Portal & Operations
- **Real-Time Operational Dashboard:** Key performance metrics (Active Fleet, Daily Revenue, Today's Scheduled Trips, Passenger Volume) with status filters.
- **Trips Operational Board (Kanban):** Drag-and-inspect visual workflow managing `Scheduled`, `In Progress`, `Completed`, and `Cancelled` trips with automated conflict detection.
- **Fleet Vehicle Directory:** Vehicle lifecycle management (Registration, Type, Capacity, Status) linked to MongoDB document uploads and image attachments.
- **Two-Way Status Synchronization:** Updating passenger booking statuses directly synchronizes trip scheduling across the database, preventing discrepancies.
- **Executive Reports & Analytics:** Instant execution of PL/SQL stored functions (`CalculateTotalRevenue`) and cursor procedures (`GetFrequentRoutes`, `GetPassengerHistory`).
- **Driver Roster & Passenger Auditing:** Complete CRUD management and audit logs for registered drivers, passenger profiles, and payment histories.

---

## 🗄 Database Architecture

### Oracle RDBMS (Relational Engine)

The relational schema coordinates high-integrity transactional entities with check constraints, foreign keys, and identity sequences:

| Table | Primary Key | Key Relationships / Constraints | Description |
|---|---|---|---|
| **`Routes`** | `RouteID` | Unique start & destination locations | Transit corridors, distances, and duration |
| **`Vehicles`** | `VehicleID` | `Status IN ('Active', 'In Maintenance', 'Retired')` | Transport fleet buses, vans, and cars |
| **`Drivers`** | `DriverID` | `Status IN ('Active', 'On Leave', 'Suspended')` | Licensed transport crew and contact info |
| **`Trips`** | `TripID` | Foreign keys to `Routes`, `Vehicles`, `Drivers` | Scheduled journeys with departure/arrival times |
| **`Tickets`** | `TicketID` | Foreign keys to `Trips`, `Passengers` | Seat reservations with `TicketStatus` check constraint |
| **`Passengers`**| `PassengerID`| Unique email and phone contacts | Registered travelers database |
| **`Payments`** | `PaymentID` | Unique foreign key to `Tickets` | Financial audit ledger (`Card`, `Cash`, `Bank Transfer`) |
| **`Maintenance`**| `MaintenanceID`| Foreign key to `Vehicles` | Preventive maintenance schedules and repair costs |

### MongoDB (NoSQL Document Store)

Collections handle schema-flexible data, media attachments, and text-based sentiments:

- **`reviews`**: Passenger ratings (1–5 stars), customer feedback notes, driver rating associations, and route timestamps.
- **`announcements`**: Dynamic broadcasts tagged as `alert`, `info`, or `promo`, with expiration and priority controls.
- **`vehicledocuments`**: Fleet inspection certificates, registration papers, and technical specifications.
- **`resourceimages`**: Fleet vehicle photography and banner images.

### Advanced PL/SQL Components

1. **`CalculateTotalRevenue(p_StartDate, p_EndDate)`**  
   *Stored Function:* Computes completed financial revenue within optional date boundaries using aggregation filters on payments.
2. **`GetFrequentRoutes`**  
   *Cursor Procedure:* Iterates over ticket bookings using explicit PL/SQL cursors to rank the most frequented transit corridors.
3. **`GetPassengerHistory(p_PassengerID)`**  
   *Cursor Audit Procedure:* Scans and compiles complete trip logs, seat numbers, and spend history for specific passenger IDs.

---

## 👥 Team Member Responsibilities

Coursework division as structured in [`project_member_division.txt`](project_member_division.txt):

### 👤 Member 1: Anuththara (Lead Architect & Core Systems)
- **System Architecture & Foundations:** Express application bootstrap, routing hierarchy, Oracle connection pooling (`config/oracle.js`), and global UI styling system (`global.css`).
- **Homepage & Public UI:** Public homepage structure, GSAP animations, consultation banners, and universal 5-column footer.
- **Admin Portal & Dashboard:** Executive Portal Dashboard (`portal-dashboard.css`, `admin-dashboard.js`), KPI metrics, and standalone Admin view (`admin.html`).
- **PL/SQL Engine & Analytics:** Schema design (`schema.sql`), PL/SQL stored function & procedure implementations, and reporting views (`reports.html`, `reports.js`).
- **Fleet & Scheduling:** Vehicle operations, trip scheduling conflict checker, and core transactional controllers (`oracleController.js`).

### 👤 Member 2: Pabasara (Booking & Route Logistics)
- **Ticket Booking System:** Public passenger booking portal (`book.html`, `book.js`, `book.css`), seat allocation workflows, and fare calculations.
- **Admin Booking Management:** Booking administration portal view (`public/system-portal/book.html`, `admin-book.js`).
- **Route Logistics & Timetables:** Public route exploration portal (`routes.html`), route filters, distance calculators, and route management (`system-portal/routes.html`).
- **Travel Announcements:** Live announcements engine (`announcements.html`), category filter tags, and admin broadcast controls (`system-portal/manage-announcements.html`).
- **Database & API Integration:** MongoDB announcement models (`Announcement.js`) and corresponding Express REST routes.

### 👤 Member 3: Pawan (Customer Experience & Document Services)
- **Customer Help & Support Portal:** Full support center (`support.html`, `support.js`, `support.css`), searchable FAQ accordion, emergency contacts, and homepage support links.
- **Passenger Feedback & Reviews (MongoDB):** Public passenger review form (`reviews.html`), star rating UI, driver review cards, and review schemas (`Review.js`, `mongoController.js`).
- **Media & Asset Management:** Vehicle image and document upload portals (`system-portal/manage-images.html`, `admin-media.js`).
- **Directory Views & Testing:** Secondary roster listings for Drivers, Passenger directory, offline payment log views, and MongoDB test database seeder (`seed_mongo.js`).

---

## 🔌 API Endpoints Reference

### Oracle Endpoints (`/api/*`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/routes` | Fetch all routes / Create new route |
| `PUT` / `DELETE`| `/api/routes/:id` | Update / Delete route |
| `GET` / `POST` | `/api/trips` | Fetch all scheduled trips / Create trip |
| `PUT` / `DELETE`| `/api/trips/:id` | Update trip status (cascades to tickets) / Delete trip |
| `GET` / `POST` | `/api/tickets` | List recent tickets / Book a new ticket |
| `PUT` | `/api/tickets/:ticketID/status` | Update ticket status (syncs with Trips board) |
| `GET` / `POST` | `/api/vehicles` | List fleet vehicles / Register vehicle |
| `GET` | `/api/vehicles/available` | List active vehicles currently unassigned |
| `PUT` / `DELETE`| `/api/vehicles/:id` | Update vehicle / Delete vehicle |
| `GET` / `POST` | `/api/drivers` | Fetch drivers list / Onboard new driver |
| `GET` / `POST` | `/api/passengers` | List registered passengers / Register passenger |
| `GET` | `/api/passengers/:id/history` | Generate PL/SQL passenger travel audit |
| `GET` / `POST` | `/api/payments` | View payments history / Record offline payment |
| `GET` | `/api/reports/revenue` | Calculate revenue via PL/SQL function |
| `GET` | `/api/reports/routes` | Get most frequent routes via PL/SQL cursor |

### MongoDB Endpoints (`/api/*`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/reviews` | Retrieve all passenger reviews / Post new review |
| `GET` | `/api/reviews/route/:id` | Get reviews filtered by Route ID |
| `GET` | `/api/reviews/search?q=...` | Full-text search across passenger reviews |
| `GET` / `POST` | `/api/announcements` | Retrieve travel notices / Publish announcement |
| `PUT` / `DELETE`| `/api/announcements/:id` | Edit / Remove announcement |
| `GET` / `POST` | `/api/vehicles/documents`| Retrieve / Upload vehicle document attachments |
| `GET` / `POST` | `/api/media/images` | Fetch / Upload resource images |

---

## 💻 Installation & Getting Started

### Prerequisites
1. **Node.js** (v18.0.0 or higher) and `npm`
2. **Oracle Database** (Oracle XE 19c or 21c running on port `1521`)
3. **MongoDB Community Server** (running locally on port `27017` or via MongoDB Atlas)
4. **Oracle Instant Client** (if required by your OS environment)

### Database Setup & Seeding

1. **Initialize Oracle Relational Schema:**
   Open SQL*Plus, SQL Developer, or your preferred Oracle client and run:
   ```sql
   @client/docs/schema.sql
   @client/docs/seed_oracle.sql
   ```
   *(Alternatively, run the automated seeder: `node seed_oracle.js`)*

2. **Initialize MongoDB Collections & Sample Data:**
   ```bash
   node seed_mongo.js
   ```

### Environment Configuration

Create a `.env` file in the project root based on `.env.example`:
```env
PORT=3000
ORACLE_USER=system
ORACLE_PASSWORD=your_oracle_password
ORACLE_CONN_STRING=localhost:1521/xe
MONGODB_URI=mongodb://127.0.0.1:27017/smartmove
```

### Running the Application

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Express Server:**
   ```bash
   node server.js
   ```

3. **Access the Portals in your Browser:**
   - **Public Passenger Portal:** [http://localhost:3000](http://localhost:3000)
   - **Passenger Booking:** [http://localhost:3000/book.html](http://localhost:3000/book.html)
   - **Route Exploration:** [http://localhost:3000/routes.html](http://localhost:3000/routes.html)
   - **Help & Support:** [http://localhost:3000/support.html](http://localhost:3000/support.html)
   - **System Executive Portal:** [http://localhost:3000/system-portal/index.html](http://localhost:3000/system-portal/index.html)
   - **Trips Operational Board:** [http://localhost:3000/system-portal/trips.html](http://localhost:3000/system-portal/trips.html)
   - **Fleet Management:** [http://localhost:3000/system-portal/vehicles.html](http://localhost:3000/system-portal/vehicles.html)

---

## 🎓 Coursework Information

- **Institution:** Higher Diploma in Software Engineering (HDSE 26.1)
- **Module:** Database Management Systems II (DM-2)
- **Subject:** Hybrid Database Application Engineering (Enterprise Oracle RDBMS + NoSQL MongoDB)
- **Project Title:** SmartMove Transport Solutions

---

&copy; 2026 SmartMove Transport Solutions. Developed for DM-2 Coursework.
