const fs = require('fs');
const dbFile = process.env.DB_FILEPATH;
const base = require('airtable').base('appI6ReVlk9nCsFUB');
const table = 'Raw Applicants';
const view = "Readathon";
const Applicant = require("./models/applicant");

const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = new class DbHandler {
    constructor() {

        if(!fs.existsSync(dbFile)){
            this.db = require("./db");
            this.createTables();
        }else{
            this.db = require("./db");
        }
        this.getAirtableDataLoop();
    }
    
    createTables(){
        this.db.exec("CREATE TABLE 'users' ( `id` INTEGER PRIMARY KEY AUTOINCREMENT, `name` TEXT, `email` TEXT NOT NULL UNIQUE, `password` TEXT NOT NULL, `admin` INTEGER DEFAULT 0, `alumni` INTEGER DEFAULT 0, `month_access` INTEGER, `first_time` INTEGER DEFAULT 0 );");
        this.db.exec(`CREATE TABLE 'applicants' ('airtable_id' TEXT UNIQUE NOT NULL, 'asc_id' TEXT UNIQUE NOT NULL, 'month_applied' INTEGER, 'essay_1' TEXT, 'essay_2' TEXT, 'essay_3' TEXT, 'read_count' INTEGER DEFAULT 0, 'complete' INTEGER DEFAULT 0);`);
        this.db.exec(`CREATE TABLE 'readScores' ('userId' INTEGER, 'asc_id' TEXT,'essay_score_1' INTEGER, 'essay_score_2' INTEGER, 'essay_score_3' INTEGER ,'essay_score' INTEGER, 'comment' TEXT);`);
    }

    getAirtableDataLoop(){
        this._getAirtableDataLoop();
        setInterval(()=>this._getAirtableDataLoop(), 1000 * 60 * 60); // retrieves data every hour
    }

    _getAirtableDataLoop(){
        this.applicants = [];
        this.getAirtableData()
            .then(records=>this.populateApplicantDB(records)
                // .then(()=>this.keepOnlyLastMonthApplicants())
            )
            .catch(err=>console.log(err));
    }

    /**
     * Returns the applicants that have applied last month.
     */
    getLastMonthApplicants(){
        let lastMonth = new Date().getMonth();
        if(lastMonth === 0){
            lastMonth = 12;
        }
        return new Promise((res,rej)=>{
            const sql = 'SELECT * FROM applicants WHERE month_applied = ?;';
            this.db.all(sql, lastMonth, function(err, rows){
                if (err) return rej(err);
                res(rows);
            })
        })
    }

    keepOnlyLastMonthApplicants(){
        let lastMonth = new Date().getMonth();
        if(lastMonth === 0){
            lastMonth = 12;
        }
        return new Promise((res,rej)=>{
            const sql = "DELETE FROM applicants WHERE month_applied <> ?;";
            this.db.run(sql, lastMonth, err => {
                if(err) return rej(err);
                res();
            })
        })
    }

    /**
     * Retrieves asc_id of next applicant for user to read.
     */
    async getNextApplicant(user){
        const userId = user.id;
        const incompleteApplicant_asc_id = await this.findIncompleteApplicant(userId);

        if(incompleteApplicant_asc_id){
            return incompleteApplicant_asc_id;
        }

        const availApplicantASCID = await this.getAvailableApplicant(user);
        return availApplicantASCID;
    }
    
    getAvailableApplicant(user){
        const self = this;
        let sql;
        const userId = user.id;
        if(user.alumni===1){
            sql = `SELECT asc_id FROM applicants WHERE read_count<3 AND asc_id NOT IN (SELECT readScores.asc_id from users JOIN readScores ON users.id=readScores.userId WHERE users.alumni=1 GROUP BY readScores.asc_id)`;
            return new Promise((res,rej)=>{
                this.db.get(sql, function(err, row){
                    if (err) return rej(err);
                    if(!row){
                        return res(row);
                    }else{
                        const asc_id = row.asc_id;
                        self.holdApplicant(userId, asc_id)
                            .then(()=>res(asc_id))
                    }
                })
            })
        }else{
            sql = `SELECT asc_id FROM applicants WHERE asc_id NOT IN (SELECT applicants.asc_id FROM applicants LEFT JOIN readScores ON applicants.asc_id=readScores.asc_id WHERE readScores.userId=? OR applicants.read_count > 2);`;
            return new Promise((res,rej)=>{
                this.db.get(sql, userId, function(err, row){
                    if (err) return rej(err);
                    if(!row){
                        return res(row);
                    }else{
                        const asc_id = row.asc_id;
                        self.holdApplicant(userId, asc_id)
                            .then(()=>res(asc_id))
                    }
                })
            })        
        }
    }

    holdApplicant(userId,asc_id){
        return new Promise((res,rej)=>{
            const sql = 'INSERT INTO readScores (userID, asc_id) VALUES ($userId,$asc_id); UPDATE applicants SET read_count=(SELECT read_count FROM applicants WHERE asc_id=$asc_id)+1 WHERE asc_id=$asc_id;';
            const statement = this.db.prepare(sql);
            statement.run({$userId:userId, $asc_id:asc_id}, function(err){
                if (err) return rej(err);
                res();
            });
            statement.finalize();
        })
    }

    findIncompleteApplicant(userId){
        return new Promise((res,rej)=>{
            const sql = 'SELECT asc_id FROM readScores WHERE userId = ? AND essay_score IS NULL;';
            this.db.get(sql, userId, function(err, row){
                if (err) return rej(err);
                if(!row) return res(row);
                res(row.asc_id); // undefined if not found
            })
        })
    }

    /**
     * Returns applicant by their ASC ID.
     */
    getApplicantByASCID(asc_id){
        return new Promise((res,rej)=>{
            const sql = "SELECT * FROM applicants WHERE asc_id=?;";
            this.db.get(sql,asc_id,(err,row)=>{
                if(err) return rej(err);
                res(row);
            });
        })
    }


    getCompleteReadScores(asc_id){
        return new Promise((res,rej)=>{
            const sql = "SELECT * FROM readScores WHERE asc_id=? AND essay_score NOT NULL;";
            this.db.all(sql, asc_id, function(err,rows){
                if(err) return rej(err);
                res(rows);
            });
        });
    }

    /**
     * Updates the local DB.
     * If there are 3 reads, the airtable DB is also updated.
     */
    async incrementApplicantReads(userId, asc_id, scores, comment){
        const readScoresUpdated = await this.updateUserReadScore(userId, asc_id, scores, comment);
        if(!readScoresUpdated) throw new Error("Could not update user: " + userId);

        const completeReadScores = await this.getCompleteReadScores(asc_id);
        if(completeReadScores.length < 3) return null;

        const result = await this.completeRecord(asc_id, completeReadScores);
        return result;
    }

    /**
     * Updates a user's readScore in local DB.
     */
    updateUserReadScore(userId, asc_id, scores, comment){
        return new Promise((res,rej)=>{
            const sql = "UPDATE readScores SET essay_score_1=$essay_score_1,essay_score_2=$essay_score_2,essay_score_3=$essay_score_3,essay_score=$essay_score, comment=$comment WHERE userId=$userId AND asc_id=$asc_id";
            this.db.run(sql,{
                $userId: userId,
                $asc_id: asc_id,
                $comment: comment,
                $essay_score_1: scores.essay_score_1,
                $essay_score_2: scores.essay_score_2,
                $essay_score_3: scores.essay_score_3,
                $essay_score: scores.essay_score_1+scores.essay_score_2+scores.essay_score_3
            },function(err){
                if(err) return rej(err);
                res(this.changes > 0); // true if changes occured
            })
        });
    }

    /**
     * Updates Airtable DB and completes applicant in local DB.
     */
    async completeRecord(asc_id, completeReadScores){
        const record = this.findAirtableRecordByASCID(asc_id);
        if(!record) throw new Error("Could not find Airtable record: " + asc_id);

        const fields = {
            essay_score_1: 0,
            essay_score_2: 0,
            essay_score_3: 0
        }

        const keys = Object.keys(fields);
        for(const readScore of completeReadScores){
            for(const key of keys){
                fields[key] += readScore[key];
            }
        }
        fields.readathon_comments = completeReadScores.map(readScore=>readScore.comment).join(". ");

        const api_result = record.updateFields(fields);
        if(api_result.error){
            console.log("Error updating Airtable: ", api_result.message);
            throw api_result;
        } 

        const applicantCompleted = await this.completeApplicant(asc_id);
        if(applicantCompleted===0) throw new Error("Could not update applicant: " + asc_id);
        return applicantCompleted;
    }

    /**
     * Set's applicant's status to complete.
     */
    completeApplicant(asc_id){
        return new Promise((res,rej)=>{
            const sql = "UPDATE applicants SET complete=1 WHERE asc_id=?";
            this.db.run(sql,asc_id, function(err){
                if(err) throw err;
                res(this.changes > 0); // true if changes occured
            })
        });
    }

    /**
     * Returns live airtable record. 
     */
    findAirtableRecordByASCID(asc_id){
        const applicant = this.applicants.find(applicant=>applicant.asc_id===asc_id);
        if(!applicant) return applicant;
        return applicant.record;
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
            const sql = 'SELECT id, name, email, admin, alumni, month_access FROM users;';
            this.db.all(sql, function(err, rows){
                if (err) return rej(err);
                res(rows);
            })
        })
    }

    addNewUser({id, name, email, password, admin, alumni, month_access}){
        const self = this;
        return new Promise((res, rej)=>{    
            bcrypt.hash(password, saltRounds, function(err, hash){
                if(err) return rej(err);
                const sql ="INSERT INTO users (name, email, password, admin, alumni, month_access) VALUES ($name, $email, $password, $admin, $alumni, $month_access);";
                self.db.run(sql, {
                    $id: id,
                    $name: name,
                    $email: email,
                    $password: hash,
                    $admin: admin,
                    $alumni: alumni,
                    $month_access: month_access
                }, function(err){
                    if(err) return rej(err);
                    res(this.lastID);
                });
            })
        })
    }

    updateUser({id, name, email, password, admin, alumni, month_access}){
        const self = this;
        if(password){
                return new Promise((res, rej)=>{    
                    bcrypt.hash(password, saltRounds, function(err, hash){
                        if(err) return rej(err);
                        const sql ="UPDATE users SET name=$name, email=$email, password=$password, admin=$admin, alumni=$alumni, month_access=$month_access WHERE id = $id";
                        self.db.run(sql, {
                            $id: id,
                            $name: name,
                            $email: email,
                            $password: hash,
                            $admin: admin,
                            $alumni: alumni,
                            $month_access: month_access
                        }, function(err){
                            if(err) return rej(err);
                            self.findUser(id)
                                .then(res)
                                .catch(rej);
                        });
                    })
                })
        }else{
            return new Promise((res, rej)=>{    
                const sql ="UPDATE users SET name = $name, email=$email, admin=$admin, alumni=$alumni, month_access=$month_access WHERE id = $id";
                self.db.run(sql, {
                    $id: id,
                    $name: name,
                    $email: email,
                    $admin: admin,
                    $alumni: alumni,
                    $month_access: month_access
                }, function(err){
                    if(err) return rej(err);
                    self.findUser(id)
                        .then(res)
                        .catch(rej);
                });
            })
        }
    }

    setUserVisited(userID){
        return new Promise((res, rej)=>{    
            const sql ="UPDATE users SET first_time = 1 WHERE id = ?";
            this.db.run(sql, userID, function(err){
                if(err) return rej(err);
                res();
            });
        })
    }

    /**
     * Returns Applicant Object parsed from API Record.
     */
    parseAirtableRecord(apiRecord){
        return new Applicant({
            record:apiRecord,
            airtable_id: apiRecord.id,
            asc_id: apiRecord.fields["asc_id"],
            month_applied: apiRecord.fields["month_received_int"],
            essay_1: apiRecord.fields["essay_1"],
            essay_2: apiRecord.fields["essay_2"],
            essay_3: apiRecord.fields["essay_3"]
        });
    }

    getApplicantByAirtableID(airtable_id){
        return new Promise((res,rej)=>{
            const sql = "SELECT * FROM applicants WHERE airtable_id=?;";
            this.db.get(sql,airtable_id,(err,row)=>{
                if(err) return rej(err);
                res(row);
            });
        })
    }

    /**
     * Takes "live" records and adds them to local DB, if not already there.
     */
    async populateApplicantDB(apiRecords){
        if(apiRecords.length===0) return;
        this.applicants = apiRecords.map(this.parseAirtableRecord);
        let sql = "INSERT INTO applicants (airtable_id, asc_id, month_applied, essay_1, essay_2, essay_3) VALUES";

        // INSERTING MULTIPLE VALUES AT ONCE
        const sqlParams = [];
        const paramInject = [];
        for(const applicant of this.applicants){
            // don't want duplicates
            const foundApplicant = await this.getApplicantByAirtableID(applicant.airtable_id);
            if(foundApplicant) continue;
            
            paramInject.push("(?,?,?,?,?,?)");
            
            sqlParams.push(applicant.airtable_id);
            sqlParams.push(applicant.asc_id);
            sqlParams.push(applicant.month_applied-1);
            sqlParams.push(applicant.essay_1);
            sqlParams.push(applicant.essay_2);
            sqlParams.push(applicant.essay_3);
        }

        if(paramInject.length===0) return;
        sql += paramInject.join(",");
        const confirmation = await new Promise((res,rej)=>{
            this.db.run(sql, sqlParams, err => {
                if(err) return rej(err);
                res(true);
            })
        })
        return confirmation;
    }

    /**
     * Gets "live" records from Airtable DB.
     */
    getAirtableData(){
        const output = [];
        return new Promise((res,rej)=>{
            base(table).select({
                view: view
            }).eachPage(function page(records, fetchNextPage) {
                records.forEach(function(record) {
                    output.push(record);
                });
                fetchNextPage();
            }, function done(err) {
                if (err) return rej(err);
                res(output);
            });
        })
    }
}