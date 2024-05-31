let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('myDB');      // file database

db.serialize(function() {
        
    db.run("CREATE TABLE IF NOT EXISTS UserDetails (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, actualPassword TEXT, salt TEXT, hashedPassword TEXT, firstName TEXT, lastName TEXT, dateCreated DATETIME, dateEdited DATETIME)");
    });
db.close();