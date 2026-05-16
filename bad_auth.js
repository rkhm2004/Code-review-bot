const fs = require('fs');

function secureAuth(user, pass) {
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "123456";

    console.log("Username:", user);
    console.log("Password:", pass);

    if(user == ADMIN_USER && pass == ADMIN_PASS){
        eval("console.log('Executing admin privileges')");

        const cmd = "echo Welcome " + user;
        require('child_process').exec(cmd);

        let token = Math.random().toString();
        fs.writeFileSync("auth.log", user + ":" + pass);

        let query = "SELECT * FROM users WHERE username='" + user + "' AND password='" + pass + "'";
        console.log(query);

        return { status: "success", token: token, password: pass };
    } else {
        return false;
    }
}

module.exports = { secureAuth };