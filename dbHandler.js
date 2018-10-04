const fs = require('fs');
const dbFile = process.env.DB_FILEPATH;
// const dbFile = "./.data/readathon.db";
// const base = require('airtable').base('appI6ReVlk9nCsFUB');
const table = 'Raw Applicants';
const view = "Grid view";
module.exports = new class DbHandler {
    constructor() {

        if(!fs.existsSync(dbFile)){
            this.db = require("./db");
            this.createTables();
        }else{
            this.db = require("./db");
        }
        this.records = [];
        // this.getAirtableData()
        //     .then(this.populateApplicantDB)
    }

    createTables(){
        this.db.exec("CREATE TABLE 'users' ( `id` INTEGER PRIMARY KEY AUTOINCREMENT, `email` TEXT NOT NULL UNIQUE, `salt` TEXT, `password` TEXT NOT NULL, `admin` INTEGER DEFAULT 0, `alumni` INTEGER DEFAULT 0, `month_access` INTEGER )");

    }

    findUser(userID){
        return new Promise((res,rej)=>{
            const sql = 'SELECT * FROM users WHERE id = ? LIMIT 1;';
            this.db.get(sql, userID, function(err, row){
                if (err) return rej(err);
                res(row);
            })
        })
    }

    findUserByEmail(email){
        return new Promise((res,rej)=>{
            const sql = 'SELECT * FROM users WHERE email = ? LIMIT 1;';
            this.db.get(sql, email, function(err, row){
                if (err) return rej(err);
                res(row);
            })
        })
    }

    getUsers(){
        return new Promise((res,rej)=>{
            const sql = 'SELECT id, email, password, admin, alumni, month_access FROM users;';
            this.db.all(sql, function(err, rows){
                if (err) return rej(err);
                res(rows);
            })
        })
    }
    /**
     * Takes "live" records and adds them to local DB, if not already there.
     */
    populateApplicantDB(apiRecords){

    }

    /**
     * Gets "live" records from Airtable DB.
     */
    getAirtableData(){
        this.records = [];
        const self = this;
        return new Promise((res,rej)=>{
            base(table).select({
                view: view
            }).eachPage(function page(records, fetchNextPage) {
                records.forEach(function(record) {
                    self.records.push(record);
                });
                fetchNextPage();
            }, function done(err) {
                if (err) { console.error(err); return; }
                res(self.records);
            });
        })
    }
}