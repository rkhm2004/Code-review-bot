// bad_auth.js

function authenticateUser(username, password) {
    // VULNERABILITY 1: Hardcoded master credentials
    const masterUser = "admin";
    const masterPass = "password12345";

    if (username === masterUser && password === masterPass) {
        // VULNERABILITY 2: Using eval() which allows Code Injection
        eval("console.log('Logging in user: ' + username)");
        return true;
    } else {
        return false;
    }
}