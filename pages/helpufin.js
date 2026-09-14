import { navigate } from "../js/router.js";
import { searchVehicles } from "../js/searchAdapter.js";
import { rankVehicles, getPopularityMap, getUserProfile } from "../js/aiEngine.js";
import { calculateMonthly } from "../js/financeEngine.js";

export function HelpufinPage() {

return `

<section class="min-h-screen bg-[#F4F6F9] flex items-center">

    <div class="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10">


<!-- ====================================================== -->
<!-- HELP U FIND WIZARD -->
<!-- ====================================================== -->

<section
    id="helpufind-wizard"
    class="relative overflow-hidden">

            <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px] rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">

              <!-- Welcome Screen -->

<div class="p-6 sm:p-8 lg:p-10 text-center">

    <span class="inline-flex items-center rounded-full border border-[#E48A2F]/30 bg-[#E48A2F]/10 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[#E48A2F]">

        Welcome to Helpufin

    </span>

    <h3 class="mt-3 text-2xl sm:text-3xl lg:text-[34px] font-black leading-tight tracking-tight text-[#08111F]">

        Let's find your perfect vehicle.
    </h3>

    <p class="mt-3 mx-auto max-w-xl text-sm sm:text-[15px] leading-6 text-slate-600">

        You're about to begin a short guided journey.

        We'll ask you 12 simple questions to understand your lifestyle, driving habits and budget before searching the live HUFA marketplace for your best vehicle matches.

    </p>

    <div class="mt-6 mx-auto grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">

        <div class="rounded-xl border border-slate-200 bg-slate-50/60 px-2 py-3 sm:px-4 sm:py-4">

            <div class="text-xl sm:text-3xl font-black leading-none text-[#E48A2F]">
                12
            </div>

            <div class="mt-1.5 text-[11px] sm:text-sm font-semibold text-[#08111F]">
                Questions
            </div>

        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/60 px-2 py-3 sm:px-4 sm:py-4">

            <div class="text-xl sm:text-3xl font-black leading-none text-[#E48A2F]">
                2 min
            </div>

            <div class="mt-1.5 text-[11px] sm:text-sm font-semibold text-[#08111F]">
                Average Time
            </div>

        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/60 px-2 py-3 sm:px-4 sm:py-4">

            <div class="text-xl sm:text-3xl font-black leading-none text-[#E48A2F]">
                Top 3
            </div>

            <div class="mt-1.5 text-[11px] sm:text-sm font-semibold text-[#08111F]">
                Personalised Matches
            </div>

        </div>

    </div>

    <button
    id="helpufind-start"
    class="mt-6 inline-flex items-center justify-center rounded-xl bg-[#E48A2F] px-8 py-3 text-sm sm:text-base font-bold text-[#08111F] shadow-[0_8px_20px_rgba(228,138,47,0.25)] transition duration-300 hover:bg-[#D67E2C]">

        BEGIN MY JOURNEY

    </button>

    <p class="mt-3 text-xs text-slate-500">

        Free to use â€¢ No account required â€¢ No credit checks

    </p>

    <!-- Mobile-only journey rail (desktop uses the right-hand sidebar) -->
    <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left lg:hidden">

        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[#E48A2F]">

            Your Journey

        </div>

        <ol class="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">

            <li class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E48A2F] text-xs font-bold text-[#08111F]">âœ“</span>
                <span class="text-sm font-semibold text-[#08111F]">Profile Started</span>
            </li>

            <li class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">2</span>
                <span class="text-sm font-semibold text-[#08111F]">Lifestyle Analysis</span>
            </li>

            <li class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">3</span>
                <span class="text-sm font-semibold text-[#08111F]">Budget Review</span>
            </li>

            <li class="flex items-center gap-2.5">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">4</span>
                <span class="text-sm font-semibold text-[#08111F]">Recommendations</span>
            </li>

        </ol>

    </div>

</div>

<!-- Wizard Engine Initialises Here -->

                                    <div
    id="helpufind-questions"
    class="hidden flex-1 p-6 lg:p-8">

    <div
        id="helpufind-question-number"
        class="text-sm font-semibold uppercase tracking-[0.18em] text-[#E48A2F]">

        Question 1 of 12

    </div>

    <div id="helpufind-progress-bar" class="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div id="helpufind-progress-fill" class="h-full w-1/12 rounded-full bg-[#E48A2F] transition-all duration-300"></div>
    </div>
    <p id="helpufind-progress-text" class="mt-1 text-xs text-slate-500">8% complete</p>

                        <h4 class="mt-3 text-xl lg:text-2xl font-black leading-snug text-[#08111F]">

                            What best describes your primary reason for buying a vehicle?

                        </h4>

                        <p class="mt-3 text-sm lg:text-base leading-7 text-slate-600">

                            Select the option that most closely matches how you'll use your next vehicle. This helps Helpufin prioritise the most suitable recommendations.

                        </p>

                        <div
    id="helpufind-answer-container"
    class="mt-8 grid gap-3 md:grid-cols-2">

                            <button
                                type="button"
                                data-question="1"
                                data-answer="daily-commuting"
                                class="helpufind-answer group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10">

                                <div class="flex-1">

                                    <div class="text-lg font-bold text-[#08111F]">

                                        Daily Commuting

                                    </div>

                                    <p class="mt-1 text-sm text-slate-500">

                                        Reliable, fuel-efficient vehicles for everyday travel.

                                    </p>

                                </div>

                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </div>

                                <svg class="hidden h-5 w-5 shrink-0 text-[#3B82F6] checkmark-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

                            </button>

                            <button
                                type="button"
                                data-question="1"
                                data-answer="family-vehicle"
                                class="helpufind-answer group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10">

                                <div class="flex-1">

                                    <div class="text-lg font-bold text-[#08111F]">

                                        Family Vehicle

                                    </div>

                                    <p class="mt-1 text-sm text-slate-500">

                                        Comfort, space and safety for the whole family.

                                    </p>

                                </div>

                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </div>

                                <svg class="hidden h-5 w-5 shrink-0 text-[#3B82F6] checkmark-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

                            </button>

                            <button
                                type="button"
                                data-question="1"
                                data-answer="business"
                                class="helpufind-answer group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10">

                                <div class="flex-1">

                                    <div class="text-lg font-bold text-[#08111F]">

                                        Business Use

                                    </div>

                                    <p class="mt-1 text-sm text-slate-500">

                                        Vehicles designed for work, deliveries or commercial travel.

                                    </p>

                                </div>

                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </div>

                                <svg class="hidden h-5 w-5 shrink-0 text-[#3B82F6] checkmark-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

                            </button>

                            <button
                                type="button"
                                data-question="1"
                                data-answer="adventure"
                                class="helpufind-answer group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10">

                                <div class="flex-1">

                                    <div class="text-lg font-bold text-[#08111F]">

                                        Adventure & Travel

                                    </div>

                                    <p class="mt-1 text-sm text-slate-500">

                                        SUVs, bakkies and capable vehicles for long-distance trips.

                                    </p>

                                </div>

                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                </div>

                                <svg class="hidden h-5 w-5 shrink-0 text-[#3B82F6] checkmark-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

                            </button>

                        </div>

                        <div class="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">

                            <button
                                id="helpufin-previous"
                                disabled
                                class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 min-h-[44px] font-semibold text-slate-400 cursor-not-allowed">

                                Previous

                            </button>

                            <button
                                id="helpufin-next"
                                disabled
                                class="rounded-xl bg-[#E48A2F] px-5 py-2.5 min-h-[44px] font-bold text-[#08111F] opacity-50 cursor-not-allowed transition duration-300">

                                Continue

                            </button>

                        </div>

                    </div>

                <!-- Wizard Sidebar -->

                <aside class="hidden lg:block border-l border-slate-200 bg-slate-50/50">

                    <div class="sticky top-8 p-6 h-fit">

                        <div class="text-xs uppercase tracking-[0.2em] text-[#E48A2F]">

                            Your Journey

                        </div>

                        <div
    id="helpufind-sidebar"
    class="mt-5 space-y-4">

                            <div class="flex items-center gap-3">

                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E48A2F] text-sm font-bold text-[#08111F]">

                                    âœ“

                                </div>

                                <div>

                                    <div
                                        id="sidebar-step-1-title"
                                        class="text-sm font-bold text-[#08111F]">

                                        Profile Started

                                    </div>

                                    <div
                                        id="sidebar-step-1-status"
                                        class="text-xs text-slate-500">

                                        Welcome completed.

                                    </div>

                                </div>

                            </div>

                            <div
                                id="sidebar-step-2"
                                class="flex items-center gap-3 opacity-60">

                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-[#08111F]">

                                    2

                                </div>

                                <div>

                                    <div
                                        id="sidebar-step-2-title"
                                        class="text-sm font-bold text-[#08111F]">

                                        Lifestyle Analysis

                                    </div>

                                    <div
                                        id="sidebar-step-2-status"
                                        class="text-xs text-slate-500">

                                        Waiting...

                                    </div>

                                </div>

                            </div>

                            <div class="flex items-center gap-3 opacity-60">

                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-[#08111F]">

                                    3

                                </div>

                                <div>

                                    <div class="text-sm font-bold text-[#08111F]">

                                        Budget Review

                                    </div>

                                    <div class="text-xs text-slate-500">

                                        Coming up

                                    </div>

                                </div>

                            </div>

                            <div class="flex items-center gap-3 opacity-60">

                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-[#08111F]">

                                    4

                                </div>

                                <div>

                                    <div class="text-sm font-bold text-[#08111F]">

                                        Recommendations

                                    </div>

                                    <div class="text-xs text-slate-500">

                                        Final results

                                    </div>

                                </div>

                            </div>

                        </div>

                        <div class="mt-6 rounded-2xl border border-[#E48A2F]/20 bg-[#E48A2F]/10 p-4">

                            <div class="text-xs uppercase tracking-[0.15em] text-[#E48A2F]">

                                Why we ask

                            </div>

                            <p class="mt-2 text-sm leading-6 text-slate-500">

                                Every answer improves your recommendations. Helpufin uses your responses to rank vehicles based on suitability instead of simply filtering listings.

                            </p>

                        </div>

                        <div
    id="helpufind-progress-card"
    class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">

                            <div class="flex items-center justify-between gap-3 text-sm">

                                <span class="text-slate-500">

                                    Estimated Time

                                </span>

                                <span
                                    id="journey-time"

                                    class="font-bold text-[#08111F]">

                                    2 Minutes Remaining

                                </span>

                            </div>

                            <div class="mt-3 flex items-center justify-between gap-3 text-sm">

                                <span class="text-slate-500">

                                    Questions

                                </span>

                                <span
                                    id="questions-progress"
                                    class="font-bold text-[#08111F]">

                                    0 / 12

                                </span>

                            </div>

                            <div class="mt-3 flex items-center justify-between gap-3 text-sm">

                                <span class="text-slate-500">

                                    Results

                                </span>

                                <span class="font-bold text-[#E48A2F]">

                                    Top 3 Matches

                                </span>

                            </div>

                        </div>

                    </div>

                </aside>

            </div>

`;

}

export function initialiseHelpufin(){

    const startButton=document.getElementById("start-helpufin");
    const wizard=document.getElementById("helpufind-wizard");

    if(startButton && wizard){

        startButton.addEventListener("click",(e)=>{

            e.preventDefault();

            wizard.scrollIntoView({

                behavior:"smooth",

                block:"start"

            });

        });

    }

const beginButton=document.getElementById("helpufind-start");
const welcomeScreen=beginButton?.closest(".text-center");
const questionScreen=document.getElementById("helpufind-questions");
const answerContainer=document.getElementById("helpufind-answer-container");
    let answerButtons=document.querySelectorAll(".helpufind-answer");
    const nextButton=document.getElementById("helpufin-next");
    const previousButton=document.getElementById("helpufin-previous");

    let currentQuestion=Number(localStorage.getItem("helpufindProgress"))||1;
    const totalQuestions=12;

    const answers=JSON.parse(localStorage.getItem("helpufinAnswers")||"{}");

if(Object.keys(answers).length){

    Object.entries(answers).forEach(([question,answer])=>{

        answers[Number(question)]=answer;

    });

}

    function saveState(){
        localStorage.setItem("helpufinAnswers",JSON.stringify(answers));
        localStorage.setItem("helpufindProgress",currentQuestion);
    }

    function updateStepBadge(){

        const badge=document.querySelector("#helpufind-wizard span.inline-flex.items-center.rounded-full.border");

        if(!badge) return;

        if(currentQuestion===0){

            badge.textContent="Step 1 â€¢ Welcome";

            return;

        }

        badge.textContent=`Question ${currentQuestion} of ${totalQuestions}`;

        const progressFill=document.getElementById("helpufind-progress-fill");
        const progressText=document.getElementById("helpufind-progress-text");
        if(progressFill && progressText){
            const pct=Math.round((currentQuestion/totalQuestions)*100);
            progressFill.style.width=`${pct}%`;
            progressText.textContent=`${pct}% complete`;
        }

        const progress=document.getElementById("questions-progress");

        if(progress){

            progress.textContent=`${Math.min(currentQuestion,totalQuestions)} / ${totalQuestions}`;

        }

        const time=document.getElementById("journey-time");

        if(time){

            const remaining=Math.max(0,totalQuestions-currentQuestion);

            time.textContent=remaining===0
                ?"Completing..."
                :`About ${Math.max(1,Math.ceil(remaining/6))} min remaining`;

        }

    }

    function resolveAnalysisStep(index){
        const el=document.getElementById(`analysis-step-${index}`);
        if(!el) return;
        el.classList.remove("opacity-40");
        el.classList.add("opacity-100");
    }

    /* ================================================================
       HELPER: Convert monthly budget to maximum affordable vehicle price
       Uses standard 72-month finance at 10.25% interest
       ================================================================ */
    function monthlyToPrice(monthlyStr) {
        if (monthlyStr === "3000") return 160000;
        if (monthlyStr === "6000") return 322000;
        if (monthlyStr === "10000") return 537000;
        if (monthlyStr === "10000+") return 1100000;
        return 2000000;
    }

    /* ================================================================
       HELPER: Calculate how well a price fits within a budget (0-100)
       ================================================================ */
    function scoreBudget(price, monthlyStr) {
        const priceMax = monthlyToPrice(monthlyStr);
        if (price <= 0) return 0;
        if (price <= priceMax * 0.85) return 100;
        if (price <= priceMax) return 80;
        if (price <= priceMax * 1.15) return 50;
        if (price <= priceMax * 1.3) return 25;
        return 0;
    }

    /* ================================================================
       HELPER: Score body type match (0-100)
       ================================================================ */
    function scoreBodyType(vehicleBody, preferredType) {
        if (!preferredType || !vehicleBody) return 50;
        const vb = vehicleBody.toLowerCase();
        const pt = preferredType.toLowerCase();
        if (vb === pt) return 100;
        if (pt === "hatchback" && (vb === "sedan" || vb === "coupe")) return 60;
        if (pt === "sedan" && (vb === "hatchback" || vb === "coupe")) return 60;
        if (pt === "suv" && (vb === "crossover" || vb === "4x4" || vb === "bakkie")) return 65;
        if (pt === "bakkie" && (vb === "suv" || vb === "4x4")) return 60;
        if (pt === "coupe" && (vb === "sedan" || vb === "hatchback")) return 50;
        return 30;
    }

    /* ================================================================
       HELPER: Score fuel type match (0-100)
       ================================================================ */
    function scoreFuelType(vehicleFuel, preferredFuel) {
        if (!preferredFuel || !vehicleFuel) return 50;
        const vf = vehicleFuel.toLowerCase();
        const pf = preferredFuel.toLowerCase();
        if (vf === pf) return 100;
        if (pf === "hybrid" && (vf === "petrol" || vf === "electric")) return 50;
        if (pf === "electric" && vf === "hybrid") return 40;
        if (pf === "petrol" && vf === "hybrid") return 50;
        if (pf === "diesel" && vf === "petrol") return 30;
        return 20;
    }

    /* ================================================================
       HELPER: Score seats match (0-100)
       ================================================================ */
    function scoreSeats(vehicleSeats, preferredAnswer) {
        const needed = Number(preferredAnswer) || 5;
        const have = Number(vehicleSeats) || 5;
        if (have >= needed && have <= needed + 2) return 100;
        if (have >= needed - 1 && have <= needed + 3) return 70;
        if (have >= needed - 2) return 40;
        return 20;
    }

    /* ================================================================
       HELPER: Score condition match (0-100)
       ================================================================ */
    function scoreCondition(vehicleCondition, preferredAnswer) {
        if (!preferredAnswer || preferredAnswer === "all") return 100;
        const vc = (vehicleCondition || "").toLowerCase();
        const pc = preferredAnswer.toLowerCase();
        if (vc === pc) return 100;
        if (pc === "new" && vc === "demo") return 60;
        if (pc === "used" && vc === "demo") return 70;
        if (pc === "demo" && (vc === "new" || vc === "used")) return 50;
        if (pc === "new" && vc === "used") return 20;
        if (pc === "used" && vc === "new") return 30;
        return 50;
    }

    /* ================================================================
       HELPER: Score annual mileage compatibility (0-100)
       Non-filtering ranking factor
       ================================================================ */
    function scoreMileage(vehicleMileage, preferredAnswer) {
        if (!preferredAnswer || vehicleMileage === undefined || vehicleMileage === null) return 50;
        const vm = Number(vehicleMileage) || 0;
        if (preferredAnswer === "10000" && vm <= 15000) return 100;
        if (preferredAnswer === "10000") return 40;
        if (preferredAnswer === "20000" && vm <= 25000) return 100;
        if (preferredAnswer === "20000" && vm <= 35000) return 60;
        if (preferredAnswer === "20000") return 30;
        if (preferredAnswer === "30000" && vm <= 40000) return 100;
        if (preferredAnswer === "30000" && vm <= 60000) return 60;
        if (preferredAnswer === "30000") return 30;
        if (preferredAnswer === "30000+" && vm >= 25000) return 100;
        if (preferredAnswer === "30000+") return 60;
        return 50;
    }

    /* ================================================================
       HELPER: Score driving environment match (0-100)
       Non-filtering ranking factor
       ================================================================ */
    function scoreDrivingEnvironment(vehicle, preferredAnswer) {
        if (!preferredAnswer) return 50;
        const fuelType = (vehicle.fuel_type || "").toLowerCase();
        const bodyType = (vehicle.body_type || "").toLowerCase();
        const driveType = (vehicle.drive_type || "").toLowerCase();
        const transmission = (vehicle.transmission || "").toLowerCase();

        if (preferredAnswer === "city") {
            let s = 50;
            if (fuelType === "electric" || fuelType === "hybrid" || fuelType === "petrol") s += 20;
            if (bodyType === "hatchback" || bodyType === "sedan") s += 20;
            if (transmission === "automatic") s += 10;
            return Math.min(100, s);
        }
        if (preferredAnswer === "highway") {
            let s = 50;
            if (fuelType === "diesel" || fuelType === "petrol") s += 15;
            if (bodyType === "sedan" || bodyType === "suv") s += 20;
            if (transmission === "automatic") s += 15;
            return Math.min(100, s);
        }
        if (preferredAnswer === "mixed") return 80;
        if (preferredAnswer === "offroad") {
            let s = 30;
            if (bodyType === "suv" || bodyType === "bakkie" || bodyType === "4x4") s += 30;
            if (driveType === "4wd" || driveType === "awd" || driveType === "4x4") s += 30;
            if (fuelType === "diesel") s += 10;
            return Math.min(100, s);
        }
        return 50;
    }

    /* ================================================================
       HELPER: Score lifestyle/reason match (0-100)
       Non-filtering ranking factor
       ================================================================ */
    function scoreLifestyle(vehicle, preferredReason) {
        if (!preferredReason) return 50;
        const bodyType = (vehicle.body_type || "").toLowerCase();
        const seats = Number(vehicle.seats) || 5;
        const fuelType = (vehicle.fuel_type || "").toLowerCase();

        if (preferredReason === "daily-commuting") {
            let s = 50;
            if (fuelType === "petrol" || fuelType === "hybrid" || fuelType === "electric") s += 20;
            if (bodyType === "hatchback" || bodyType === "sedan") s += 20;
            if (seats >= 4 && seats <= 5) s += 10;
            return Math.min(100, s);
        }
        if (preferredReason === "family-vehicle") {
            let s = 40;
            if (bodyType === "suv" || bodyType === "mpv" || bodyType === "wagon") s += 30;
            if (seats >= 5) s += 20;
            if (fuelType === "diesel" || fuelType === "petrol") s += 10;
            return Math.min(100, s);
        }
        if (preferredReason === "business") {
            let s = 40;
            if (bodyType === "sedan" || bodyType === "suv") s += 25;
            if (fuelType === "diesel") s += 15;
            if (seats >= 4 && seats <= 5) s += 20;
            return Math.min(100, s);
        }
        if (preferredReason === "adventure") {
            let s = 40;
            if (bodyType === "suv" || bodyType === "bakkie" || bodyType === "4x4") s += 30;
            if (vehicle.drive_type === "4wd" || vehicle.drive_type === "awd") s += 20;
            if (fuelType === "diesel") s += 10;
            return Math.min(100, s);
        }
        return 50;
    }

    /* ================================================================
       HELPER: Score cargo needs (0-100)
       Non-filtering ranking factor
       ================================================================ */
    function scoreCargo(vehicle, preferredCargo) {
        if (!preferredCargo) return 50;
        const bodyType = (vehicle.body_type || "").toLowerCase();
        if (preferredCargo === "small") return 80;
        if (preferredCargo === "medium") {
            let s = 50;
            if (bodyType === "hatchback" || bodyType === "sedan" || bodyType === "suv") s += 30;
            if (bodyType === "bakkie") s += 20;
            return Math.min(100, s);
        }
        if (preferredCargo === "large") {
            let s = 30;
            if (bodyType === "suv" || bodyType === "wagon" || bodyType === "mpv") s += 40;
            if (bodyType === "bakkie") s += 30;
            return Math.min(100, s);
        }
        if (preferredCargo === "xlarge") {
            let s = 20;
            if (bodyType === "bakkie") s += 50;
            if (bodyType === "suv" || bodyType === "mpv") s += 30;
            return Math.min(100, s);
        }
        return 50;
    }

    /* ================================================================
       HELPER: Score feature priority (0-100)
       Non-filtering ranking factor
       ================================================================ */
    function scoreFeaturePriority(vehicle, preferredFeature) {
        if (!preferredFeature) return 50;
        const features = (vehicle.features || "").toLowerCase();
        const fuelType = (vehicle.fuel_type || "").toLowerCase();
        const mileage = Number(vehicle.mileage) || 0;

        if (preferredFeature === "economy") {
            let s = 40;
            if (fuelType === "petrol" || fuelType === "hybrid") s += 30;
            if (fuelType === "electric") s += 30;
            if (mileage <= 30000) s += 20;
            return Math.min(100, s);
        }
        if (preferredFeature === "performance") {
            let s = 40;
            if (vehicle.engine_size && Number(vehicle.engine_size) >= 2.0) s += 30;
            if (fuelType === "petrol" || fuelType === "diesel") s += 20;
            if (vehicle.transmission?.toLowerCase() === "automatic") s += 10;
            return Math.min(100, s);
        }
        if (preferredFeature === "safety") {
            let s = 40;
            if (features.includes("abs") || features.includes("airbag")) s += 20;
            if (features.includes("traction") || features.includes("stability")) s += 20;
            if (features.includes("camera") || features.includes("sensor")) s += 20;
            return Math.min(100, s);
        }
        if (preferredFeature === "luxury") {
            let s = 30;
            if (features.includes("leather")) s += 20;
            if (features.includes("sunroof") || features.includes("moonroof")) s += 15;
            if (features.includes("climate") || features.includes("ac")) s += 15;
            if (features.includes("navigation") || features.includes("gps")) s += 20;
            return Math.min(100, s);
        }
        return 50;
    }

    /* ================================================================
       HELPER: Score purchase timeline (0-100)
       Non-filtering ranking factor
       ================================================================ */
    function scoreTimeline(vehicle, preferredTimeline) {
        if (!preferredTimeline) return 50;
        const daysOld = vehicle.created_at
            ? (Date.now() - new Date(vehicle.created_at).getTime()) / 86400000
            : 999;
        if (preferredTimeline === "now") {
            if (daysOld <= 7) return 100;
            if (daysOld <= 30) return 80;
            if (daysOld <= 60) return 50;
            return 30;
        }
        if (preferredTimeline === "30days") {
            if (daysOld <= 30) return 100;
            if (daysOld <= 60) return 80;
            if (daysOld <= 90) return 50;
            return 30;
        }
        if (preferredTimeline === "90days") {
            if (daysOld <= 90) return 100;
            if (daysOld <= 180) return 70;
            return 40;
        }
        if (preferredTimeline === "research") return 80;
        return 50;
    }

    /* ================================================================
       STEP 1: Convert questionnaire answers into search criteria
       Maps each question to its relevant database field
       Questions without direct DB fields become ranking factors only
       ================================================================ */
    function buildFiltersFromAnswers(answers) {
        const monthlyBudget = answers[3] || "6000";
        const priceMax = monthlyToPrice(monthlyBudget);

        const bodyMap = {
            "daily-commuting":"hatchback",
            "family-vehicle":"suv",
            "business":"sedan",
            "adventure":"suv",
            "hatchback":"hatchback",
            "sedan":"sedan",
            "suv":"suv",
            "bakkie":"bakkie"
        };

        const fuelMap = {
            "petrol":"Petrol",
            "diesel":"Diesel",
            "hybrid":"Hybrid",
            "electric":"Electric"
        };

        const conditionMap = {
            "new":"New",
            "demo":"Demo",
            "used":"Used"
        };

        let preferredBody = answers[4] ? bodyMap[answers[4]] : "";
        if (!preferredBody && answers[1]) {
            preferredBody = bodyMap[answers[1]] || "";
        }

        const filters = {
            q: "",
            body: preferredBody,
            fuel: fuelMap[answers[6]] || "",
            priceMax: priceMax,
            priceMin: 0,
            seats: answers[2] ? [Number(answers[2])] : [],
            condition: conditionMap[answers[11]] || "",
            sort: "latest"
        };

        if (answers[8]==="finance" || answers[8]==="maybe" || answers[8]==="approved") {
            filters.financeMode = true;
            filters.monthlyBudget = Number(monthlyBudget) || 3000;
            filters.term = 72;
            filters.interest = 10.25;
        }

        return { filters, priceMax, monthlyBudget, preferredBody };
    }

    /* ================================================================
       STEP 3 & 4: Score every returned vehicle and sort by score
       Weighting: 30% Budget, 25% Body Type, 15% Fuel, 10% Seats,
                  10% Condition, 10% Remaining preferences
       Non-DB-field questions (mileage, driving, timeline, lifestyle,
       cargo, feature) influence score, never exclude
       ================================================================ */
    function scoreAndRankVehicles(vehicles, answers, priceMax, preferredBody) {
        const WEIGHT_BUDGET = 0.30;
        const WEIGHT_BODY = 0.25;
        const WEIGHT_FUEL = 0.15;
        const WEIGHT_SEATS = 0.10;
        const WEIGHT_CONDITION = 0.10;
        const WEIGHT_REMAINING = 0.10;

        const monthlyStr = answers[3] || "6000";
        const preferredFuel = answers[6] || "";
        const preferredCondition = answers[11] || "all";

        return vehicles.map(v => {
            const budgetScore = scoreBudget(v.price, monthlyStr);
            const bodyScore = scoreBodyType(v.body_type, preferredBody);
            const fuelScore = scoreFuelType(v.fuel_type, preferredFuel);
            const seatsScore = scoreSeats(v.seats, answers[2]);
            const conditionScore = scoreCondition(v.condition, preferredCondition);

            // Non-filtering ranking factors (questions without direct DB fields)
            const reasonScore = scoreLifestyle(v, answers[1]);
            const mileageScore = scoreMileage(v.mileage, answers[5]);
            const drivingScore = scoreDrivingEnvironment(v, answers[7]);
            const cargoScore = scoreCargo(v, answers[9]);
            const featureScore = scoreFeaturePriority(v, answers[10]);
            const timelineScore = scoreTimeline(v, answers[12]);

            const remainingAvg = (reasonScore + mileageScore + drivingScore + cargoScore + featureScore + timelineScore) / 6;

            const weightedScore =
                (budgetScore * WEIGHT_BUDGET) +
                (bodyScore * WEIGHT_BODY) +
                (fuelScore * WEIGHT_FUEL) +
                (seatsScore * WEIGHT_SEATS) +
                (conditionScore * WEIGHT_CONDITION) +
                (remainingAvg * WEIGHT_REMAINING);

            const matchPct = Math.round(Math.min(100, Math.max(0, weightedScore)));

            const reasons = buildMatchReasons(v, answers, priceMax, preferredBody, budgetScore, bodyScore, fuelScore, seatsScore, conditionScore, reasonScore, mileageScore);

            const monthly = calculateMonthly(v.price, 0, 10.25, 72);

            return {
                ...v,
                matchPct,
                matchReasons: reasons,
                monthly,
                individualScores: {
                    budget: budgetScore,
                    body: bodyScore,
                    fuel: fuelScore,
                    seats: seatsScore,
                    condition: conditionScore,
                    remaining: remainingAvg
                }
            };
        }).sort((a, b) => b.matchPct - a.matchPct);
    }

    /* ================================================================
       HELPER: Build human-readable match reasons
       ================================================================ */
    function buildMatchReasons(v, answers, priceMax, preferredBody, budgetScore, bodyScore, fuelScore, seatsScore, conditionScore, reasonScore, mileageScore) {
        const reasons = [];
        if (budgetScore >= 80) reasons.push({ icon: "âœ“", text: "Within your budget", positive: true });
        else if (budgetScore >= 50) reasons.push({ icon: "~", text: "Slightly above your budget range", positive: false });
        else if (budgetScore > 0) reasons.push({ icon: "âœ—", text: "Above your preferred budget", positive: false });

        if (bodyScore >= 80) reasons.push({ icon: "âœ“", text: "Matches your preferred body style", positive: true });
        else if (bodyScore >= 50) reasons.push({ icon: "~", text: "Close to your preferred body style", positive: false });
        else if (bodyScore > 0) reasons.push({ icon: "âœ—", text: "Different body style than preferred", positive: false });

        if (fuelScore >= 80) {
            const fuelLabel = answers[6]==="petrol"?"Petrol":answers[6]==="diesel"?"Diesel":answers[6]==="hybrid"?"Hybrid":"Electric";
            reasons.push({ icon: "âœ“", text: `${fuelLabel} as requested`, positive: true });
        } else if (fuelScore >= 40) reasons.push({ icon: "~", text: "Different fuel type than preferred", positive: false });
        else if (fuelScore > 0) reasons.push({ icon: "âœ—", text: "Fuel type differs from preference", positive: false });

        if (seatsScore >= 80) {
            const seatCount = v.seats || "?";
            reasons.push({ icon: "âœ“", text: `Seats ${seatCount} passengers`, positive: true });
        } else if (seatsScore >= 40) reasons.push({ icon: "~", text: "Passenger capacity is close to your need", positive: false });
        else if (seatsScore > 0) reasons.push({ icon: "âœ—", text: "Seating capacity differs from your need", positive: false });

        if (conditionScore >= 80) {
            const condLabel = v.condition || "Pre-owned";
            reasons.push({ icon: "âœ“", text: `${condLabel} condition as preferred`, positive: true });
        } else if (conditionScore >= 40) reasons.push({ icon: "~", text: "Condition differs slightly from preference", positive: false });

        const lifestyleTexts = {
            "daily-commuting":"Great for daily commuting",
            "family-vehicle":"Suitable for family use",
            "business":"Well-suited for business use",
            "adventure":"Capable for adventure"
        };
        if (reasonScore >= 70 && answers[1]) {
            reasons.push({ icon: "âœ“", text: lifestyleTexts[answers[1]] || "Matches your lifestyle needs", positive: true });
        }

        if (mileageScore <= 40 && answers[5]) {
            reasons.push({ icon: "~", text: "Higher mileage than your preferred range", positive: false });
        }

        return reasons.slice(0, 6);
    }

    /* ================================================================
       STEP 2: Search REAL HUFA inventory with progressive relaxation
       Never returns placeholder or fabricated vehicles
       ================================================================ */
    async function searchInventory(filters, limit = 50) {
        const { data: vehicles } = await searchVehicles(filters, { limit });
        return vehicles || [];
    }

    async function searchWithRelaxation(answers) {
        const { filters, priceMax } = buildFiltersFromAnswers(answers);

        // Attempt 1: Strict filter with all criteria
        let vehicles = await searchInventory(filters, 50);
        if (vehicles.length > 0) return { vehicles, filters, relaxed: false, relaxationStep: 0 };

        // Relax 1: Remove condition constraint
        if (vehicles.length === 0 && filters.condition) {
            const rf = { ...filters, condition: "" };
            vehicles = await searchInventory(rf, 50);
            if (vehicles.length > 0) return { vehicles, filters: rf, relaxed: true, relaxationStep: 1 };
        }

        // Relax 2: Remove fuel constraint
        if (vehicles.length === 0 && filters.fuel) {
            const rf = { ...filters, condition: "", fuel: "" };
            vehicles = await searchInventory(rf, 50);
            if (vehicles.length > 0) return { vehicles, filters: rf, relaxed: true, relaxationStep: 2 };
        }

        // Relax 3: Remove seats constraint
        if (vehicles.length === 0 && filters.seats.length > 0) {
            const rf = { ...filters, condition: "", fuel: "", seats: [] };
            vehicles = await searchInventory(rf, 50);
            if (vehicles.length > 0) return { vehicles, filters: rf, relaxed: true, relaxationStep: 3 };
        }

        // Relax 4: Expand budget by 30%
        if (vehicles.length === 0) {
            const expandedMax = Math.round(priceMax * 1.3);
            const rf = { ...filters, condition: "", fuel: "", seats: [], priceMax: expandedMax };
            vehicles = await searchInventory(rf, 50);
            if (vehicles.length > 0) return { vehicles, filters: rf, relaxed: true, relaxationStep: 4 };
        }

        // Relax 5: Remove body type
        if (vehicles.length === 0 && filters.body) {
            const expandedMax = Math.round(priceMax * 1.3);
            const rf = { ...filters, condition: "", fuel: "", seats: [], body: "", priceMax: expandedMax };
            vehicles = await searchInventory(rf, 50);
            if (vehicles.length > 0) return { vehicles, filters: rf, relaxed: true, relaxationStep: 5 };
        }

        // Relax 6: Max budget, no filters
        if (vehicles.length === 0) {
            const rf = { q: "", body: "", fuel: "", priceMax: 2000000, priceMin: 0, seats: [], condition: "", sort: "latest" };
            vehicles = await searchInventory(rf, 50);
            if (vehicles.length > 0) return { vehicles, filters: rf, relaxed: true, relaxationStep: 6 };
        }

        return { vehicles: [], filters, relaxed: false, relaxationStep: -1 };
    }

    /* ================================================================
       STEP 5: Render rich results with match percentage and reasons
       Every card displays: Match%, Image, Year, Make, Model, Price,
       Monthly Estimate, Why Selected
       ================================================================ */
    function renderResults(scored, answers, searchResult) {
        const { filters, relaxed, relaxationStep } = searchResult;

        if (scored.length === 0) {
            document.querySelector("h4").textContent = "Inventory Unavailable";
            document.querySelector("h4+p").textContent = "The HUFA marketplace currently has no vehicles in stock.";
            answerContainer.innerHTML = `
                <div class="py-16 text-center">
                    <div class="mx-auto w-24 h-24 rounded-full bg-[#E48A2F]/20 flex items-center justify-center text-[#E48A2F]"><span class="material-symbols-outlined text-5xl">inbox</span></div>
                    <h3 class="mt-8 text-3xl font-black text-[#08111F]">No Vehicles Available</h3>
                    <p class="mt-4 text-slate-500 text-lg max-w-lg mx-auto">No vehicles currently in stock. Please check back later.</p>
                </div>`;
            window.__helpufinResults = [];
            window.__helpufinProfile = filters;
            return;
        }

        let relaxationNotice = '';
        if (relaxed) {
            const messages = {
                1: "No exact matches found in your preferred condition. Showing all conditions.",
                2: "Broadening fuel type options to find the best available matches.",
                3: "Adjusting seating requirements to show more suitable options.",
                4: "Slightly expanding budget range to find your closest matches.",
                5: "Exploring other body styles that may suit your needs.",
                6: "Showing all available inventory matching your core needs."
            };
            relaxationNotice = `
                <div class="mb-6 md:col-span-2 rounded-3xl border border-[#E48A2F]/30 bg-[#E48A2F]/10 p-5 text-left">
                    <div class="flex items-start gap-3">
                        <span class="text-[#E48A2F] shrink-0 mt-0.5"><span class="material-symbols-outlined text-xl">lightbulb</span></span>
                        <div>
                            <p class="text-[#E48A2F] font-semibold">Closest Match</p>
                            <p class="text-slate-400 text-sm mt-1">${messages[relaxationStep] || "Showing the closest available matches."}</p>
                        </div>
                    </div>
                </div>`;
        }

        const isExact = !relaxed && scored.length > 0;
        document.querySelector("h4").textContent = isExact ? "Your Personalised Matches" : "Best Available Matches";
        document.querySelector("h4+p").textContent = isExact
            ? "These vehicles best match your preferences."
            : "We relaxed some filters to show the closest available vehicles.";

        const resultsCards = scored.slice(0, 3).map((v, index) => {
            const imageUrl = v.image_url || (v.images && v.images[0]) || "/assets/HUF1.webp";
            const matchLabel = v.matchPct >= 80 ? "Excellent Match" : v.matchPct >= 60 ? "Good Match" : v.matchPct >= 40 ? "Fair Match" : "Partial Match";
            const borderColor = index === 0 ? "border-[#E48A2F]" : "border-slate-200";
            const badgeBg = index === 0 ? "bg-[#E48A2F] text-[#08111F]" : "bg-slate-100 text-[#08111F]";

            const positiveReasons = v.matchReasons.filter(r => r.positive);
            const negativeReasons = v.matchReasons.filter(r => !r.positive);

            return `
                <div class="rounded-3xl border ${borderColor} bg-white backdrop-blur-xl overflow-hidden transition duration-300 hover:scale-[1.01]">
                    <div class="relative h-52 overflow-hidden bg-[#08111F]">
                        <img src="${imageUrl}" alt="${v.year} ${v.make} ${v.model}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div class="absolute top-4 left-4 rounded-full ${badgeBg} px-4 py-2 text-sm font-bold shadow-lg">
                            ${v.matchPct}% ${matchLabel}
                        </div>
                        ${index === 0 ? '<div class="absolute top-4 right-4 rounded-full bg-[#E48A2F]/90 text-[#08111F] px-4 py-2 text-sm font-bold shadow-lg">Best Match</div>' : ''}
                    </div>
                    <div class="p-6 text-left">
                        <h3 class="text-2xl font-black text-[#08111F]">${v.year} ${v.make} ${v.model}</h3>
                        <div class="mt-3 flex items-baseline gap-4">
                            <span class="text-3xl font-black text-[#E48A2F]">R ${Number(v.price).toLocaleString()}</span>
                            <span class="text-slate-400 text-sm">or R ${Number(v.monthly || 0).toLocaleString()}/mo</span>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                            ${v.body_type ? `<span class="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">${v.body_type}</span>` : ''}
                            ${v.fuel_type ? `<span class="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">${v.fuel_type}</span>` : ''}
                            ${v.transmission ? `<span class="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">${v.transmission}</span>` : ''}
                            ${v.seats ? `<span class="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">${v.seats} seats</span>` : ''}
                            ${v.mileage !== undefined && v.mileage !== null ? `<span class="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-500">${Number(v.mileage).toLocaleString()} km</span>` : ''}
                        </div>
                        <div class="mt-5 border-t border-slate-200 pt-5">
                            <p class="text-sm font-semibold uppercase tracking-[0.15em] text-[#E48A2F] mb-3">Why this vehicle</p>
                            <div class="space-y-2">
                                ${positiveReasons.map(r => `<div class="flex items-start gap-2"><span class="text-emerald-400 shrink-0 mt-0.5">${r.icon}</span><span class="text-slate-400 text-sm">${r.text}</span></div>`).join('')}
                                ${negativeReasons.length > 0 ? `<div class="mt-3 pt-3 border-t border-slate-300"><p class="text-xs text-slate-400 mb-2">Compromises:</p>${negativeReasons.map(r => `<div class="flex items-start gap-2"><span class="text-amber-400 shrink-0 mt-0.5">${r.icon}</span><span class="text-slate-400 text-sm">${r.text}</span></div>`).join('')}</div>` : ''}
                            </div>
                        </div>
                        <button data-view-vehicle data-vehicle-id="${v.id}" class="mt-5 inline-flex w-full items-center justify-center rounded-2xl ${v.is_featured ? 'bg-[#E48A2F] hover:bg-[#D67E2C] text-[#08111F]' : 'bg-[#005BBF] hover:bg-[#004FA8] text-white'} px-6 py-4 font-bold transition duration-300">
                            View Vehicle â†’
                        </button>
                    </div>
                </div>`;
        }).join('');

        answerContainer.innerHTML = `
            ${relaxationNotice}
            <div class="mb-4 md:col-span-2 flex items-center justify-between">
                <p class="text-slate-400 text-sm">${scored.length} ${scored.length > 1 ? 'vehicles' : 'vehicle'} found â€¢ Sorted by match relevance</p>
            </div>
            <div class="grid gap-6 md:col-span-2 md:grid-cols-2 lg:grid-cols-3">
                ${resultsCards}
            </div>`;

        window.__helpufinResults = scored;
        window.__helpufinProfile = filters;
    }

    /* ================================================================
       MAIN ANALYSIS ENGINE
       Entry point after all 12 questions are answered
       Implements entire 5-step recommendation pipeline
       ================================================================ */
    async function runAnalysis(answers){

        resolveAnalysisStep(0);
        await new Promise(r=>setTimeout(r,600));

        resolveAnalysisStep(1);
        await new Promise(r=>setTimeout(r,500));

        resolveAnalysisStep(2);

        try {

            // STEPS 1 & 2: Build criteria from answers, search real inventory with progressive relaxation
            const searchResult = await searchWithRelaxation(answers);
            const { vehicles, filters } = searchResult;

            resolveAnalysisStep(3);
            await new Promise(r=>setTimeout(r,500));

            if (vehicles.length === 0) {
                renderResults([], answers, searchResult);
                resolveAnalysisStep(4);
                window.__helpufinResults = [];
                window.__helpufinProfile = filters;
                return;
            }

            // Fetch popularity for tiebreaker
            const popularity = await getPopularityMap();

            // STEPS 3 & 4: Score every vehicle, rank by score
            const { priceMax, preferredBody } = buildFiltersFromAnswers(answers);
            const scored = scoreAndRankVehicles(vehicles, answers, priceMax, preferredBody);

            // Apply popularity as tiebreaker for vehicles with equal match percentages
            if (popularity) {
                scored.forEach(v => { v.popularityScore = Number(popularity[v.id]) || 0; });
                scored.sort((a, b) => {
                    if (b.matchPct !== a.matchPct) return b.matchPct - a.matchPct;
                    return (b.popularityScore || 0) - (a.popularityScore || 0);
                });
            }

            resolveAnalysisStep(4);
            await new Promise(r=>setTimeout(r,400));

            // STEP 5: Render rich results
            renderResults(scored, answers, searchResult);

        } catch (err) {
            console.error("Helpufin analysis error:", err);
            answerContainer.innerHTML = `<div class="py-16 text-center"><h3 class="text-2xl font-bold text-red-400">Analysis Error</h3><p class="mt-4 text-slate-300">${err.message || "Something went wrong while searching the marketplace."}</p></div>`;
        }
    }

    const questions=[

        {
            title:"What best describes your primary reason for buying a vehicle?",
            description:"Select the option that most closely matches how you'll use your next vehicle. This helps Helpufin prioritise the most suitable recommendations.",
            answers:[
                ["Daily Commuting","Reliable, fuel-efficient vehicles for everyday travel.","daily-commuting"],
                ["Family Vehicle","Comfort, space and safety for the whole family.","family-vehicle"],
                ["Business Use","Vehicles designed for work, deliveries or commercial travel.","business"],
                ["Adventure & Travel","SUVs, bakkies and capable vehicles for long-distance trips.","adventure"]
            ]
        },

        {
            title:"How many people usually travel with you?",
            description:"Passenger capacity influences the most suitable body styles.",
            answers:[
                ["Just Me","Mostly driving alone.","1"],
                ["Two People","Usually one passenger.","2"],
                ["Small Family","Three to five passengers.","5"],
                ["Large Family","Six or more passengers.","7"]
            ]
        },

        {
            title:"What is your estimated monthly vehicle budget?",
            description:"Choose the monthly payment you're most comfortable with.",
            answers:[
                ["Under R3 000","Lowest monthly commitment.","3000"],
                ["R3 000 â€“ R6 000","Affordable monthly payments.","6000"],
                ["R6 000 â€“ R10 000","Mid-range vehicle budget.","10000"],
                ["Above R10 000","Premium vehicle budget.","10000+"]
            ]
        },

        {
            title:"What type of vehicle are you looking for?",
            description:"Choose the vehicle category that best suits your lifestyle.",
            answers:[
                ["Hatchback","Compact and economical.","hatchback"],
                ["Sedan","Comfortable everyday driving.","sedan"],
                ["SUV","Space and versatility.","suv"],
                ["Bakkie","Work and adventure.","bakkie"]
            ]
        },

        {
            title:"How many kilometres do you typically drive each year?",
            description:"Driving distance helps determine fuel efficiency and ownership costs.",
            answers:[
                ["Less than 10 000 km","Low annual mileage.","10000"],
                ["10 000 - 20 000 km","Average driving.","20000"],
                ["20 000 - 30 000 km","Frequent driving.","30000"],
                ["More than 30 000 km","Very high annual mileage.","30000+"]
            ]
        },

        {
            title:"Which fuel type would you prefer?",
            description:"We'll prioritise vehicles that match your preferred powertrain.",
            answers:[
                ["Petrol","Traditional petrol vehicles.","petrol"],
                ["Diesel","Ideal for long-distance driving.","diesel"],
                ["Hybrid","Best of both worlds.","hybrid"],
                ["Electric","Fully electric vehicles.","electric"]
            ]
        },

        {
            title:"Where will the vehicle spend most of its time?",
            description:"Your driving environment influences the most suitable vehicle.",
            answers:[
                ["City Driving","Urban commuting.","city"],
                ["Highway","Long-distance travel.","highway"],
                ["Mixed Driving","Combination of both.","mixed"],
                ["Off-road","Rural or adventure driving.","offroad"]
            ]
        },

        {
            title:"Will you be financing your vehicle?",
            description:"This helps us recommend vehicles within realistic affordability.",
            answers:[
                ["Yes","Vehicle finance required.","finance"],
                ["No","Cash purchase.","cash"],
                ["Maybe","Still deciding.","maybe"],
                ["Already Approved","Finance already approved.","approved"]
            ]
        },

        {
            title:"Do you need extra luggage or cargo space?",
            description:"Storage requirements influence body style recommendations.",
            answers:[
                ["Very Little","Mostly personal items.","small"],
                ["Moderate","Weekend luggage.","medium"],
                ["Large","Family luggage.","large"],
                ["Maximum","Commercial or adventure use.","xlarge"]
            ]
        },

        {
            title:"Which feature matters most?",
            description:"We'll prioritise vehicles with your preferred strengths.",
            answers:[
                ["Fuel Economy","Lower running costs.","economy"],
                ["Performance","Power and acceleration.","performance"],
                ["Safety","Advanced safety technology.","safety"],
                ["Luxury","Comfort and premium features.","luxury"]
            ]
        },

        {
            title:"Would you consider a used vehicle?",
            description:"Choosing used vehicles increases your available options.",
            answers:[
                ["New Only","Brand new vehicles.","new"],
                ["Demo","Dealer demonstrators.","demo"],
                ["Used","Pre-owned vehicles.","used"],
                ["No Preference","Show everything.","all"]
            ]
        },

        {
            title:"When are you planning to buy?",
            description:"This helps prioritise available inventory.",
            answers:[
                ["Immediately","Ready to buy now.","now"],
                ["Within 30 Days","Soon.","30days"],
                ["Within 3 Months","Planning ahead.","90days"],
                ["Just Researching","No immediate plans.","research"]
            ]
        }

    ];

    if(beginButton && welcomeScreen && questionScreen){

        beginButton.addEventListener("click",()=>{

            welcomeScreen.classList.add("hidden");
            questionScreen.classList.remove("hidden");

            updateStepBadge();

            questionScreen.scrollIntoView({

                behavior:"smooth",
                block:"start"

            });

        });

    }

    answerButtons.forEach(button=>{

        button.addEventListener("click",()=>{

            answerButtons.forEach(item=>{

                item.classList.remove(
                    "border-[#3B82F6]",
                    "bg-[#3B82F6]/10"
                );

                const cm=item.querySelector(".checkmark-icon");
                if(cm) cm.classList.add("hidden");

            });

            button.classList.add(
                "border-[#3B82F6]",
                "bg-[#3B82F6]/10"
            );

            const cm=button.querySelector(".checkmark-icon");
            if(cm) cm.classList.remove("hidden");

            answers[currentQuestion]=button.dataset.answer;
            saveState();

            if(nextButton){

                nextButton.disabled=false;
                nextButton.classList.remove(
                    "opacity-50",
                    "cursor-not-allowed"
                );

            }

        });

    });

    if(nextButton){

        nextButton.addEventListener("click",()=>{

            if(!answers[currentQuestion]) return;

            currentQuestion++;

            document.getElementById("helpufind-question-number").textContent=`Question ${Math.min(currentQuestion,totalQuestions)} of ${totalQuestions}`;

            updateStepBadge();

            if(currentQuestion>questions.length){

                saveState();
                localStorage.removeItem("helpufindProgress");

                nextButton.classList.add("hidden");
                previousButton.classList.add("hidden");

                document.querySelector("h4").textContent="Analysing your profile...";

                document.querySelector("h4+p").textContent="Helpufin is searching the HUFA marketplace for your best matches.";

                const steps=[
                    "Analysing your lifestyle and driving habits...",
                    "Matching your budget and affordability...",
                    "Searching the HUFA marketplace...",
                    "Calculating ownership costs...",
                    "Finding your best matches..."
                ];

                answerContainer.innerHTML=`
<div class="py-16 text-center">

<div class="mx-auto h-20 w-20 rounded-full border-4 border-[#E48A2F]/20 border-t-[#E48A2F] animate-spin mb-8"></div>

<div id="analysis-steps" class="space-y-4 text-left max-w-lg mx-auto">

${steps.map((s,i)=>`
<div id="analysis-step-${i}" class="flex items-center gap-4 opacity-40 transition-all duration-500">
<div class="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-400 text-sm font-bold">${i+1}</div>
<span class="text-slate-400 text-base">${s}</span>
</div>
`).join("")}

</div>

</div>
`;

                runAnalysis(answers);
                return;

            }

            if(currentQuestion<=questions.length){

                const question=questions[currentQuestion-1];

                document.getElementById("helpufind-question-number").textContent=`Question ${currentQuestion} of ${totalQuestions}`;

            updateStepBadge();

                document.querySelector("h4").textContent=question.title;

                document.querySelector("h4+p").textContent=question.description;

                const container=answerContainer;

                container.innerHTML=question.answers.map(answer=>`

<button
type="button"
data-question="${currentQuestion}"
data-answer="${answer[2]}"
class="helpufind-answer group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10">

<div class="flex-1">

<div class="text-lg font-bold text-[#08111F]">${answer[0]}</div>

<p class="mt-1 text-sm text-slate-500">${answer[1]}</p>

</div>

<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
</div>

<svg class="hidden h-5 w-5 shrink-0 text-[#3B82F6] checkmark-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

</button>

`).join("");

                answerButtons=document.querySelectorAll(".helpufind-answer");

                answerButtons.forEach(button=>{

                    if(answers[currentQuestion]===button.dataset.answer){

                        button.classList.add("border-[#3B82F6]","bg-[#3B82F6]/10");

                        const cm=button.querySelector(".checkmark-icon");
                        if(cm) cm.classList.remove("hidden");

                        nextButton.disabled=false;

                        nextButton.classList.remove("opacity-50","cursor-not-allowed");

                    }

                    button.addEventListener("click",()=>{

                        answerButtons.forEach(item=>{
                            item.classList.remove("border-[#3B82F6]","bg-[#3B82F6]/10");
                            const cm=item.querySelector(".checkmark-icon");
                            if(cm) cm.classList.add("hidden");
                        });

                        button.classList.add("border-[#3B82F6]","bg-[#3B82F6]/10");

                        const cm=button.querySelector(".checkmark-icon");
                        if(cm) cm.classList.remove("hidden");

                        answers[currentQuestion]=button.dataset.answer;

                        nextButton.disabled=false;

                        nextButton.classList.remove("opacity-50","cursor-not-allowed");

                    });

                });

            }

            const hasAnswer=Boolean(answers[currentQuestion]);

            nextButton.disabled=!hasAnswer;

            nextButton.classList.toggle(
                "opacity-50",
                !hasAnswer
            );

            nextButton.classList.toggle(
                "cursor-not-allowed",
                !hasAnswer
            );

            if(previousButton){

                previousButton.disabled=currentQuestion===1;

                previousButton.classList.toggle(
                    "cursor-not-allowed",
                    currentQuestion===1
                );

                previousButton.classList.toggle(
                    "text-slate-500",
                    currentQuestion===1
                );

                previousButton.classList.toggle(
                    "text-[#08111F]",
                    currentQuestion>1
                );

            }

            const step2=document.getElementById("sidebar-step-2");
            const step2Status=document.getElementById("sidebar-step-2-status");

            if(step2){

                step2.classList.toggle("opacity-60",currentQuestion===1);

            }

            if(step2Status){

                step2Status.textContent=currentQuestion===1
                    ?"Waiting..."
                    :"In progress";

            }

        });

    }

    if(previousButton){

        previousButton.addEventListener("click",()=>{

            if(currentQuestion===1) return;

            currentQuestion--;

            document.getElementById("helpufind-question-number").textContent=`Question ${currentQuestion} of ${totalQuestions}`;

            updateStepBadge();

          if(currentQuestion<=questions.length){

    const question=questions[currentQuestion-1];

    document.querySelector("h4").textContent=question.title;

    document.querySelector("h4+p").textContent=question.description;

    const container=answerContainer;

    container.innerHTML=question.answers.map(answer=>`

<button
type="button"
data-question="${currentQuestion}"
data-answer="${answer[2]}"
class="helpufind-answer group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition duration-300 hover:border-[#3B82F6]/40 hover:bg-[#3B82F6]/10">

<div class="flex-1">

<div class="text-lg font-bold text-[#08111F]">${answer[0]}</div>

<p class="mt-1 text-sm text-slate-500">${answer[1]}</p>

</div>

<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
</div>

<svg class="hidden h-5 w-5 shrink-0 text-[#3B82F6] checkmark-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

</button>

`).join("");

    answerButtons=document.querySelectorAll(".helpufind-answer");

    answerButtons.forEach(button=>{

        if(answers[currentQuestion]===button.dataset.answer){

            button.classList.add("border-[#3B82F6]","bg-[#3B82F6]/10");

            const cm=button.querySelector(".checkmark-icon");
            if(cm) cm.classList.remove("hidden");

            nextButton.disabled=false;

            nextButton.classList.remove("opacity-50","cursor-not-allowed");

        }

        button.addEventListener("click",()=>{

            answerButtons.forEach(item=>{
                item.classList.remove("border-[#3B82F6]","bg-[#3B82F6]/10");
                const cm=item.querySelector(".checkmark-icon");
                if(cm) cm.classList.add("hidden");
            });

            button.classList.add("border-[#3B82F6]","bg-[#3B82F6]/10");

            const cm=button.querySelector(".checkmark-icon");
            if(cm) cm.classList.remove("hidden");

            answers[currentQuestion]=button.dataset.answer;

            nextButton.disabled=false;

            nextButton.classList.remove("opacity-50","cursor-not-allowed");

        });

    });

}

                        const hasAnswer=Boolean(answers[currentQuestion]);

            nextButton.disabled=!hasAnswer;

            nextButton.classList.toggle(
                "opacity-50",
                !hasAnswer
            );

            nextButton.classList.toggle(
                "cursor-not-allowed",
                !hasAnswer
            );

            previousButton.disabled=currentQuestion===1;

            previousButton.classList.toggle(
                "cursor-not-allowed",
                currentQuestion===1
            );

            previousButton.classList.toggle(
                "text-slate-500",
                currentQuestion===1
            );

            previousButton.classList.toggle(
                "text-[#08111F]",
                currentQuestion>1
            );

            const step2=document.getElementById("sidebar-step-2");
            const step2Status=document.getElementById("sidebar-step-2-status");

            if(step2){

                step2.classList.toggle(
                    "opacity-60",
                    currentQuestion===1
                );

            }

            if(step2Status){

                step2Status.textContent=currentQuestion===1
                    ?"Waiting..."
                    :"In progress";

            }

        });

    }

    // Event delegation for View Vehicle buttons
    document.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-view-vehicle]");
        if (btn) {
            e.preventDefault();
            const vehicleId = btn.dataset.vehicleId;
            if (vehicleId) {
                navigate("/vehicle?id=" + vehicleId);
            }
        }
    });

}
