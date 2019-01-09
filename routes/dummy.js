const express = require('express');
const router = express.Router();

const dummyDataInjection = (req,res,next) =>{
    res.locals.dummy = true;
    res.locals.user= { id: 2,
        name: 'Test User',
        email: 'test@test.com',
        password: '$2b$10$7hfzG7l6j9I16IrVmmip6eot.8DxTragVoJEQNJk/Pfnc/FmkHnwK',
        admin: 0,
        alumni: 0,
        month_access: null,
        first_time: 1,
        done: 0,
        monthName: 'January' }
    res.locals.progressStats = {
            completed: 10,
            total: 30,
            perc: 33
        };
    next();
}
module.exports = function(){
    router.use(dummyDataInjection);

    router.get("/dashboard", (req,res)=>{
        res.locals.data = { count: 5,
            essay_score_1_avg: 1.25,
            essay_score_2_avg: 1,
            essay_score_3_avg: 1.25,
            essay_score_avg: 3.5 }
        res.locals.msg = {
            success: "This dummy account is only meant to showcase this website's features. If you are having problems logging in, please contact mahdi@allstarcode.org"
        }
        res.render('dashboard', { title: 'Dashboard' });
    });

    router.get("/rubric",(req,res)=>{
        res.render("rubric",{title:"Rubric"});
    })
    
    router.get("/profile",(req,res)=>{
        res.render("profile",{title:"Profile"});
    })

    router.get("/applicant",(req,res)=>{
        res.locals.applicant = {
            asc_id : "AB1234",
            essay_1: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora atque, veniam molestiae illum similique nam explicabo inventore harum tenetur aliquam at necessitatibus fugiat voluptatum recusandae accusamus quod laboriosam facere error unde dolorum. Commodi quo facilis vel distinctio ullam, consectetur vitae inventore adipisci quis quia voluptatibus quasi architecto repellat esse et officia suscipit doloribus totam voluptates porro fugit, neque non odio. Cupiditate aut ex ratione fuga porro dolorem sequi. Temporibus velit cumque id a in ipsum ullam atque inventore, doloremque dolorem earum exercitationem iste, quod voluptas hic ipsa at aspernatur praesentium vero tempore animi libero eligendi! Ipsa consequuntur culpa commodi sint.",
            essay_2: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora atque, veniam molestiae illum similique nam explicabo inventore harum tenetur aliquam at necessitatibus fugiat voluptatum recusandae accusamus quod laboriosam facere error unde dolorum. Commodi quo facilis vel distinctio ullam, consectetur vitae inventore adipisci quis quia voluptatibus quasi architecto repellat esse et officia suscipit doloribus totam voluptates porro fugit, neque non odio. Cupiditate aut ex ratione fuga porro dolorem sequi. Temporibus velit cumque id a in ipsum ullam atque inventore, doloremque dolorem earum exercitationem iste, quod voluptas hic ipsa at aspernatur praesentium vero tempore animi libero eligendi! Ipsa consequuntur culpa commodi sint.",
            essay_3: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora atque, veniam molestiae illum similique nam explicabo inventore harum tenetur aliquam at necessitatibus fugiat voluptatum recusandae accusamus quod laboriosam facere error unde dolorum. Commodi quo facilis vel distinctio ullam, consectetur vitae inventore adipisci quis quia voluptatibus quasi architecto repellat esse et officia suscipit doloribus totam voluptates porro fugit, neque non odio. Cupiditate aut ex ratione fuga porro dolorem sequi. Temporibus velit cumque id a in ipsum ullam atque inventore, doloremque dolorem earum exercitationem iste, quod voluptas hic ipsa at aspernatur praesentium vero tempore animi libero eligendi! Ipsa consequuntur culpa commodi sint."
        }
        res.render("applicant",{title:"Applicant: AB1234"});
    })
    
    router.post("/applicant/:id",(req,res)=>{
        res.redirect("/dummy/dashboard");
    })

    router.get("/stats",(req,res)=>{
        res.locals.data ={ userApplicants:
             [ { userId: 2,
                 asc_id: 'FL6204',
                 essay_score_1: 2,
                 essay_score_2: 1,
                 essay_score_3: 2,
                 essay_score: 5,
                 comment: 'Very well written!' },
               { userId: 2,
                 asc_id: 'MA6208',
                 essay_score_1: 0,
                 essay_score_2: 0,
                 essay_score_3: 2,
                 essay_score: 2,
                 comment: 'The worst! 😕' },
               { userId: 2,
                 asc_id: 'SP6207',
                 essay_score_1: 1,
                 essay_score_2: 2,
                 essay_score_3: 0,
                 essay_score: 3,
                 comment: 'Nothing new' },
               { userId: 2,
                 asc_id: 'AV6166',
                 essay_score_1: 2,
                 essay_score_2: 1,
                 essay_score_3: 1,
                 essay_score: 4,
                 comment: 'So So Read' },
                 { userId: 2,
                    asc_id: 'ES6301',
                    essay_score_1: null,
                    essay_score_2: null,
                    essay_score_3: null,
                    essay_score: null,
                    comment: null } ],
            userScores:
             { count: 5,
               essay_score_1_avg: 1.25,
               essay_score_2_avg: 1,
               essay_score_3_avg: 1.25,
               essay_score_avg: 3.5 } }

        res.locals.parsedUserScores = { 
            scoreCounts: { '0': 3, '1': 4, '2': 5, null: NaN },
            scoreTotals:
                { 
                    labels: [ 'ES6301', 'MA6208', 'SP6207', 'AV6166', 'FL6204' ],
                    values: [ null, 2, 3, 4, 5 ] 
                },
            scoresByEssay:
            { 'Question #1': { '0': 1, '1': 1, '2': 2, null: NaN },
           'Question #2': { '0': 1, '1': 2, '2': 1, null: NaN },
           'Question #3': { '0': 1, '1': 1, '2': 2, null: NaN } },
            avgScoreByEssay: 
            { 'Question #1': 1, 'Question #2': 0.8, 'Question #3': 1 } 
        }

        res.locals.dataForGraph_scoreTotals = `{"labels":["ES6301","MA6208","SP6207","AV6166","FL6204"],"datasets":[{"label":"Score given","backgroundColor":"#51C1E9","borderColor":"blue","borderWidth":1,"data":[null,2,3,4,5]}]}`
        
        res.locals.dataForGraph_scoresByEssay = `{"labels":["Question #1","Question #2","Question #3"],"datasets":[{"label":"Score of 0","backgroundColor":"#A285dc","borderColor":"purple","borderWidth":1,"stack":"stack0","data":[1,1,1]},{"label":"Score of 1","backgroundColor":"#9dd052","borderColor":"green","borderWidth":1,"stack":"stack1","data":[1,2,1]},{"label":"Score of 2","backgroundColor":"#Ebab24","borderColor":"#FF8800","borderWidth":1,"stack":"stack2","data":[2,1,2]}]}`

        res.render("stats",{title:"User Stats"})
    })

    return router;
}