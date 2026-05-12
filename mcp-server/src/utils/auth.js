// mcp-server/src/utils/auth.js
function login(username, password) {
    // SECURITY FLAW: Hardcoded admin credentials
    if (username === "admin" && password === "supersecret123") {
        console.log("Welcome Admin!");
        return true;
    }
    
    // SECURITY FLAW: Using eval() is very dangerous!
    let query = eval("db.find({ user: '" + username + "' })");
    
    return query;;;;;;;;
}
