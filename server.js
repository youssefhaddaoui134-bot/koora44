// =============================================
// FOOTBALL LIVE SERVER
// =============================================

require("dotenv").config();

const express = require("express");
const path = require("path");

require.extensions[".ts"] = require.extensions[".js"];

const app = express();


// =============================================
// SETTINGS
// =============================================

const PORT = process.env.PORT || 8000;

const GOAL_API_KEY =
    process.env.GOAL_API_KEY;

const HAS_API_KEY =
    Boolean(GOAL_API_KEY) &&
    GOAL_API_KEY !== "YOUR_GOAL_API_KEY_HERE";

const API_URL =
    "https://api.goal-api.com/v1";


// =============================================
// MIDDLEWARE
// =============================================

app.use(
    express.json()
);


// =============================================
// STATIC FILES
// =============================================

app.use(
    express.static(
        __dirname
    )
);


// =============================================
// API KEY CHECK
// =============================================

if (!HAS_API_KEY) {

    console.log("");
    console.log("=================================");
    console.log("❌ GOAL_API_KEY غير موجود");
    console.log("ضع GOAL_API_KEY في ملف .env");
    console.log("=================================");
    console.log("");

}


// =============================================
// LOAD TRANSLATIONS
// =============================================

let translations = {

    teams: {},

    leagueIds: {},

    leagueCountry: {},

    leagues: {},

    countries: {}

};


try {

    const loadedTranslations =
        require("./translations.js");

    const manualTranslations =
        require("./lib/translations.ts");


    translations = {

        teams:
            {
                ...(loadedTranslations.teams || {}),
                ...(manualTranslations.teamTranslations || {})
            },


        leagueIds:
            loadedTranslations.leagueIds || {},


        leagueCountry:
            loadedTranslations.leagueCountry || {},


        leagues:
            {
                ...(loadedTranslations.leagues || {}),
                ...(manualTranslations.leagueTranslations || {})
            },


        countries:
            loadedTranslations.countries || {}

    };


    console.log(
        "✅ translations.js تم تحميله بنجاح"
    );


    console.log(
        "⚽ عدد الفرق:",
        Object.keys(
            translations.teams
        ).length
    );


    console.log(
        "🏆 عدد البطولات حسب ID:",
        Object.keys(
            translations.leagueIds
        ).length
    );


    console.log(
        "🌍 عدد البطولات حسب الدولة:",
        Object.keys(
            translations.leagueCountry
        ).length
    );


}
catch (error) {

    console.error("");

    console.error(
        "❌ خطأ في تحميل translations.js"
    );

    console.error(
        error.message
    );

    console.error("");

}


// =============================================
// NORMALIZE TEXT
// تنظيف النص قبل المقارنة
// =============================================

function normalizeName(name) {

    if (!name) {

        return "";

    }


    return String(name)

        .trim()

        .toLowerCase()

        .replace(/\s+/g, " ")

        .replace(/[’'`]/g, "")

        .replace(/-/g, " ");

}


// =============================================
// FIND TRANSLATION
// =============================================

function findTranslation(
    object,
    name
) {

    if (
        !object ||
        !name
    ) {

        return null;

    }


    // =========================================
    // DIRECT SEARCH
    // =========================================

    if (
        object[name]
    ) {

        return object[name];

    }


    // =========================================
    // NORMALIZED SEARCH
    // =========================================

    const normalizedName =
        normalizeName(name);


    for (
        const key of Object.keys(object)
    ) {

        if (
            normalizeName(key)
            ===
            normalizedName
        ) {

            return object[key];

        }

    }


    return null;

}


// =============================================
// TRANSLATE TEAM
// =============================================

function translateTeam(name) {

    if (!name) {

        return name;

    }


    const translated =
        findTranslation(
            translations.teams,
            name
        );

    if (!translated) {
        console.warn(
            `ترجمة الفريق غير موجودة، سيتم عرض الاسم الأصلي: ${name}`
        );
    }


    return (
        translated ||
        name
    );

}


// =============================================
// TRANSLATE COUNTRY
// =============================================

function translateCountry(name) {

    if (!name) {

        return name;

    }


    const translated =
        findTranslation(
            translations.countries,
            name
        );


    return (
        translated ||
        name
    );

}


// =============================================
// TRANSLATE LEAGUE
//
// الأولوية:
//
// 1️⃣ League ID
// 2️⃣ Country + League Name
// 3️⃣ League Name
// 4️⃣ Original Name
//
// =============================================

function translateLeague(
    leagueId,
    leagueName,
    country
) {

    if (!leagueName) {

        return leagueName;

    }


    // =========================================
    // 1 - TRANSLATE BY LEAGUE ID
    // =========================================

    if (
        translations.leagueIds &&
        translations.leagueIds[leagueId]
    ) {

        return translations.leagueIds[
            leagueId
        ];

    }


    // =========================================
    // 2 - TRANSLATE BY COUNTRY + NAME
    // =========================================

    const normalizedLeague =
        normalizeName(
            leagueName
        );


    const normalizedCountry =
        normalizeName(
            country
        );


    const countryKey =
        `${normalizedCountry}:${normalizedLeague}`;


    if (
        translations.leagueCountry &&
        translations.leagueCountry[countryKey]
    ) {

        return translations.leagueCountry[
            countryKey
        ];

    }


    // =========================================
    // 3 - TRANSLATE BY LEAGUE NAME
    // =========================================

    const translated =
        findTranslation(
            translations.leagues,
            leagueName
        );


    if (
        translated
    ) {

        return translated;

    }


    // =========================================
    // 4 - ORIGINAL NAME
    // =========================================

    return leagueName;

}


// =============================================
// MATCH STATUS
// =============================================

function getMatchStatus(status) {

    const short =
        typeof status === "string"
            ? status
            : status?.short;


    // =========================================
    // LIVE
    // =========================================

    const liveStatuses = [

        "1H",

        "HT",

        "2H",

        "ET",

        "BT",

        "P",

        "INT",

        "LIVE",

        "IN_PLAY",

        "PAUSED"

    ];


    if (
        liveStatuses.includes(short)
    ) {

        return "live";

    }


    // =========================================
    // FINISHED
    // =========================================

    const finishedStatuses = [

        "FT",

        "AET",

        "PEN",

        "AWARDED"

    ];


    if (
        finishedStatuses.includes(short)
    ) {

        return "finished";

    }


    // =========================================
    // POSTPONED
    // =========================================

    const postponedStatuses = [

        "PST",

        "CANC",

        "ABD",

        "AWD",

        "WO",

        "SUSPENDED",

        "CANCELLED"

    ];


    if (
        postponedStatuses.includes(short)
    ) {

        return "postponed";

    }


    return "scheduled";

}


// =============================================
// CACHE
// لتقليل استهلاك API
// =============================================

const cache =
    new Map();


// مدة Cache: 5 دقائق

const CACHE_TIME =
    5 * 60 * 1000;

const TARGET_FIXTURES_CACHE_TIME =
    5 * 60 * 1000;

const leagueCatalogCache = {
    time: 0,
    data: []
};

const targetFixturesCache = new Map();

const TARGET_LEAGUES = [
    { name: "Premier League", country: "England" },
    { name: "La Liga", country: "Spain" },
    { name: "Serie A", country: "Italy" },
    { name: "Bundesliga", country: "Germany" },
    { name: "Ligue 1", country: "France" },
    { name: "Eredivisie", country: "Netherlands" },
    { name: "Primeira Liga", country: "Portugal" },
    { name: "First Division A", country: "Belgium" },
    { name: "Süper Lig", country: "Turkey" },
    { name: "Super League 1", country: "Greece" },
    { name: "UEFA Champions League", country: "Europe" },
    { name: "UEFA Europa League", country: "Europe" },
    { name: "UEFA Conference League", country: "Europe" },
    { name: "CAF Champions League", country: "intl" },
    { name: "CAF Confederation Cup", country: "intl" }
];

async function goalApiJson(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${GOAL_API_KEY}`,
            Accept: "application/json"
        }
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(
            `GOAL API returned ${response.status}`
        );
        error.status = response.status;
        throw error;
    }

    return data;
}

async function getTargetLeagues() {
    if (Date.now() - leagueCatalogCache.time < 60 * 60 * 1000) {
        return leagueCatalogCache.data;
    }

    const leagues = [];
    const limit = 100;

    for (let offset = 0; ; offset += limit) {
        const data = await goalApiJson(
            `${API_URL}/leagues?limit=${limit}&offset=${offset}`
        );
        const page = Array.isArray(data.data) ? data.data : [];

        leagues.push(...page);

        if (!data.pagination?.hasMore || page.length === 0) {
            break;
        }
    }

    const targets = leagues.filter(league =>
        league.isActive !== false &&
        TARGET_LEAGUES.some(target =>
            target.name === league.name &&
            target.country === league.countryName
        )
    );

    TARGET_LEAGUES.forEach(target => {
        if (!targets.some(league =>
            league.name === target.name &&
            league.countryName === target.country
        )) {
            console.error(
                `المسابقة غير موجودة في GOAL API: ${target.name} (${target.country})`
            );
        }
    });

    leagueCatalogCache.time = Date.now();
    leagueCatalogCache.data = targets;

    return targets;
}

async function getTargetFixtures(date) {
    const cached = targetFixturesCache.get(date);

    if (cached && Date.now() - cached.time < TARGET_FIXTURES_CACHE_TIME) {
        return cached.data;
    }

    const leagues = await getTargetLeagues();
    const fixtures = [];

    for (const league of leagues) {
        const leagueName = `${league.name} (${league.countryName})`;
        let offset = 0;

        try {
            for (;;) {
                const data = await goalApiJson(
                    `${API_URL}/leagues/${encodeURIComponent(league.id)}/fixtures` +
                    `?from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}` +
                    `&limit=100&offset=${offset}`
                );
                const page = Array.isArray(data.data) ? data.data : [];

                fixtures.push(...page);

                if (!data.pagination?.hasMore || page.length === 0) {
                    break;
                }

                offset += data.pagination.limit || page.length;
            }
        }
        catch (error) {
            console.error(
                `تعذر جلب ${leagueName}: ${error.message}`
            );

            if (error.status === 429) {
                console.error(
                    `تم إيقاف pagination للمسابقة ${leagueName} بسبب rate limit (429)`
                );
            }
        }
    }

    const fixtureIds = new Set();
    const uniqueFixtures = fixtures.filter(fixture => {
        if (!fixture.id || fixtureIds.has(fixture.id)) {
            return !fixture.id;
        }

        fixtureIds.add(fixture.id);
        return true;
    });

    targetFixturesCache.set(date, {
        time: Date.now(),
        data: uniqueFixtures
    });

    return uniqueFixtures;
}


// =============================================
// LEAGUE PRIORITY
// الدوريات المهمة تظهر أولاً
// =============================================

const leaguePriority = {

    // =========================================
    // EUROPE
    // =========================================

    "دوري أبطال أوروبا": 1,

    "الدوري الإنجليزي الممتاز": 2,

    "الدوري الإسباني": 3,

    "الدوري الألماني": 4,

    "الدوري الإيطالي": 5,

    "الدوري الفرنسي": 6,


    // =========================================
    // MOROCCO / ARAB
    // =========================================

    "البطولة المغربية الاحترافية": 7,

    "الدوري المصري الممتاز": 8,

    "الدوري السعودي للمحترفين": 9,


    // =========================================
    // AFRICA
    // =========================================

    "دوري أبطال إفريقيا": 10,

    "كأس الكونفدرالية الإفريقية": 11,

    "كأس السوبر الإفريقي": 12,


    // =========================================
    // EUROPE CUPS
    // =========================================

    "الدوري الأوروبي": 13,

    "دوري المؤتمر الأوروبي": 14,

    "كأس السوبر الأوروبي": 15,


    // =========================================
    // INTERNATIONAL
    // =========================================

    "كأس العالم": 16,

    "كأس العالم للأندية": 17,

    "كأس أمم إفريقيا": 18,

    "كأس أمم إفريقيا للمحليين": 19,


    // =========================================
    // OTHER IMPORTANT
    // =========================================

    "الدوري البرتغالي": 20,

    "الدوري الهولندي": 21,

    "الدوري التركي": 22,

    "الدوري البلجيكي": 23

};


// =============================================
// SORT LEAGUES
// =============================================

function sortLeagues(leagues) {

    return leagues.sort(

        (
            a,
            b
        ) => {


            const priorityA =
                leaguePriority[
                    a.leagueName
                ]
                ??
                9999;


            const priorityB =
                leaguePriority[
                    b.leagueName
                ]
                ??
                9999;


            // =================================
            // IMPORTANT LEAGUES FIRST
            // =================================

            if (
                priorityA !== priorityB
            ) {

                return (
                    priorityA -
                    priorityB
                );

            }


            // =================================
            // SAME PRIORITY
            // SORT ALPHABETICALLY
            // =================================

            return (
                a.leagueName ||
                ""
            )
            .localeCompare(

                b.leagueName ||
                "",

                "ar"

            );

        }

    );

}


// =============================================
// SORT MATCHES
// =============================================

function sortMatches(matches) {

    return matches.sort(

        (
            a,
            b
        ) => {

            return (
                a.timestamp ||
                0
            )
            -
            (
                b.timestamp ||
                0
            );

        }

    );

}


// =============================================
// GET FIXTURES
// =============================================

app.get(

    "/api/fixtures",

    async (
        req,
        res
    ) => {


        try {


            // =================================
            // CHECK API KEY
            // =================================

            if (!HAS_API_KEY) {

                return res
                .status(500)
                .json({

                    success:

                        false,


                    error:

                        "GOAL_API_KEY غير موجود في ملف .env"

                });

            }


            // =================================
            // GET DATE
            // =================================

            const date =
                req.query.date;


            if (!date) {

                return res
                .status(400)
                .json({

                    success:

                        false,


                    error:

                        "يجب إرسال التاريخ"

                });

            }


            // =================================
            // VALIDATE DATE
            // =================================

            const validDate =
                /^\d{4}-\d{2}-\d{2}$/;


            if (
                !validDate.test(date)
            ) {

                return res
                .status(400)
                .json({

                    success:

                        false,


                    error:

                        "صيغة التاريخ يجب أن تكون YYYY-MM-DD"

                });

            }


            // =================================
            // CHECK CACHE
            // =================================

            const cached =
                cache.get(date);


            if (
                cached &&
                (
                    Date.now()
                    -
                    cached.time
                    <
                    CACHE_TIME
                )
            ) {

                console.log(
                    `📦 Cache used: ${date}`
                );


                return res.json(
                    cached.data
                );

            }


            console.log("");
            console.log(
                "📅 جاري جلب مباريات:",
                date
            );


            // =================================
            // API REQUEST
            // =================================

            const apiResponse =
                await fetch(
                    `${API_URL}/fixtures/date/${encodeURIComponent(date)}`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${GOAL_API_KEY}`,
                            Accept: "application/json"
                        }
                    }
                );

            let data;

            try {
                data = await apiResponse.json();
            }
            catch (error) {
                throw new Error("GOAL API لم ترجع JSON صحيح");
            }

            if (!apiResponse.ok) {
                const statusMessages = {
                    401: "مفتاح GOAL_API_KEY غير صالح أو غير مصرح به",
                    429: "تم تجاوز حد طلبات GOAL API",
                    500: "خطأ داخلي في GOAL API",
                    502: "GOAL API غير متاحة مؤقتًا",
                    503: "GOAL API غير متاحة مؤقتًا"
                };

                console.error("GOAL API Error Status:", apiResponse.status);
                console.error("GOAL API Error Data:", data);

                return res
                    .status(apiResponse.status)
                    .json({
                        success: false,
                        error: statusMessages[apiResponse.status]
                            || "خطأ من GOAL API",
                        status: apiResponse.status,
                        details: data
                    });
            }


            // =================================
            // FIXTURES
            // =================================

            const events =
                Array.isArray(data)
                    ? data
                    : data.fixtures ||
                        data.data?.fixtures ||
                        (Array.isArray(data.data) ? data.data : []) ||
                        [];

            const targetEvents = await getTargetFixtures(date);
            const eventIds = new Set(
                events.map(event => event.id).filter(Boolean)
            );

            targetEvents.forEach(event => {
                if (!event.id || !eventIds.has(event.id)) {
                    events.push(event);
                    eventIds.add(event.id);
                }
            });

            const fixtures =
                events.map(event => {

                    const homeTeam =
                        event.homeTeam || event.home || {};

                    const awayTeam =
                        event.awayTeam || event.away || {};

                    const tournament =
                        event.competition || event.league || event.tournament || {};

                    const category =
                        tournament.country || event.countryName || event.country || {};

                    const status =
                        event.matchStatus || event.status || {};

                    const eventDate =
                        event.kickoffUtc ||
                        event.startTime ||
                        event.date ||
                        null;

                    const homeScore =
                        event.homeTeamScore ??
                        event.homeTeamFtScore ??
                        event.homeScore ??
                        event.score?.home ??
                        event.home?.score;

                    const awayScore =
                        event.awayTeamScore ??
                        event.awayTeamFtScore ??
                        event.awayScore ??
                        event.score?.away ??
                        event.away?.score;

                    const statusShort =
                        event.matchLive === true ||
                            status === "live" ||
                            status.type === "live"
                            ? "LIVE"
                            : status === "finished" ||
                                status === "ft" ||
                                status.type === "finished"
                                ? "FT"
                                : status === "canceled" ||
                                    status === "postponed" ||
                                    status.type === "canceled" ||
                                    status.type === "postponed"
                                    ? "PST"
                                    : "NS";

                    const homeWinner =
                        homeScore > awayScore
                            ? true
                            : awayScore > homeScore
                                ? false
                                : null;

                    const awayWinner =
                        awayScore > homeScore
                            ? true
                            : homeScore > awayScore
                                ? false
                                : null;

                    return {

                        league: {
                            id: event.leagueId || tournament.id || tournament.competitionId,
                            name: event.leagueName || tournament.name || "بطولة غير معروفة",
                            country: category.name || category || "International",
                            logo: event.leagueLogo || tournament.logo || ""
                        },

                        fixture: {
                            id: event.id || event.fixtureId,
                            date: eventDate,
                            timestamp: eventDate
                                ? Math.floor(Date.parse(eventDate) / 1000)
                                : 0,
                            venue: {
                                name: event.matchStadium || event.venue?.name || event.stadium?.name || ""
                            },
                            status: {
                                short: statusShort,
                                long: status.description || status.type || status || "",
                                elapsed: status.elapsed || null
                            }
                        },

                        teams: {
                            home: {
                                id: event.homeTeamId || homeTeam.id,
                                name: event.homeTeamName || homeTeam.name || homeTeam.teamName,
                                logo: homeTeam.badge || event.teamHomeBadge || homeTeam.logo || homeTeam.crest || "",
                                winner: homeWinner
                            },
                            away: {
                                id: event.awayTeamId || awayTeam.id,
                                name: event.awayTeamName || awayTeam.name || awayTeam.teamName,
                                logo: awayTeam.badge || event.teamAwayBadge || awayTeam.logo || awayTeam.crest || "",
                                winner: awayWinner
                            }
                        },

                        homeTeam: {
                            id: event.homeTeamId || homeTeam.id,
                            name: event.homeTeamName || homeTeam.name || homeTeam.teamName,
                            logo: homeTeam.badge || event.teamHomeBadge || homeTeam.logo || homeTeam.crest || ""
                        },

                        awayTeam: {
                            id: event.awayTeamId || awayTeam.id,
                            name: event.awayTeamName || awayTeam.name || awayTeam.teamName,
                            logo: awayTeam.badge || event.teamAwayBadge || awayTeam.logo || awayTeam.crest || ""
                        },

                        goals: {
                            home: homeScore,
                            away: awayScore
                        },

                        score: {
                            period1: {
                                home: event.homeTeamHalftimeScore ?? event.score?.halftime?.home,
                                away: event.awayTeamHalftimeScore ?? event.score?.halftime?.away
                            },
                            current: {
                                home: homeScore,
                                away: awayScore
                            }
                        }

                    };

                });


            console.log(
                `⚽ عدد المباريات: ${fixtures.length}`
            );


            // =================================
            // GROUP LEAGUES
            // =================================

            const leaguesMap =
                {};


            fixtures.forEach(

                item => {


                    // =============================
                    // LEAGUE DATA
                    // =============================

                    const leagueId =
                        item.league?.id;


                    if (
                        !leagueId
                    ) {

                        return;

                    }


                    const originalLeagueName =
                        item.league?.name
                        ||
                        "بطولة غير معروفة";


                    const originalCountry =
                        item.league?.country
                        ||
                        "International";


                    // =============================
                    // TRANSLATE LEAGUE
                    // =============================

                    const leagueName =
                        translateLeague(

                            leagueId,

                            originalLeagueName,

                            originalCountry

                        );


                    // =============================
                    // TRANSLATE COUNTRY
                    // =============================

                    const country =
                        translateCountry(
                            originalCountry
                        );


                    // =============================
                    // CREATE LEAGUE
                    // =============================

                    if (
                        !leaguesMap[leagueId]
                    ) {

                        leaguesMap[
                            leagueId
                        ] = {

                            // League ID

                            leagueId:


                                leagueId,


                            // Arabic League Name

                            leagueName:


                                leagueName,


                            // Original League Name

                            leagueOriginalName:


                                originalLeagueName,


                            // Country

                            country:


                                country,


                            countryOriginal:


                                originalCountry,


                            // League Logo

                            leagueLogo:


                                item.league?.logo
                                ||
                                "",


                            // Matches

                            matches:


                                []

                        };

                    }


                    // =============================
                    // HOME TEAM
                    // =============================

                    const originalHomeName =
                        item.teams?.home?.name
                        ||
                        "الفريق الأول";


                    const homeName =
                        translateTeam(
                            originalHomeName
                        );


                    // =============================
                    // AWAY TEAM
                    // =============================

                    const originalAwayName =
                        item.teams?.away?.name
                        ||
                        "الفريق الثاني";


                    const awayName =
                        translateTeam(
                            originalAwayName
                        );


                    // =============================
                    // FIXTURE DATA
                    // =============================

                    leaguesMap[
                        leagueId
                    ]
                    .matches
                    .push({

                        // =========================
                        // FIXTURE ID
                        // =========================

                        id:

                            item.fixture?.id,


                        // =========================
                        // DATE
                        // =========================

                        date:

                            item.fixture?.date,


                        // =========================
                        // TIMESTAMP
                        // =========================

                        timestamp:

                            item.fixture?.timestamp,


                        // =========================
                        // VENUE
                        // =========================

                        venue:

                            item.fixture?.venue?.name
                            ||
                            "",


                        // =========================
                        // STATUS
                        // =========================

                        status:

                            getMatchStatus(
                                item.fixture?.status
                            ),


                        statusShort:

                            item.fixture?.status?.short
                            ||
                            "",


                        statusLong:

                            item.fixture?.status?.long
                            ||
                            "",


                        elapsed:

                            item.fixture?.status?.elapsed,


                        // =========================
                        // HOME
                        // =========================

                        home: {

                            id:

                                item.teams?.home?.id,


                            name:

                                homeName,


                            originalName:

                                originalHomeName,


                            logo:

                                item.teams?.home?.logo
                                ||
                                "",


                            winner:

                                item.teams?.home?.winner

                        },


                        // =========================
                        // AWAY
                        // =========================

                        away: {

                            id:

                                item.teams?.away?.id,


                            name:

                                awayName,


                            originalName:

                                originalAwayName,


                            logo:

                                item.teams?.away?.logo
                                ||
                                "",


                            winner:

                                item.teams?.away?.winner

                        },


                        homeTeam: {

                            id:

                                item.teams?.home?.id,


                            name:

                                homeName,


                            logo:

                                item.teams?.home?.logo
                                ||
                                ""

                        },


                        awayTeam: {

                            id:

                                item.teams?.away?.id,


                            name:

                                awayName,


                            logo:

                                item.teams?.away?.logo
                                ||
                                ""

                        },


                        // =========================
                        // GOALS
                        // =========================

                        goals: {

                            home:

                                item.goals?.home,


                            away:

                                item.goals?.away

                        },


                        // =========================
                        // SCORE
                        // =========================

                        score:

                            item.score
                            ||
                            {}

                    });


                }

            );


            // =================================
            // OBJECT TO ARRAY
            // =================================

            let leagues =
                Object.values(
                    leaguesMap
                );


            // =================================
            // SORT MATCHES
            // =================================

            leagues.forEach(

                league => {

                    league.matches =
                        sortMatches(
                            league.matches
                        );

                }

            );


            // =================================
            // SORT LEAGUES
            // =================================

            leagues =
                sortLeagues(
                    leagues
                );


            // =================================
            // FINAL RESULT
            // =================================

            const result = {

                success:

                    true,


                date:

                    date,


                count:

                    fixtures.length,


                leagueCount:

                    leagues.length,


                leagues:

                    leagues

            };


            // =================================
            // SAVE CACHE
            // =================================

            cache.set(

                date,

                {

                    time:

                        Date.now(),


                    data:

                        result

                }

            );


            // =================================
            // CLEAN OLD CACHE
            // =================================

            if (
                cache.size > 10
            ) {

                const oldestKey =
                    cache.keys()
                    .next()
                    .value;


                cache.delete(
                    oldestKey
                );

            }


            console.log(
                `🏆 عدد البطولات: ${leagues.length}`
            );


            console.log(
                "✅ تم إرسال البيانات"
            );


            // =================================
            // RESPONSE
            // =================================

            res.json(
                result
            );


        }
        catch (
            error
        ) {

            console.log("GOAL API Error Status:", error.response?.status);
            console.log("GOAL API Error Data:", error.response?.data);


            console.error("");
            console.error("=================================");
            console.error("❌ SERVER ERROR");
            console.error("=================================");
            console.error(
                error
            );
            console.error("=================================");
            console.error("");


            res
            .status(500)
            .json({

                success:

                    false,


                error:

                    "حدث خطأ في الخادم",


                message:

                    error.message

            });


        }


    }

);


// =============================================
// API TEST
// =============================================

app.get(

    "/api/test",

    (
        req,
        res
    ) => {


        res.json({

            success:

                true,


            message:

                "السيرفر يعمل بنجاح",


            server:

                "Football Live",


            apiKey:

                HAS_API_KEY

                ?

                "موجودة ✅"

                :

                "غير موجودة ❌",


            translations: {

                teams:

                    Object.keys(
                        translations.teams
                    ).length,


                leagueIds:

                    Object.keys(
                        translations.leagueIds
                    ).length,


                leagueCountry:

                    Object.keys(
                        translations.leagueCountry
                    ).length,


                leagues:

                    Object.keys(
                        translations.leagues
                    ).length,


                countries:

                    Object.keys(
                        translations.countries
                    ).length

            },


            cache:

                {

                    items:

                        cache.size,


                    duration:

                        "5 دقائق"

                }

        });


    }

);


// =============================================
// TRANSLATION TEST
// =============================================

app.get(

    "/api/translate",

    (
        req,
        res
    ) => {


        const name =
            req.query.name;


        const country =
            req.query.country;


        const leagueId =
            req.query.leagueId;


        if (!name) {

            return res
            .status(400)
            .json({

                success:

                    false,


                error:

                    "أرسل name"

            });

        }


        res.json({

            success:

                true,


            original:

                {

                    name:

                        name,


                    country:

                        country || "",


                    leagueId:

                        leagueId || ""

                },


            translations:

                {

                    team:

                        translateTeam(
                            name
                        ),


                    league:

                        translateLeague(

                            leagueId,

                            name,

                            country

                        ),


                    country:

                        translateCountry(
                            name
                        )

                }

        });


    }

);


// =============================================
// CACHE CLEAR
// =============================================

app.get(

    "/api/cache/clear",

    (
        req,
        res
    ) => {


        cache.clear();


        res.json({

            success:

                true,


            message:

                "تم حذف Cache بنجاح"

        });


    }

);


// =============================================
// START SERVER
// =============================================

app.listen(

    PORT,

    () => {


        console.log("");
        console.log("==============================================");
        console.log("        ⚽ FOOTBALL LIVE SERVER");
        console.log("==============================================");

        console.log(
            `🌐 Website: http://localhost:${PORT}`
        );

        console.log(
            `🧪 Test: http://localhost:${PORT}/api/test`
        );

        console.log("");

        console.log(

            HAS_API_KEY

            ?

            "🔑 API Key: موجودة ✅"

            :

            "🔑 API Key: غير موجودة ❌"

        );


        console.log("");

        console.log(
            `⚽ Teams: ${
                Object.keys(
                    translations.teams
                ).length
            }`
        );


        console.log(
            `🏆 League IDs: ${
                Object.keys(
                    translations.leagueIds
                ).length
            }`
        );


        console.log(
            `🌍 League Countries: ${
                Object.keys(
                    translations.leagueCountry
                ).length
            }`
        );


        console.log(
            `📦 Cache: 5 دقائق`
        );


        console.log("==============================================");
        console.log("");

    }

);