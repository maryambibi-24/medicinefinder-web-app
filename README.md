# MedFinder

React website + Node.js (Express) server + MySQL database.

## Start on Windows
1. Open the XAMPP control panel and start **MySQL**.
2. Run the database script once: open `server/database.sql` in phpMyAdmin (Import) or MySQL Workbench.
3. Double-click **start.bat**. It installs packages, creates `server/.env`, and opens the server and the website.
4. The browser opens the **status page** (http://localhost:5173/status). When the three lines are green, go to http://localhost:5173

## Start by hand
```
cd server
npm install
npm start

cd client
npm install
npm run dev
```
Keep both windows open.

## If something does not work
Open http://localhost:5173/status. It tells you whether the server, the database and the map columns are fine, and what to do if not.
The window that runs the server also prints the reason in plain words.
