var fs = require('fs');
var dbFile = process.env.DB_FILEPATH;
const base = require('airtable').base('appI6ReVlk9nCsFUB');
const table = 'Raw Applicants';
const view = "Grid view";
module.exports = new class DbHandler {
    constructor() {
        if(!fs.existsSync(dbFile)){
            this.createTables();
        }
        this.db = require("./db");
        this.records = [];
        // this.getAirtableData()
        //     .then(this.populateApplicantDB)
    }

    createTables(){
        
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