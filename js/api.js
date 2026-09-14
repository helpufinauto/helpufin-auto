/*
====================================================
SUPABASE CONNECTION
====================================================
*/

const SUPABASE_URL = "https://wkmsibpenpllkkjlidgu.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbXNpYnBlbnBsbGtramxpZGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDA0NDcsImV4cCI6MjA4OTIxNjQ0N30.Z3OHNLueU4HcFm3WrgG6oaexmOgQbPfYNjc2_WdxDZY";

export const supabase = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

/* ====================================================
PHASE 1 — SITE-WIDE ZIP RESTRICTION
Every storage upload passes through the shared
file validation helpers. ZIP/archive files are
rejected by extension, MIME type AND content.
==================================================== */

import {
rejectZipFile
} from "./fileValidation.js";


/* ====================================================
🔥 SELLER PROFILE + LIMIT SYSTEM
==================================================== */

/* GET USER PROFILE */
export async function getUserProfile(){

  if(cachedProfile){
    return cachedProfile;
  }

  const user =
  await getAuthUser();

  if(!user){
    return null;
  }

  const {
    data,
    error
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

if(error || !data){

if(window.DEBUG_AUTH){

console.log(
    "Creating missing profile"
);

}

  const {
    data:newProfile,
    error:createError
  } = await supabase
    .from("profiles")
    .insert({

      id: user.id,

      name:
      user.user_metadata?.name ||
      null,

      surname:
      user.user_metadata?.surname ||
      null,

      email:
      user.email,

      account_type:
      user.user_metadata?.account_type ||
      "private",

dealership_name:
user.user_metadata?.dealership_name ||
null,

dealership_logo:
user.user_metadata?.dealership_logo ||
null,

/* PHASE 3 — the new dealership contact +
   social fields flow through the SAME
   metadata → profiles path. Existing users
   are unaffected (this fallback only runs
   when no profile row exists yet). */

dealership_email:
user.user_metadata?.dealership_email ||
null,

phone:
user.user_metadata?.phone ||
null,

dealership_address:
user.user_metadata?.dealership_address ||
null,

social_links:
user.user_metadata?.social_links &&
typeof user.user_metadata.social_links === "object"
? user.user_metadata.social_links
: {},

/* PHASE 6 — optional contact info captured at signup.
   Travels through the same metadata → profiles path.
   Blank fields default to null. */

mobile_number:
user.user_metadata?.mobile_number || null,

whatsapp_number:
user.user_metadata?.whatsapp_number || null,

alternative_contact:
user.user_metadata?.alternative_contact || null,

/* PHASE 7 — optional profile fields captured at
   signup. Same metadata → profiles path. Blank
   fields default to null. */

bio:
user.user_metadata?.bio || null,

location:
user.user_metadata?.location || null,

city:
user.user_metadata?.city || null,

province:
user.user_metadata?.province || null,

website:
user.user_metadata?.website || null,

avatar_url:
user.user_metadata?.avatar_url || null,

role: "user"

    })
    .select()
    .single();

  if(createError){

    /* PHASE 4 — PostgREST code/message only;
       never the full object (may embed row
       data such as the user id). */
    console.error(
      "Profile creation failed",
      {
        code: createError?.code,
        message: createError?.message
      }
    );

    return null;

  }

  cachedProfile =
  newProfile;

  return newProfile;

}

  cachedProfile = data;

  return data;

}

/* GET USER LIMIT */
export async function getUserLimit(){

  const sub = await getUserSubscription();

  return sub?.vehicle_limit ?? 1;
}
/* CHECK IF USER CAN UPLOAD */
export async function canUploadVehicle(){

  const { data:userData } = await supabase.auth.getUser();

  if(!userData.user) return false;

  const userId = userData.user.id;

  /* GET CURRENT COUNT */
  const { count } = await supabase
    .from("vehicles")
    .select("*",{ count:"exact", head:true })
    .eq("seller_id", userId);

  const limit = await getUserLimit();

  return (count || 0) < limit;
}

window.sb = supabase;

/* =========================================
🔥 CENTRAL AUTH CACHE
========================================= */

let cachedUser = null;
let cachedProfile = null;

/* GET AUTH USER */
export async function getAuthUser(){

  if(cachedUser){
    return cachedUser;
  }

  const {
data:{ user }
} = await supabase.auth.getUser();

cachedUser =
user || null;

  return cachedUser;

}

/* CLEAR AUTH CACHE */
export function clearAuthCache(){

  cachedUser = null;
  cachedProfile = null;
  cachedSubscription = null;

}

/* =========================================
🔥 ROLE HELPERS
========================================= */

export async function isAuthenticated(){

  const user =
  await getAuthUser();

  return !!user;

}

export async function isDealer(){

  const profile =
  await getUserProfile();

  return (
    profile?.account_type ===
    "dealer"
  );

}

export async function isPrivateSeller(){

  const profile =
  await getUserProfile();

  return (
    profile?.account_type ===
    "private"
  );

}

export async function isAdmin(){

  const profile =
  await getUserProfile();

  return (
    profile?.role ===
    "admin"
  );

}

let cachedSubscription = null;

export async function getUserSubscription(){

  if(cachedSubscription){
    return cachedSubscription;
  }

  const profile = await getUserProfile();
  if(!profile) return null;

  if(!profile.subscription_id){

    /* PHASE 4 — Launch Promotion is the only package
       assigned during signup. Accounts created without
       an explicit subscription therefore resolve to
       Launch Promotion so the per-account-type limits
       (private 5 active / 2 featured, dealer 50 / 15)
       apply. vehicle_limit is a fallback baseline only;
       the active-listing limit is resolved by account
       type in the dashboard package-limit logic. */
    return {
      name: "Launch Promotion",
      vehicle_limit: 5
    };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", profile.subscription_id)
    .single();

  if(error || !data){
    if(window.DEBUG_AUTH){

console.warn(
"Subscription fetch failed"
);

}
    return {
      name: "Private Basic",
      vehicle_limit: 1
    };
  }

  cachedSubscription = data;

  return data;
}

/* =========================================
🔥 AUTH STATE CONTROL (STRICT MODE - FIXED)
========================================= */

supabase.auth.onAuthStateChange(
async (event, session) => {

if(window.DEBUG_AUTH){

console.log(
    "AUTH EVENT:",
    event
);

}

  /* =====================================
  UPDATE AUTH CACHE
  ===================================== */

  cachedUser =
  session?.user || null;

if(!session?.user){
    cachedProfile = null;
    cachedSubscription = null;
}

  /* =====================================
  EMAIL VERIFICATION DETECTION
  ===================================== */

  if(event === "SIGNED_IN"){

    const fullUrl =
    window.location.href;

    const isVerification =
      fullUrl.includes("access_token") &&
      fullUrl.includes("type=signup");

    if(isVerification){

      if(window.DEBUG_AUTH){

console.log(
"Email verification detected → forcing login"
);

}

      await supabase.auth.signOut();

      if(window.navigate){
        window.navigate("/login");
      }else{
        window.location.replace(
          "/login"
        );
      }

      return;

    }

  }

  /* =====================================
  PASSWORD RECOVERY DETECTION (PHASE 11)
  ===================================== */

  if(event === "PASSWORD_RECOVERY"){

    /* A recovery link signed the user in through
       Supabase Auth. Only a boolean marker is
       kept — the session, its tokens and any
       credentials are never read or logged. The
       /reset-password page picks the flow up
       through the normal session state. */

    window.__HUFA_PASSWORD_RECOVERY__ = true;

  }

  /* =====================================
  FORCE NAVBAR REFRESH
  ===================================== */

  window.dispatchEvent(
    new CustomEvent(
      "authChanged"
    )
  );

});

/* =========================================
🔥 PHASE 3 — MFA (TOTP) HELPERS
Thin helpers over the EXISTING Supabase Auth
MFA APIs (supabase.auth.mfa.*). No custom TOTP
logic is implemented here and no client-side
"MFA passed" boolean exists — the Supabase
Authenticator Assurance Level (AAL) is the
single source of truth.

Nothing in this section is cached: factor state
is always read fresh so a factor enrolled or
removed in another tab is reflected immediately.
No factor ids, secrets, codes or challenge ids
are ever logged or stored.
========================================= */

/* CURRENT vs NEXT ASSURANCE LEVEL
   Returns { currentLevel, nextLevel,
   currentLevelCandidates } for the signed-in
   session, or null when unavailable. */
export async function getMfaAssurance(){

  try{

    const { data, error } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if(error){
      return null;
    }

    return data || null;

  }catch(err){
    return null;
  }

}

/* MFA OWED?
   True when password authentication succeeded
   (currentLevel "aal1") but a VERIFIED second
   factor is still owed (nextLevel "aal2").
   This is the exact signal used by BOTH the
   centralized router guard and the login flow.
   nextLevel only reports "aal2" for factors with
   status "verified" — an unverified enrollment
   can never trigger it. */
export async function needsMfaVerification(){

  const user =
  await getAuthUser();

  if(!user){
    return false;
  }

  const assurance =
  await getMfaAssurance();

  if(!assurance){
    return false;
  }

  return (
    assurance.currentLevel === "aal1" &&
    assurance.nextLevel === "aal2"
  );

}

/* VERIFIED TOTP FACTOR
   Returns the user's verified TOTP factor, or
   null. Unverified enrollments are deliberately
   ignored — only "verified" factors count as
   enabled MFA. */
export async function getVerifiedTotpFactor(){

  try{

    const { data, error } =
      await supabase.auth.mfa.listFactors();

    if(error || !data){
      return null;
    }

    const factors =
    Array.isArray(data.totp) ? data.totp : [];

    return (
      factors.find(
        (f) => f?.status === "verified"
      ) || null
    );

  }catch(err){
    return null;
  }

}

/* GENERIC MFA ERROR MESSAGE
   Maps a Supabase MFA failure to a short,
   user-facing message. Raw Supabase internals,
   tokens, codes and challenge ids are never
   surfaced, logged or stored. */
export function describeMfaError(error){

  const status =
  error?.status;

  const code =
  String(error?.code || "").toLowerCase();

  const message =
  String(error?.message || "").toLowerCase();

  if(
    status === 429 ||
    code.includes("rate") ||
    message.includes("too many") ||
    message.includes("rate limit")
  ){
    return "Too many attempts. Please wait a moment and try again.";
  }

  if(
    status === 400 ||
    status === 403 ||
    status === 422 ||
    code.includes("totp") ||
    code.includes("invalid") ||
    message.includes("totp") ||
    message.includes("invalid") ||
    message.includes("expired")
  ){
    return "That code is incorrect or has expired. Please try again.";
  }

  return "Something went wrong. Please try again.";

}

/* PHASE 4 — GENERIC AUTH ERROR MESSAGE
   Maps a Supabase Auth failure to a short,
   security-safe, user-facing message. Raw
   Supabase internals are never shown to users
   and never logged.

   The password-recovery pages keep their own
   generic messaging (account enumeration must
   stay impossible); this helper is used by the
   login, signup and reset-password error paths. */
export function describeAuthError(error, context){

  const code =
  String(error?.code || "").toLowerCase();

  const status =
  error?.status;

  const message =
  String(error?.message || "").toLowerCase();

  const ctx =
  String(context || "").toLowerCase();

  if(
    status === 429 ||
    code.includes("rate") ||
    message.includes("too many") ||
    message.includes("rate limit")
  ){
    return "Too many attempts. Please wait a moment and try again.";
  }

  if(
    code.includes("invalid_credentials") ||
    message.includes("invalid login credentials") ||
    message.includes("invalid email or password")
  ){
    return ctx === "signup"
      ? "Could not create your account. Please check your details and try again."
      : "Invalid email or password. Please try again.";
  }

  if(
    code.includes("email_not_confirmed") ||
    message.includes("email not confirmed")
  ){
    return "Please confirm your email address first — check your inbox for the verification link.";
  }

  if(
    code.includes("user_already_exists") ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ){
    return "An account with this email address already exists. Try logging in instead.";
  }

  if(
    code.includes("weak_password") ||
    code.includes("password_too_short") ||
    message.includes("password should be at least") ||
    message.includes("password is too weak")
  ){
    return "That password is too weak. Please choose a stronger one.";
  }

  if(
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("connection")
  ){
    return "Connection issue — please check your internet and try again.";
  }

  if(ctx === "resetPassword"){
    return "Could not update your password. Please try again.";
  }

  if(ctx === "signup"){
    return "Could not create your account. Please try again.";
  }

  return "Something went wrong. Please try again.";

}

/* =========================================
🔥 VEHICLE INTEREST + LEAD SYSTEM
========================================= */

export async function createVehicleInterest({

  vehicleId,
  sellerId,
  buyerFirstName,
  buyerName,
  buyerEmail,
  buyerPhone,
  buyerSurname,
  buyerMessage

}){

  /* =====================================
  CONFIRM THE LIVE SESSION BEFORE INSERT

  getUser() alone can report a user while the
  underlying access token attached to REST
  requests is missing or expired — PostgREST
  then evaluates the INSERT as "anon", no
  INSERT RLS policy applies, and the database
  returns 42501 "new row violates row-level
  security policy". Reading the actual session
  (and refreshing it when stale) guarantees
  supabase-js sends a current authenticated
  JWT with the insert.
  ===================================== */

  let { data:sessionData } =
  await supabase.auth.getSession();

  if(!sessionData?.session){
    return {
      error: "LOGIN_REQUIRED"
    };
  }

  /* Refresh proactively if the token is expired
     or expiring within 60 seconds */
  const expiresAtMs =
  sessionData.session.expires_at
    ? sessionData.session.expires_at * 1000
    : null;

  if(
    expiresAtMs &&
    Date.now() > expiresAtMs - 60000
  ){

    const { data:refreshed } =
    await supabase.auth.refreshSession();

    if(!refreshed?.session){
      return {
        error: "LOGIN_REQUIRED"
      };
    }

    sessionData = refreshed;

  }

  /* buyer_id always comes from the SAME live
     session that signs the INSERT request, so
     it is guaranteed to equal auth.uid()
     inside the existing RLS policy */
  const user = sessionData.session.user;

  /* =====================================
  PREVENT DUPLICATES
  ===================================== */

  const { data:existing } =
  await supabase
    .from("vehicle_interest")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if(existing){

    return {
      error: "ALREADY_INTERESTED"
    };

  }

  /* =====================================
  CREATE INTEREST
  ===================================== */

  /* Single contact detail is stored in buyer_name for
     backward-compatibility; surname + message are persisted
     in the newer buyer_surname / buyer_message columns when
     the migration has been applied. */
  const basePayload = {

    vehicle_id: vehicleId,
    seller_id: sellerId,
    buyer_id: user.id,

    buyer_name: buyerName,
    buyer_email: buyerEmail,
    buyer_phone: buyerPhone

  };

  if(buyerSurname != null){
    basePayload.buyer_surname = buyerSurname;
  }

  if(buyerMessage != null){
    basePayload.buyer_message = buyerMessage;
  }

  let { error } =
  await supabase
    .from("vehicle_interest")
    .insert(basePayload);

  /* Fallback: if the extended columns don't exist yet
     (migration not applied), retry with only the original
     columns so interest still registers.
     PostgREST reports unknown insert payload columns as
     PGRST204 ("Could not find the 'x' column ... schema
     cache"); 42703 is the raw Postgres SQLSTATE. */
  if(
    error &&
    (String(error.code) === "PGRST204" ||
     String(error.code) === "42703")
  ){

    const { error: fallbackError } =
    await supabase
      .from("vehicle_interest")
      .insert({

        vehicle_id: vehicleId,
        seller_id: sellerId,
        buyer_id: user.id,

        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone

      });

    error = fallbackError;

  }

  if(error){

    /* Structured console output for debugging.
       Supabase PostgREST errors contain only
       code/message/details/hint — never tokens. */
    console.error("Vehicle interest failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });

    return {
      error: "INSERT_FAILED",
      code: error.code || null
    };

  }

  /* =====================================
  CREATE CRM LEAD (enquiries)
  The existing CRM/lead system is the
  `enquiries` table (the same table the
  Contact Seller flow and the CRM dashboard
  use). Writing here surfaces the interest as
  a real CRM lead with status "interested",
  linked to the vehicle + dealer, and carrying
  the buyer's details. We reuse that structure
  instead of building a parallel CRM.
  ===================================== */

  const { data:veh } =
  await supabase
    .from("vehicles")
    .select("make,model,year")
    .eq("id", vehicleId)
    .single();

  const vehicleTitle =
  veh
  ? [veh.year, veh.make, veh.model]
    .filter(Boolean)
    .join(" ")
  : "";

  const enquiryPayload = {

    user_id: user.id,
    seller_id: sellerId,
    vehicle_id: vehicleId,

    vehicle_title: vehicleTitle,

    lead_source: "vehicle_interest",

    name: buyerFirstName || buyerName || "",
    surname: buyerSurname || "",
    email: buyerEmail || "",
    phone: buyerPhone || "",

    /* Default message makes the purchase intent explicit */
    message:
    (buyerMessage || "").trim()
    || `Interested in purchasing this ${vehicleTitle || "vehicle"}.`,

    status: "interested"

  };

  let enquiryResult =
  await supabase
    .from("enquiries")
    .insert(enquiryPayload)
    .select("id")
    .single();

  let enquiryError = enquiryResult.error;
  let enquiryLeadId = enquiryResult.data?.id || null;

  /* Fallback: drop the newer columns if they haven't been
     migrated yet so the lead still registers. PostgREST
     reports unknown insert payload columns as PGRST204;
     42703 is the raw Postgres SQLSTATE. */
  if(
    enquiryError &&
    (String(enquiryError.code) === "PGRST204" ||
     String(enquiryError.code) === "42703")
  ){

    const { error: fb, data: fbData } =
    await supabase
      .from("enquiries")
      .insert({

        user_id: user.id,
        seller_id: sellerId,
        vehicle_id: vehicleId,

        name: buyerFirstName || buyerName || "",
        email: buyerEmail || "",
        phone: buyerPhone || "",

        message:
        (buyerMessage || "").trim()
        || `Interested in purchasing this vehicle.`,

        status: "interested"

      })
      .select("id")
      .single();

    enquiryError = fb;
    enquiryLeadId = fbData?.id || enquiryLeadId;

  }

  if(enquiryError){

    console.error("CRM lead (enquiries) write failed:", {
      code: enquiryError.code,
      message: enquiryError.message,
      details: enquiryError.details,
      hint: enquiryError.hint
    });

    /* The interest was still recorded in vehicle_interest;
       surface a soft warning so the caller knows. */
    return {
      error: "ENQUIRY_WRITE_FAILED",
      code: enquiryError.code || null
    };

  }

  /* =====================================
  CREATE DEALER NOTIFICATION
  ===================================== */

  await supabase
    .from("notifications")
    .insert({

      user_id: sellerId,

      title: "New Interested Buyer",

      message:
      `${buyerName || "A buyer"} is interested in your vehicle. Contact them at ${buyerEmail || "their email"}${buyerPhone ? ` or ${buyerPhone}` : ""}.${buyerSurname ? ` (${buyerSurname})` : ""}${buyerMessage ? ` Details: ${buyerMessage}` : ""}`

    });

  /* =====================================
  CRM NOTIFICATION — surfaces immediately in
  the dealer's CRM notification panel + badge.
  Best-effort: the preceding `notifications`
  insert is the guaranteed path; if the CRM
  notification can't be written (e.g. RLS
  scoping this request to the buyer), the
  interest submission still succeeds.
  ===================================== */

  if(enquiryLeadId){

    try{

      await supabase
        .from("crm_notifications")
        .insert({

          lead_id: enquiryLeadId,
          dealer_id: sellerId,

          title: "New Vehicle Interest",

          message:
          `${buyerFirstName || buyerName || "A buyer"}${buyerSurname ? ` ${buyerSurname}` : ""} is interested in ${vehicleTitle || "your vehicle"}. Please follow up.`

        });

    }catch(crmNotifError){

      console.warn(
        "CRM notification insert skipped:",
        crmNotifError
      );

    }

  }

  return {
    success: true
  };

}

/* =========================================
🔥 MESSAGING HELPERS
========================================= */

export async function getInboxConversations(){

const user =
await getAuthUser();

if(!user){
return [];
}

const { data:messages, error } =
await supabase
.from("messages")
.select("*")
.or(
`sender_id.eq.${user.id},receiver_id.eq.${user.id}`
)
.order("created_at", {
ascending:false
});

if(error){

console.error(
"Inbox fetch failed:",
error
);

return [];

}

if(!messages?.length){
return [];
}

/* =====================================
SAFE VEHICLE IDS
===================================== */

const vehicleIds =
[
...new Set(
(messages || [])
.map(m => m.vehicle_id)
.filter(v => !!v)
)
];

/* =====================================
LOAD VEHICLES
===================================== */

let vehicleMap = {};

if(vehicleIds.length){

const { data:vehicles } =
await supabase
.from("vehicles")
.select(`
id,
make,
model,
year,
price,
image_url
`)
.in("id", vehicleIds);

(vehicles || []).forEach(v=>{

vehicleMap[v.id] = v;

});

}

/* =====================================
GROUP CONVERSATIONS
===================================== */

const grouped = {};

(messages || []).forEach(m=>{

const otherUser =
m.sender_id === user.id
? m.receiver_id
: m.sender_id;

/* =====================================
SAFE KEY
===================================== */

const key =
`${otherUser}_${m.vehicle_id || "general"}`;

if(!grouped[key]){

grouped[key] = {

vehicle:
vehicleMap[m.vehicle_id] || {

make:"General",
model:"Conversation",
year:"",
price:0

},

messages: [],

latest: m,

unread: 0,

otherUser

};

}

grouped[key].messages.push(m);

if(
!m.is_read &&
m.receiver_id === user.id
){
grouped[key].unread++;
}

});

/* =====================================
SORT
===================================== */

return Object.values(grouped)
.sort((a,b)=>{

const aDate =
new Date(
a.latest?.created_at || 0
).getTime();

const bDate =
new Date(
b.latest?.created_at || 0
).getTime();

return bDate - aDate;

});

}
/* =========================================
GET CONVERSATION THREAD
========================================= */

export async function getConversationThread({

vehicleId,
otherUserId

}){

const user =
await getAuthUser();

if(!user){
return [];
}

const { data, error } =
await supabase
.from("messages")
.select("*")
.eq("vehicle_id", vehicleId)
.order("created_at", {
ascending:true
});

if(error){

console.error(
"Thread fetch failed:",
error
);

return [];

}

return (data || []).filter(m=>

(
m.sender_id === user.id &&
m.receiver_id === otherUserId
)

||

(
m.sender_id === otherUserId &&
m.receiver_id === user.id
)

);

}

/* =========================================
SEND MESSAGE
========================================= */

export async function sendConversationMessage({

receiverId,
vehicleId,
message,
phone=""

}){

const user =
await getAuthUser();

if(!user){

return {
error:"LOGIN_REQUIRED"
};

}

if(!receiverId){

return {
error:"NO_RECEIVER"
};

}

if(!message?.trim()){

return {
error:"EMPTY_MESSAGE"
};

}

/* =====================================
INSERT MESSAGE
===================================== */

const {
data,
error
} = await supabase
.from("messages")
.insert({

sender_id:user.id,

receiver_id:receiverId,

vehicle_id:vehicleId,

message,

phone,

is_read:false

})
.select()
.single();

if(error){

console.error(
"Send message failed:",
error
);

return {
error:error.message
};

}

/* =====================================
NOTIFY RECEIVER
===================================== */

await supabase
.from("notifications")
.insert({

user_id: receiverId,

title:"New Message",

message:
message?.slice(0,80) ||
"New conversation message"

});

return {
success:true,
message:data
};

}
/* =========================================
RESOLVE LEAD CONVERSATION (CRM MESSAGE LEAD)

Resolves an enquiries row to the canonical
buyer + seller + vehicle conversation using
the SAME data model the enquiry flow in
vehicle.js uses (conversations row + messages
row). Idempotent:

- If a messages row already exists for the
  buyer/dealer/vehicle pair, nothing is
  created (resolved only).
- If the enquiry exists but the conversation
  or its initial message does not, the
  legitimate conversation is established from
  the real enquiry data (enquiry text becomes
  the initial buyer message — sent by the
  buyer, exactly as the enquiry flow does).
- If the enquiry itself cannot be found, an
  error is returned so the dealer sees a
  clear message instead of an empty inbox.
========================================= */

export async function resolveLeadConversation(leadId){

const user =
await getAuthUser();

if(!user){
return { error:"LOGIN_REQUIRED" };
}

if(!leadId){
return { error:"NO_LEAD" };
}

/* =====================================
FETCH THE REAL ENQUIRY
===================================== */

const { data:lead, error:leadError } =
await supabase
.from("enquiries")
.select("id,user_id,seller_id,vehicle_id,message,phone")
.eq("id", leadId)
.maybeSingle();

if(leadError){

console.error(
"Lead conversation lookup failed:",
leadError
);

return { error:"LEAD_LOOKUP_FAILED" };

}

if(!lead || !lead.user_id || !lead.vehicle_id){
return { error:"LEAD_NOT_FOUND" };
}

const buyerId = lead.user_id;
const dealerId = lead.seller_id || user.id;
const vehicleId = lead.vehicle_id;

/* =====================================
CHECK EXISTING MESSAGE PAIR
The same buyer + dealer + vehicle must
always resolve to the same conversation.
If any messages row already exists for
this pair/vehicle, resolve only — no
inserts, no duplicates.
===================================== */

const { data:existingMessage } =
await supabase
.from("messages")
.select("id,conversation_id")
.eq("vehicle_id", vehicleId)
.or(
`sender_id.eq.${buyerId},receiver_id.eq.${dealerId}`
)
.limit(1)
.maybeSingle();

if(existingMessage){
return {
success:true,
created:false,
conversationId:
existingMessage.conversation_id || null,
vehicle_id:vehicleId,
user_id:buyerId,
seller_id:dealerId
};
}

/* =====================================
CREATE / GET CONVERSATION
(same mechanism as vehicle.js enquiry flow)
===================================== */

let conversationId = null;

const { data:existingConversation } =
await supabase
.from("conversations")
.select("id")
.eq("buyer_id", buyerId)
.eq("seller_id", dealerId)
.eq("vehicle_id", vehicleId)
.maybeSingle();

if(existingConversation){

conversationId = existingConversation.id;

}else{

const { data:newConversation, error:conversationError } =
await supabase
.from("conversations")
.insert({
buyer_id:buyerId,
seller_id:dealerId,
vehicle_id:vehicleId
})
.select()
.single();

if(conversationError){

console.error(
"Conversation creation failed:",
conversationError
);

return { error:"CONVERSATION_CREATE_FAILED" };

}

conversationId = newConversation.id;

}

/* =====================================
SEED INITIAL MESSAGE FROM THE ENQUIRY
The enquiry text becomes the initial
buyer message — inserted BY the buyer,
exactly as the enquiry flow in
vehicle.js does.
===================================== */

const { error:messageError } =
await supabase
.from("messages")
.insert({
conversation_id:conversationId,
sender_id:buyerId,
receiver_id:dealerId,
vehicle_id:vehicleId,
message:lead.message || "Vehicle enquiry",
phone:lead.phone || ""
});

if(messageError){

console.error(
"Initial message insert failed:",
messageError
);

return { error:"MESSAGE_CREATE_FAILED" };

}

return {
success:true,
created:true,
conversationId,
vehicle_id:vehicleId,
user_id:buyerId,
seller_id:dealerId
};

}

/* =========================================
MARK CONVERSATION READ
========================================= */

export async function markConversationRead({

vehicleId,
otherUserId

}){

const user =
await getAuthUser();

if(!user){
return;
}

await supabase
.from("messages")
.update({
is_read:true
})
.eq("vehicle_id", vehicleId)
.eq("sender_id", otherUserId)
.eq("receiver_id", user.id);

}
/* =========================================
MARK MESSAGE NOTIFICATIONS READ
========================================= */

export async function markMessageNotificationsRead({

otherUserId,
vehicleId

}){

const user =
await getAuthUser();

if(!user){
return;
}

await supabase
.from("notifications")
.update({
is_read:true
})
.eq("user_id", user.id)
.ilike("title","New Message");

}

/* =========================================
CRM PRODUCTIVITY LAYER
========================================= */

/* =====================================
PIN CONVERSATION
===================================== */

export async function pinConversation({

otherUserId,
vehicleId

}){

const user =
await getAuthUser();

if(!user){
return;
}

await supabase
.from("conversation_preferences")
.upsert({

user_id:user.id,

other_user_id:otherUserId,

vehicle_id:vehicleId,

is_pinned:true

});

}

/* =====================================
UNPIN CONVERSATION
===================================== */

export async function unpinConversation({

otherUserId,
vehicleId

}){

const user =
await getAuthUser();

if(!user){
return;
}

await supabase
.from("conversation_preferences")
.delete()
.eq("user_id", user.id)
.eq("other_user_id", otherUserId)
.eq("vehicle_id", vehicleId);

}

/* =====================================
ARCHIVE CONVERSATION
===================================== */

export async function archiveConversation({

otherUserId,
vehicleId

}){

const user =
await getAuthUser();

if(!user){
return;
}

await supabase
.from("conversation_preferences")
.upsert({

user_id:user.id,

other_user_id:otherUserId,

vehicle_id:vehicleId,

is_archived:true

});

}

/* =====================================
GET CONVERSATION PREFERENCES
===================================== */

export async function getConversationPreferences(){

const user =
await getAuthUser();

if(!user){
return [];
}

const { data } =
await supabase
.from("conversation_preferences")
.select("*")
.eq("user_id", user.id);

return data || [];

}

/* =========================================
PRESENCE SYSTEM
========================================= */

export async function updatePresence({

isOnline=true,
isTyping=false

}={}){

const user =
await getAuthUser();

if(!user){
return;
}

await supabase
.from("user_presence")
.upsert({

user_id:user.id,

is_online:isOnline,

is_typing:isTyping,

last_seen:
new Date().toISOString(),

updated_at:
new Date().toISOString()

});

}

/* =========================================
GET USER PRESENCE
========================================= */

export async function getUserPresence(userId){

if(!userId){
return null;
}

const { data } =
await supabase
.from("user_presence")
.select("*")
.eq("user_id", userId)
.maybeSingle();

return data || null;

}

/* =========================================
🔥 MESSAGE ATTACHMENTS
========================================= */

export async function uploadMessageAttachment({

messageId,
file

}){

const user =
await getAuthUser();

if(!user){

return {
error:"LOGIN_REQUIRED"
};

}

if(!file){

return {
error:"NO_FILE"
};

}

/* PHASE 1 — site-wide ZIP restriction.
   Message attachments keep their existing
   open format support (PDF, DOC, images, etc.)
   but ZIP/archive files are always rejected —
   by extension, MIME type AND actual content,
   before any Supabase Storage upload occurs. */

const zipCheck =
await rejectZipFile(file);

if(!zipCheck.ok){

console.error(
"Attachment rejected:",
zipCheck.error
);

return {
error:"ZIP_NOT_ALLOWED",
detail: zipCheck.error
};

}

/* =====================================
SAFE FILE NAME
===================================== */

const extension =
file.name.split(".").pop();

const fileName =
`${Date.now()}-${Math.random()
.toString(36)
.slice(2)}.${extension}`;

/* =====================================
UPLOAD TO STORAGE
===================================== */

const { error:uploadError } =
await supabase.storage
.from("message-files")
.upload(
fileName,
file,
{
cacheControl:"3600",
upsert:false
}
);

if(uploadError){

console.error(
"Attachment upload failed:",
uploadError
);

return {
error:"UPLOAD_FAILED"
};

}

/* =====================================
GET PUBLIC URL
===================================== */

const {
data:urlData
} = supabase.storage
.from("message-files")
.getPublicUrl(fileName);

const fileUrl =
urlData?.publicUrl;

/* =====================================
SAVE DATABASE RECORD
===================================== */

const { error:dbError } =
await supabase
.from("message_attachments")
.insert({

message_id: messageId,

file_url: fileUrl,

file_name: file.name,

file_type: file.type

});

if(dbError){

console.error(
"Attachment DB insert failed:",
dbError
);

return {
error:"DB_INSERT_FAILED"
};

}

return {
success:true,
fileUrl
};

}

/* =========================================
GET MESSAGE ATTACHMENTS
========================================= */

export async function getMessageAttachments(messageIds=[]){

if(!messageIds.length){
return [];
}

const { data, error } =
await supabase
.from("message_attachments")
.select("*")
.in("message_id", messageIds);

if(error){

console.error(
"Attachment fetch failed:",
error
);

return [];

}

return data || [];

}