# FuelTrack - Petrol Pump Management

FuelTrack is a petrol pump management system designed to manage daily petrol pump operations, fuel inventory, sales, customer credit, staff, expenses, and business reports.

**Backend:** Django + Django REST Framework + MySQL  
**Frontend:** React + Vite + Tailwind CSS

## Features

### Fuel Inventory
- Tanks aur nozzles ka management
- Fuel stock monitoring
- Tanker deliveries ka record
- Dip measurement se delivery mein fuel ki kami ka hisaab
- Low-stock alerts

### Sales and Billing
- Meter readings se fuel billing
- Server-side fuel rate calculation
- Sales records aur dashboard

### Credit and Payments
- Customer udhaar ka record
- Credit limits
- Customer payments ka management

### Staff Management
- Staff records
- Attendance
- Salary management

### Expenses and Reports
- Business expenses ka record
- Monthly aur yearly reports
- PDF aur Excel report exports
- Dashboard aur alerts

### Users and Roles
- User management
- Role-based permissions for Owner, Manager, and Cashier

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Python, Django, Django REST Framework |
| Database | MySQL |
| API | Django REST Framework |

## Project Structure

```text
FuelTrack/
├── Backend/
│   └── petrolPump/
│       ├── accounts/
│       ├── credit/
│       ├── inventory/
│       ├── petrolPump/
│       ├── reports/
│       ├── sales/
│       ├── staff/
│       ├── manage.py
│       └── requirements.txt
│
├── frontend/
│   ├── public/
│   └── src/
│
├── scripts/
├── README.md
├── TESTING.md
└── run-all-tests.ps1
```

## Local Setup

### Prerequisites

Make sure you have the following installed:

- Python
- Node.js and npm
- MySQL
- Git

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd PETROL-PUMP
```

Replace `YOUR_REPOSITORY_URL` with your GitHub repository URL.

### 2. Backend Setup

From the project root, create a Python virtual environment:

```powershell
python -m venv Backend/venv
```

Activate it:

```powershell
.\Backend\venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
pip install -r Backend/petrolPump/requirements.txt
```

Configure environment variables:

1. Copy `Backend/petrolPump/.env.example`.
2. Rename the copied file to `.env`.
3. Set your local database credentials and other required values.

Make sure the MySQL database configured in `.env` exists.

Navigate to the Django project directory:

```powershell
cd Backend/petrolPump
```

Run database migrations:

```powershell
python manage.py migrate
```

Create an administrator account:

```powershell
python manage.py createsuperuser
```

Start the Django development server:

```powershell
python manage.py runserver
```

### 3. Frontend Setup

Open a separate terminal from the project root.

Navigate to the frontend directory:

```powershell
cd frontend
```

Configure frontend environment variables:

1. Copy `frontend/.env.example`.
2. Rename the copied file to `.env`.
3. Configure the API URL according to your local backend setup.

Install dependencies:

```powershell
npm install
```

Start the frontend development server:

```powershell
npm run dev
```

The frontend development server will display the local URL in the terminal.

## User Roles and Permissions

| Role | Permissions |
|---|---|
| **Owner** | Full system access |
| **Manager** | Sales, deliveries, credit, attendance, expenses, and reports. Cannot manage users, salaries, or fuel rates. |
| **Cashier** | Billing only |

## Testing

Run the project test and verification script from the project root:

```powershell
.\run-all-tests.ps1
```

The script runs backend and frontend tests, build checks, and deployment checks.

For manual testing instructions, see [TESTING.md](TESTING.md).

## Environment Variables and Security

- Do not commit real `.env` files.
- Do not expose database passwords or Django secret keys.
- Use `.env.example` files as configuration templates.
- Use appropriate database credentials for your local environment.
- Production environment variables should be configured separately from local development.

## Project Status

FuelTrack is under development. Features, documentation, and setup instructions may evolve as the project progresses.
