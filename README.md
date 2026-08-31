# DevPulse REST API Backend

A production-style RESTful API backend built with Node.js and Express.js to manage users, projects, and task data for developer dashboards.

## Features
- **Health Check Endpoint:** System status and server uptime monitoring.
- **Dashboard Analytics:** Aggregated metrics for total users, projects, and task statuses.
- **CRUD Operations:** Full GET, POST, PATCH, and DELETE operations across user, project, and task entities.
- **Filtering Capabilities:** Query string filtering for tasks based on status and priority.
- **Robust Error Handling:** Input validation middleware and centralized global error handling.
- **Environment Configuration:** Secure environment settings using `dotenv`.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Middleware:** CORS, Express JSON Parser
- **Configuration:** dotenv

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/Palak220704/dev-dashboard-api.git](https://github.com/Palak220704/dev-dashboard-api.git)
   cd dev-dashboard-api