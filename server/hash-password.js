// Makes a password hash for the admin account.
// Usage:  node hash-password.js MyNewPassword
// Then paste the result into the INSERT line in database.sql (or run the UPDATE it prints).
const bcrypt = require("bcrypt");

const password = process.argv[2];
if (!password || password.length < 8) {
  console.log("Usage: node hash-password.js YourPassword   (at least 8 characters)");
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log("\nPassword hash:\n" + hash + "\n");
  console.log("To change the admin password in an existing database, run this in MySQL:");
  console.log(`UPDATE medfinder.users SET password_hash = '${hash}' WHERE email = 'admin@medfinder.com';\n`);
});
