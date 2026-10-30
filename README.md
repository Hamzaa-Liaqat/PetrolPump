# FuelTrack - Petrol Pump Management

Backend: Django + DRF + MySQL (`Backend/petrolPump`). Frontend: React + Vite + Tailwind (`frontend`).

## Kya kya hai
Tanks aur nozzles, tanker deliveries (dip se kami ka hisaab), billing (meter reading se, server rate lagata hai),
udhaar aur payments (limit ke saath), staff attendance aur tankhwah, kharche, dashboard, alerts,
mahine/saal ki report (PDF aur Excel), users aur roles (owner / manager / cashier).

## Chalana (apne computer par)
1. Backend:
   - `Backend/petrolPump/.env.example` ko `.env` naam se copy karein aur apni values bharein
   - `python -m venv Backend/venv`, activate, `pip install -r Backend/petrolPump/requirements.txt`
   - `python manage.py migrate`, `python manage.py createsuperuser`, `python manage.py runserver`
2. Frontend: `frontend/.env.example` ko `.env` naam se copy karein, phir `npm install` aur `npm run dev`

## Jaanch
`.\run-all-tests.ps1` (backend + frontend tests, build, deploy check). Haath se jaanch: `TESTING.md`.

## Ijazatein
owner: sab kuch. manager: sales, deliveries, credit, attendance, kharche, reports (users/tankhwah/rate nahi).
cashier: sirf billing.