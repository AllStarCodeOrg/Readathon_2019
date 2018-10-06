module.exports = class Applicant{
    constructor({record, airtable_id, asc_id, month_applied, essay_1, essay_2, essay_3}){
        this.record         = record;
        this.airtable_id    = airtable_id;
        this.asc_id         = typeof asc_id==="object" ? "ERROR" : asc_id;
        this.month_applied  = month_applied-1;
        this.essay_1        = essay_1;
        this.essay_2        = essay_2;
        this.essay_3        = essay_3;
    }
}