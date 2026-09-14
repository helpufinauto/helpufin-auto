import {

supabase,
getAuthUser,

getInboxConversations,
getConversationThread,
sendConversationMessage,
markConversationRead,
markMessageNotificationsRead,

pinConversation,
unpinConversation,
archiveConversation,
getConversationPreferences,

updatePresence,
getUserPresence,

getMessageAttachments

} from "../js/api.js";
import { renderDashboardShell, renderDashboardPageHeading } from "./dashboard.js";

let realtimeChannel = null;
let activeConversation = null;

let threadLoading = false;

let crmSearch = "";
let crmFilter = "all";

/* CRM "Message Lead" hand-off payload. Read
once at page init (then removed from
sessionStorage) and kept here so every
loadMessages() run — including bounded
retries — can still resolve the lead's
canonical conversation. */
let pendingCrmHandoff = null;

/* Guards against a stale async loadMessages()
render clobbering a newer one (e.g. direct
refresh racing the realtime-triggered refresh
after Mark Read writes to the messages table). */
let loadSequence = 0;

let conversationPrefs = [];

export function MessagesPage(){

setTimeout(initMessagesPage,0);

return `

${renderDashboardShell({
  activeNav: "messages",
  mobileTitle: "Messages",
  content: `
<div class="max-w-7xl mx-auto px-4 md:px-6 py-6 msg-page">

${renderDashboardPageHeading("messages")}

<div class="card p-4 md:p-5 mb-4">

<div class="
msg-toolbar
flex
flex-col
sm:flex-row
gap-3
sm:items-center
sm:justify-between
">

<div class="relative w-full sm:max-w-xs">

<input
id="crmSearch"
type="text"
class="crm-search"
placeholder="Search buyers, vehicles or messages..."
autocomplete="off"
/>

<button
id="crmSearchClear"
type="button"
class="msg-search-clear hidden"
onclick="clearMessagesSearch()"
aria-label="Clear search"
>
✕
</button>

<p class="msg-search-hint">Press Esc to clear</p>

</div>

<div class="crm-filter-row msg-filter-row">

<button class="crm-filter-btn active" data-filter="all">All</button>

<button class="crm-filter-btn" data-filter="unread">Unread</button>

<button class="crm-filter-btn" data-filter="pinned">Pinned</button>

</div>

</div>

</div>

<div
id="messagesContainer"
class="msg-workspace">

<!-- Initial skeleton state: shown immediately on first paint so the page
     never displays an empty area before conversations load. loadMessages()
     replaces this with the two-column messaging workspace (conversation
     list + active conversation). -->
<div class="msg-workspace-grid">

<div class="msg-list">

${renderConversationSkeletons(3)}

</div>

</div>
<div class="msg-thread-col">

<div class="msg-thread-card msg-thread-placeholder">

<div class="msg-chat-header">

<div class="msg-avatar msg-avatar-idle">HU</div>

<div class="min-w-0">

<p class="msg-chat-title">Select a conversation</p>

<p class="msg-chat-sub">Choose a buyer conversation from the list to view its full message history.</p>

</div>

</div>

<div class="msg-chat-body msg-chat-body-empty">

<div class="space-y-3 w-full max-w-sm">

<div class="skeleton-shimmer h-10 w-2/3 rounded-2xl"></div>

<div class="skeleton-shimmer h-10 w-1/2 rounded-2xl ml-auto"></div>

<div class="skeleton-shimmer h-10 w-3/5 rounded-2xl"></div>

</div>

</div>

</div>

</div>

</div>

</div>

</div>
  `}
)}

<div
id="imageLightbox"
class="image-lightbox hidden"
onclick="closeImageLightbox()"
>

<img
id="lightboxImage"
class="lightbox-image"
/>

</div>

`;


}

/* =========================================
LOADING SKELETONS (PHASE 10)
Mirror the eventual content — conversation cards
(title + badge, vehicle meta, message preview,
timestamp and action buttons) and chat bubbles
(alternating left/right) — using the shared
.skeleton-shimmer language from css/styles.css.
Replaced by loadMessages()/openConversation() with
real content or the existing empty states.
========================================= */

function renderConversationSkeletons(count = 3){

const skeletonCard = () => `

<div class="
card
p-6
message-conversation-card
">

  <div class="
  flex
  justify-between
  items-start
  gap-6
  flex-wrap
  ">

    <div class="flex-1 min-w-[220px]">

      <div class="flex items-center gap-2 flex-wrap">
        <div class="skeleton-shimmer h-6 w-48 rounded-md"></div>
        <div class="skeleton-shimmer h-5 w-20 rounded-full"></div>
      </div>

      <div class="mt-2">
        <div class="skeleton-shimmer h-3.5 w-40 rounded"></div>
      </div>

      <div class="mt-4 space-y-1.5">
        <div class="skeleton-shimmer h-3.5 w-full max-w-md rounded"></div>
        <div class="skeleton-shimmer h-3.5 w-2/3 max-w-xs rounded"></div>
      </div>

      <div class="mt-3">
        <div class="skeleton-shimmer h-3 w-24 rounded"></div>
      </div>

    </div>

    <div class="
    flex
    flex-col
    gap-2
    items-stretch
    sm:items-end
    w-full
    sm:w-auto
    ">

      <div class="skeleton-shimmer h-10 w-full sm:w-32 rounded-lg"></div>

      <div class="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
        <div class="skeleton-shimmer h-9 w-24 rounded-lg"></div>
        <div class="skeleton-shimmer h-9 w-24 rounded-lg"></div>
        <div class="skeleton-shimmer h-9 w-20 rounded-lg"></div>
      </div>

    </div>

  </div>

</div>

`;

return Array(count).fill(0).map(()=>skeletonCard()).join("");

}

function renderThreadSkeleton(){

const bubble = (side) => `

<div class="
message-bubble
${side === "left" ? "message-received" : "message-sent"}
">

  <div class="space-y-1.5">
    <div class="skeleton-shimmer h-3.5 w-48 rounded"></div>
    <div class="skeleton-shimmer h-3.5 w-32 rounded"></div>
  </div>

  <div class="mt-2 flex items-center justify-end gap-2">
    <div class="skeleton-shimmer h-2.5 w-16 rounded"></div>
  </div>

</div>

`;

return `

<div class="space-y-4">

  <div class="message-thread-shell">

    ${bubble("left")}
    ${bubble("right")}
    ${bubble("left")}

  </div>

</div>

`;

}

async function initMessagesPage(){

  

conversationPrefs =
await getConversationPreferences();

await updatePresence({
isOnline:true
});

initCRMControls();

/* Read + consume the CRM "Message Lead"
hand-off BEFORE the first load so the
canonical-conversation rescue inside
loadMessages() can use it. Kept in module
state (pendingCrmHandoff) for retries. */

let crmLead = null;

try{

crmLead =
JSON.parse(
sessionStorage.getItem(
"crmConversationLead"
) || "null"
);

}catch(parseError){

crmLead = null;

}

pendingCrmHandoff = crmLead;

if(crmLead){

sessionStorage.removeItem(
"crmConversationLead"
);

}

await loadMessages();

if(crmLead){

/* CRM "Message Lead" hand-off: locate THIS lead's
   conversation in the loaded inbox and open it with
   the EXISTING openConversation(index) — the same
   function the "Open Chat" list button uses.

   Why an awaited re-check loop instead of a single
   check: openConversation() needs the rendered
   conversation-${index} panels, which only exist
   after loadMessages() completes; and a documented
   transient in this app (getAuthUser() resolving
   late) can make an early getInboxConversations()
   return [] and render the empty state WITHOUT
   assigning window.currentConversations. So on a
   miss we explicitly await a fresh loadMessages()
   — bounded, not indefinite — and on final miss we
   show the dealer a clear inline error instead of
   stranding them on the silent empty state. */

let checkRound = 0;

const maxCheckRounds = 10;

const findLeadConversationIndex = () => {

const conversations =
window.currentConversations || [];

/* Primary: exact buyer + vehicle pair
   (otherUser = buyer_id, latest.vehicle_id). */

if(crmLead.user_id){

const exact =
conversations.findIndex(c =>

String(c.latest?.vehicle_id) ===
String(crmLead.vehicle_id)

&&

String(c.otherUser) ===
String(crmLead.user_id)

);

if(exact >= 0){
return exact;
}

}

/* Fallback: vehicle only (legacy behaviour). */

return conversations.findIndex(c =>

String(c.latest?.vehicle_id) ===
String(crmLead.vehicle_id)

);

};

while(checkRound < maxCheckRounds){

const index =
findLeadConversationIndex();

if(index >= 0){

/* EXISTING conversation-opening mechanism —
   identical to a manual "Open Chat" click. */

openConversation(index);

/* Hand-off consumed: stop the CRM rescue
   merge from re-applying this lead on every
   future loadMessages() run. */

pendingCrmHandoff = null;

break;

}

checkRound++;

if(checkRound < maxCheckRounds){

await loadMessages();

}

}

/* If still not found after the bounded rounds:
   leave a clear, visible message for the dealer
   instead of the generic empty state. Nothing is
   inserted anywhere. */

if(
pendingCrmHandoff &&
findLeadConversationIndex() < 0
){

const threadCol =
document.querySelector(
".msg-thread-col"
);

if(threadCol){

const notice =
document.createElement("div");

notice.className =
"msg-thread-card p-4";

notice.style.marginTop = "12px";

notice.innerHTML = `
<p style="font-weight:600;margin:0 0 4px 0;">
Could not open this lead's conversation
</p>
<p style="margin:0;font-size:13px;opacity:.75;">
The enquiry exists, but its conversation could
not be loaded. Please refresh the page or check
your connection, then try "Message Lead" again.
</p>
`;

threadCol.appendChild(notice);

}

console.error(
"Message Lead hand-off: conversation not found for lead identifiers",
crmLead
);

pendingCrmHandoff = null;

}

}

initRealtimeMessaging();

}

/* =========================================
CRM CONTROLS
========================================= */

function initCRMControls(){

const search =
document.getElementById(
"crmSearch"
);

if(search){

search.addEventListener(
"input",
async (e)=>{

crmSearch =
e.target.value.toLowerCase();

updateSearchClearState();

await loadMessages();

}
);

search.addEventListener(
"keydown",
async (e)=>{

if(e.key === "Escape" && crmSearch){

e.preventDefault();

crmSearch = "";

search.value = "";

updateSearchClearState();

await loadMessages();

search.focus();

}

}
);

}

document
.querySelectorAll(
".crm-filter-btn"
)
.forEach(btn=>{

btn.addEventListener(
"click",
async ()=>{

document
.querySelectorAll(
".crm-filter-btn"
)
.forEach(b=>{

b.classList.remove(
"active"
);

});

btn.classList.add(
"active"
);

crmFilter =
btn.dataset.filter;

await loadMessages();

}
);

});

}

/* =========================================
SEARCH CLEAR UX (PHASE 2)
Keeps the existing crmSearch value in sync
with the visible clear button.
========================================= */

function updateSearchClearState(){

const clearBtn =
document.getElementById(
"crmSearchClear"
);

if(!clearBtn){
return;
}

clearBtn.classList.toggle(
"hidden",
!crmSearch
);

}

window.clearMessagesSearch =
async function(){

crmSearch = "";

const search =
document.getElementById(
"crmSearch"
);

if(search){
search.value = "";
search.focus();
}

updateSearchClearState();

await loadMessages();

};

/* =========================================
REALTIME
========================================= */

function initRealtimeMessaging(){

if(realtimeChannel){

supabase.removeChannel(
realtimeChannel
);

}

let realtimeRefreshTimeout;

realtimeChannel =
supabase
.channel("messages-realtime")
.on(
"postgres_changes",
{
event:"*",
schema:"public",
table:"messages"
},
async ()=>{

clearTimeout(
realtimeRefreshTimeout
);

realtimeRefreshTimeout =
setTimeout(
async ()=>{

await loadMessages(true);

},
150
);

}
)
.subscribe();

}

/* =========================================
LOAD CONVERSATIONS
========================================= */

async function loadMessages(isRealtime=false){

const loadToken = ++loadSequence;

let conversations =
await getInboxConversations();

/* A newer load was started while this one
was in flight — discard this stale result */
if(loadToken !== loadSequence){
return;
}

/* =====================================
CRM LEAD CONVERSATION RESCUE

The dealer inbox is built ONLY from raw
messages rows. A lead's canonical
conversations row (created by the enquiry
flow with buyer_id/seller_id/vehicle_id)
can exist WITHOUT any visible messages
rows — in that case the inbox shows
nothing and the CRM "Message Lead" flow
could never find the conversation.

While a CRM lead hand-off is pending
(crmConversationLead), resolve the
canonical conversations row for the
lead's buyer + vehicle and merge it into
the list in the SAME shape as a normal
message group. Read-only: nothing is
inserted anywhere. The thread then loads
via the existing getConversationThread
and the existing reply box renders.
===================================== */

const crmHandoff =
pendingCrmHandoff;

if(
crmHandoff?.user_id &&
crmHandoff?.vehicle_id
){

const alreadyListed =
conversations.some(c =>

String(c.latest?.vehicle_id) ===
String(crmHandoff.vehicle_id)

&&

String(c.otherUser) ===
String(crmHandoff.user_id)

);

if(!alreadyListed){

const authUser =
await getAuthUser();

if(loadToken !== loadSequence){
return;
}

if(authUser){

/* Canonical conversation row — the same
   record the enquiry flow creates and the
   exact identifier set (buyer_id +
   seller_id + vehicle_id) the messaging
   system already uses. Read-only. */

const { data:crmConversation } =
await supabase
.from("conversations")
.select("id,buyer_id,seller_id,vehicle_id,created_at")
.eq("buyer_id", crmHandoff.user_id)
.eq("seller_id", authUser.id)
.eq("vehicle_id", crmHandoff.vehicle_id)
.maybeSingle();

if(loadToken !== loadSequence){
return;
}

if(crmConversation){

const { data:crmVehicle } =
await supabase
.from("vehicles")
.select("id,make,model,year,price,image_url")
.eq("id", crmConversation.vehicle_id)
.maybeSingle();

if(loadToken !== loadSequence){
return;
}

conversations.push({

vehicle:
crmVehicle || {

make:"General",
model:"Conversation",
year:"",
price:0

},

messages:[],

latest:{

vehicle_id:
crmConversation.vehicle_id,

created_at:
crmConversation.created_at,

message:"",

phone:"",

is_read:true

},

unread:0,

otherUser:
crmConversation.buyer_id

});

}

}

}

}

/* =====================================
ATTACH PREFERENCES
===================================== */

const uniqueUsers = [

...new Set(
conversations.map(
c=>c.otherUser
)
)

];

const presenceList =
await Promise.all(

uniqueUsers.map(userId=>
getUserPresence(userId)
)

);

if(loadToken !== loadSequence){
return;
}

conversations =
conversations.map(c=>{

  const presence =
presenceList.find(
p => String(p?.user_id) === String(c.otherUser)
);

const pref =
conversationPrefs.find(p=>

p.other_user_id ===
c.otherUser

&&

String(p.vehicle_id) ===
String(c.latest?.vehicle_id)

);

return {

...c,

isPinned:
pref?.is_pinned || false,

isArchived:
pref?.is_archived || false,

isOnline:
presence?.is_online || false,

isTyping:
presence?.is_typing || false,

lastSeen:
presence?.last_seen || null

};

});

/* =====================================
SEARCH FILTER
===================================== */

conversations =
conversations.filter(c=>{

if(c.isArchived){
return false;
}

const text = `
${c.vehicle?.make || ""}
${c.vehicle?.model || ""}
${c.latest?.message || ""}
`
.toLowerCase();

const leadScore =
getLeadScore(c);

/* SEARCH */
if(
crmSearch &&
!text.includes(crmSearch)
){
return false;
}

/* FILTERS */
if(
crmFilter === "unread" &&
c.unread <= 0
){
return false;
}

if(
crmFilter === "hot" &&
leadScore < 90
){
return false;
}

if(
crmFilter === "pinned" &&
!c.isPinned
){
return false;
}

return true;

});

/* =====================================
CRM SORTING
===================================== */

conversations =
conversations.sort((a,b)=>{

/* PINNED FIRST */
if(a.isPinned && !b.isPinned){
return -1;
}

if(!a.isPinned && b.isPinned){
return 1;
}

const scoreA =
getLeadScore(a);

const scoreB =
getLeadScore(b);

return scoreB - scoreA;

});

const box =
document.getElementById(
"messagesContainer"
);

if(!box){
return;
}

if(!conversations.length){

const isFiltered =
Boolean(crmSearch) ||
crmFilter !== "all";

box.innerHTML = `
<div class="msg-workspace-grid">

<div class="msg-list">

<div class="msg-row msg-empty-state">

${
isFiltered
? `

<div class="msg-empty-icon msg-empty-icon-search">
🔍
</div>

<p class="msg-empty-title">No matching conversations</p>

<p class="msg-empty-sub">No conversations match your current search or filter.</p>

<button
onclick="clearMessagesSearch()"
class="btn btn-dark btn-sm"
>
Clear Search
</button>

`
: `

<div class="msg-empty-icon">
💬
</div>

<p class="msg-empty-title">No conversations yet</p>

<p class="msg-empty-sub">Buyer enquiries about your vehicles will appear here.</p>

`
}

</div>

</div>

<div class="msg-thread-col">

<div class="msg-thread-card msg-thread-placeholder">

<div class="msg-chat-header">

<div class="msg-avatar msg-avatar-idle">HU</div>

<div class="min-w-0">

<p class="msg-chat-title">No active conversation</p>

<p class="msg-chat-sub">Once buyers start messaging you, select a conversation to reply.</p>

</div>

</div>

</div>

</div>

</div>
`;


return;


}



/* =========================================
CONVERSATION LIST (COMPACT ROWS) + THREAD COLUMN
Purely presentational rebuild of loadMessages()
output. All ids, handlers, filtering, sorting and
preserve-open-thread behaviour are unchanged.
========================================= */

const listHtml =
conversations.map((c,index)=>{

return `
<div class="
message-conversation-card
msg-row
${c.unread > 0 ? 'message-unread-card' : ''}
">

<div class="msg-row-top">

<h2 class="msg-row-title">

${c.vehicle?.make || ""}
${c.vehicle?.model || ""}

</h2>

${c.unread > 0
? `<div class="msg-row-status msg-row-status-unread">
<span class="msg-row-status-dot"></span>
<span class="msg-row-status-text">Unread</span>
<div class="message-unread-badge msg-row-badge">
${c.unread}
</div>
</div>`
: `<div class="msg-row-status msg-row-status-read">
<span class="msg-row-status-dot"></span>
<span class="msg-row-status-text">Read</span>
</div>`
}

</div>

<p class="msg-row-meta">

${c.vehicle?.year || ""}
•
R ${Number(c.vehicle?.price || 0).toLocaleString()}

</p>

<p class="msg-row-preview">
${c.latest?.message || ""}
</p>

<div class="msg-row-bottom">

<span class="msg-row-time">
${c.latest?.created_at
? formatSATime(c.latest.created_at)
: ""}
</span>

${c.isPinned
? `
<span class="msg-row-pin">
Pinned
</span>
`
: ""
}

</div>

<div class="msg-row-actions">

<button
onclick="openConversation(${index})"
class="btn btn-gold btn-sm">
Open Chat
</button>

<button
onclick="toggleConversationRead(${index})"
class="btn btn-dark btn-sm">
${c.unread > 0 ? 'Mark Read' : 'Mark Unread'}
</button>

<button
onclick="replyWhatsapp('${c.latest?.phone || ""}')"
class="btn btn-dark btn-sm">
WhatsApp
</button>

<button
onclick="toggleConversationPin(${index})"
class="btn btn-dark btn-sm">
${c.isPinned ? 'Unpin' : 'Pin'}
</button>


<button
onclick="deleteConversation(${index})"
class="btn btn-sm msg-btn-danger">
Delete
</button>

</div>

</div>
`;

}).join("");

const threadsHtml =
conversations.map((c,index)=>`

<div
id="conversation-${index}"
class="hidden msg-thread-panel"
></div>

`).join("");

box.innerHTML = `
<div class="msg-workspace-grid">

<div class="msg-list">

${listHtml}

</div>

<div class="msg-thread-col">

<div class="msg-thread-card msg-thread-placeholder">

<div class="msg-chat-header">

<div class="msg-avatar msg-avatar-idle">HU</div>

<div class="min-w-0">

<p class="msg-chat-title">Select a conversation</p>

<p class="msg-chat-sub">Choose a buyer conversation from the list to view its full message history.</p>

</div>

</div>

<div class="msg-chat-body msg-chat-body-empty">

<div class="space-y-3 w-full max-w-sm">

<div class="skeleton-shimmer h-10 w-2/3 rounded-2xl"></div>

<div class="skeleton-shimmer h-10 w-1/2 rounded-2xl ml-auto"></div>

<div class="skeleton-shimmer h-10 w-3/5 rounded-2xl"></div>

</div>

</div>

</div>

${threadsHtml}

</div>

</div>
`;

window.currentConversations =
conversations;

/* =====================================
PRESERVE OPEN THREAD
Re-open the currently active conversation
after any list refresh (realtime OR manual
actions like mark read/unpin/send reply)
so the open chat is never collapsed.
===================================== */

if(activeConversation){

const conversationIndex =
conversations.findIndex(c=>

String(c.latest?.vehicle_id) ===
String(activeConversation.vehicleId)

&&

String(c.otherUser) ===
String(activeConversation.otherUserId)

);

if(conversationIndex >= 0){

requestAnimationFrame(()=>{

openConversation(
conversationIndex,
true
);

});

}

}

}

/* =========================================
CRM HELPERS
========================================= */
function formatSATime(date){

if(!date){
return "";
}

const now =
new Date();

const saDate =
new Date(
new Date(date).toLocaleString(
'en-US',
{
timeZone:'Africa/Johannesburg'
}
)
);

const diffMs =
now - saDate;

const diffMinutes =
Math.floor(
diffMs / 60000
);

const diffHours =
Math.floor(
diffMinutes / 60
);

const diffDays =
Math.floor(
diffHours / 24
);

/* =====================================
JUST NOW
===================================== */

if(diffMinutes < 1){
return "Just now";
}

/* =====================================
MINUTES
===================================== */

if(diffMinutes < 60){

return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;

}

/* =====================================
HOURS
===================================== */

if(diffHours < 24){

return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

}

/* =====================================
YESTERDAY
===================================== */

if(diffDays === 1){

return `Yesterday • ${
new Intl.DateTimeFormat(
'en-ZA',
{
timeZone:'Africa/Johannesburg',
hour:'2-digit',
minute:'2-digit',
hour12:false
}
).format(new Date(date))
}`;

}

/* =====================================
WITHIN WEEK
===================================== */

if(diffDays < 7){

return new Intl.DateTimeFormat(
'en-ZA',
{
timeZone:'Africa/Johannesburg',
weekday:'long',
hour:'2-digit',
minute:'2-digit',
hour12:false
}
).format(new Date(date));

}

/* =====================================
FULL DATE
===================================== */

return new Intl.DateTimeFormat(
'en-ZA',
{
timeZone:'Africa/Johannesburg',

day:'2-digit',
month:'short',
year:'numeric',

hour:'2-digit',
minute:'2-digit',

hour12:false
}
).format(new Date(date));

}

function getLeadScore(conversation){

let score = 0;

if(conversation.unread > 0){
score += 50;
}

const latestDate =
conversation.latest?.created_at
? new Date(
conversation.latest.created_at
).getTime()
: 0;

const now = Date.now();

const diffHours =
(now - latestDate)
/
(1000 * 60 * 60);

if(diffHours < 2){
score += 35;
}
else if(diffHours < 24){
score += 20;
}

const latestMessage =
String(
conversation.latest?.message || ""
).toLowerCase();

if(
latestMessage.includes("finance") ||
latestMessage.includes("cash") ||
latestMessage.includes("buy") ||
latestMessage.includes("available")
){
score += 25;
}

return score;

}

function getLeadLabel(score){

if(score >= 90){

return {
label:"Hot Lead",
className:"crm-hot"
};

}

if(score >= 55){

return {
label:"Active Buyer",
className:"crm-warm"
};

}

return {
label:"General Inquiry",
className:"crm-cold"
};

}

window.toggleConversationRead =
async function(index){

const conversation =
window.currentConversations[index];

if(!conversation){
return;
}

/* Obtain the authenticated user through the SAME auth helper the
   rest of the messaging pipeline already uses (getInboxConversations,
   markConversationRead, getConversationThread, etc. all call
   getAuthUser(), which returns the established, cached session for the
   logged-in user).

   Using a raw supabase.auth.getUser() here was the actual failure:
   that fresh look-up returned no user in this run (the log "
   toggleConversationRead aborted: no authenticated user" fired) even
   though the user was plainly logged in and getInboxConversations had
   just rendered their conversations via getAuthUser(). That aborted the
   handler before the Supabase UPDATE could ever run, so the read-state
   never changed. Switching to getAuthUser() returns the same valid
   user.id the inbox was built from, so Mark Read / Mark Unread reach
   the database. */
const user =
await getAuthUser();

if(!user){
console.error(
"[messages] toggleConversationRead aborted: no authenticated user"
);
return;
}

const vehicleId =
conversation.latest?.vehicle_id;

const otherUser =
conversation.otherUser;

/* Root cause of the "Mark Read does nothing" bug:
the api.js markConversationRead() / markMessageNotificationsRead()
wrappers discard the Supabase result and error (they `await` the
update and return nothing), so a failed / empty update was silently
swallowed AND — because this handler had no try/finally — any thrown
write aborted before `loadMessages()`, leaving the UI permanently
frozen on the old unread state.

We persist read/unread using the SAME is_read field and the SAME
query semantics (matching the mark-unread path that already writes
directly from this file), but the write is now awaited and its error
is surfaced. `finally` guarantees `loadMessages()` always re-renders
the list from the real persisted conversation state. */
try{

/* =====================================
CONFIRM THE LIVE SESSION BEFORE WRITE

getAuthUser()/getUser() can report a user
while the JWT attached to REST requests is
expired — PostgREST then evaluates the
UPDATE as "anon", RLS filters every row,
and the database returns success with 0
changed rows. This is the same pitfall
documented on createVehicleInterest() in
js/api.js. Refresh the session when it is
expired / expiring within 60s so the
UPDATE carries a valid authenticated JWT.
===================================== */

let { data:writeSession } =
await supabase.auth.getSession();

if(!writeSession?.session){
throw new Error("SESSION_REQUIRED");
}

const writeExpiresAtMs =
writeSession.session.expires_at
? writeSession.session.expires_at * 1000
: null;

if(
writeExpiresAtMs &&
Date.now() > writeExpiresAtMs - 60000
){

const { data:refreshedSession } =
await supabase.auth.refreshSession();

if(!refreshedSession?.session){
throw new Error("SESSION_REFRESH_FAILED");
}

writeSession = refreshedSession;

}

if(conversation.unread > 0){

/* MARK AS READ — all incoming messages for this
conversation (incoming message → current user). */
/* Write WITH .select("id") so PostgREST returns
the rows it actually updated — a silent 0-row
match can then be detected instead of trusted. */
const { data:readRows, error:readError } =
await supabase
.from("messages")
.update({
is_read:true
})
.eq("vehicle_id", vehicleId)
.eq("sender_id", otherUser)
.eq("receiver_id", user.id)
.select("id");

if(readError){
throw readError;
}

/* VERIFY PERSISTENCE — re-read what the DB says,
never trust the UPDATE response alone. If any
incoming message is still is_read=false the
UPDATE was silently filtered (RLS / identifier
mismatch) even without an explicit error. */
const { data:stillUnread, error:verifyError } =
await supabase
.from("messages")
.select("id")
.eq("vehicle_id", vehicleId)
.eq("sender_id", otherUser)
.eq("receiver_id", user.id)
.eq("is_read", false);

if(verifyError){
throw verifyError;
}

if(stillUnread?.length){

const persistErr =
new Error("MARK_READ_DID_NOT_PERSIST");

persistErr.detail =
`${readRows?.length || 0} row(s) matched but ${stillUnread.length} incoming message(s) remain is_read=false`;

console.error(
"[messages] Mark Read did NOT persist:",
{
vehicleId,
otherUser,
matchedRows: readRows?.length || 0,
stillUnreadIds:
stillUnread.map(r=>r.id)
}
);

throw persistErr;

}

/* Also clear related message notifications so the
badge state stays consistent (non-fatal if it fails). */
try{

await markMessageNotificationsRead({
otherUserId: otherUser,
vehicleId
});

}catch(notifErr){

console.error(
"[messages] markMessageNotificationsRead:",
notifErr
);

}

}else{

/* MARK AS UNREAD — latest incoming message */
const { data:latestMsg, error:selError } =
await supabase
.from("messages")
.select("id")
.eq("vehicle_id", vehicleId)
.eq("sender_id", otherUser)
.eq("receiver_id", user.id)
.order("created_at", {
ascending:false
})
.limit(1)
.maybeSingle();

if(selError){
throw selError;
}

if(latestMsg?.id){

const { data:unreadRows, error:unreadError } =
await supabase
.from("messages")
.update({
is_read:false
})
.eq("id", latestMsg.id)
.select("id");

if(unreadError){
throw unreadError;
}

/* VERIFY PERSISTENCE — confirm the message is
now actually unread in the database. */
const { data:unreadVerify, error:unreadVerifyError } =
await supabase
.from("messages")
.select("id, is_read")
.eq("id", latestMsg.id)
.maybeSingle();

if(unreadVerifyError){
throw unreadVerifyError;
}

if(!unreadVerify?.id || unreadVerify.is_read !== false){

console.error(
"[messages] Mark Unread did NOT persist:",
{
vehicleId,
otherUser,
matchedRows: unreadRows?.length || 0,
messageId: latestMsg.id
}
);

throw new Error("MARK_UNREAD_DID_NOT_PERSIST");

}

}

}

}catch(err){

/* Never silently continue on failure — surface the actual
error, identifiers and PostgREST code/hint so the exact
point of failure (auth, RLS or query) is diagnosable. */
console.error(
"[messages] toggleConversationRead failed",
{
vehicleId,
otherUser,
receiverId: user.id,
code: err?.code || null,
detail: err?.detail || null,
hint: err?.hint || null,
message: err?.message || String(err)
}
);

/* A read-state change that fails must never look
like a no-op click — tell the user explicitly. */
alert(
"Could not update read state" +
(err?.code ? ` (${err.code})` : "") +
": " +
(err?.message || "unknown error")
);

}finally{

/* Always re-render from the real persisted conversation
state so the badge, indicator, button label and Unread
filter reflect what actually happened. */
await loadMessages();

}

};

/* =========================================
PIN / UNPIN CONVERSATION
Uses the existing pinConversation /
unpinConversation API functions and refreshes
the local preferences so the Pinned filter,
sorting and row badge stay in sync.
========================================= */

window.toggleConversationPin =
async function(index){

const conversation =
window.currentConversations[index];

if(!conversation){
return;
}

try{

if(conversation.isPinned){

await unpinConversation({

vehicleId:
conversation.latest.vehicle_id,

otherUserId:
conversation.otherUser

});

}else{

await pinConversation({

vehicleId:
conversation.latest.vehicle_id,

otherUserId:
conversation.otherUser

});

}

/* Re-read preferences so isPinned flags
are authoritative before re-rendering */

conversationPrefs =
await getConversationPreferences();

await loadMessages();

}
catch(error){

/* Keep the conversation visible and the
current state intact on failure */

console.error(
"Pin/unpin conversation failed:",
error
);

alert(
"Failed to update pin status"
);

}

};

window.replyWhatsapp = function(phone){

if(!phone){

alert("No phone number available");
return;

}

const cleaned =
String(phone)
.replace(/\D/g,"");

window.open(
`https://wa.me/${cleaned}`,
"_blank"
);

};

/* =========================================
OPEN THREAD
========================================= */

/* =========================================
SELECTED ROW STATE (PHASE 2)
Highlights the conversation row matching the
currently open thread. Purely presentational.
========================================= */

function markSelectedRow(selectedIndex){

document
.querySelectorAll(
".msg-list .msg-row"
)
.forEach((row,rowIndex)=>{

row.classList.toggle(
"msg-row-active",
rowIndex === selectedIndex
);

});

}

window.openConversation =
async function(index, preserve=false){

if(
threadLoading &&
!preserve
){
return;
}

threadLoading = true;

try{

const conversation =
window.currentConversations[index];

if(!conversation){
return;
}

activeConversation = {

vehicleId:
conversation.latest?.vehicle_id,

otherUserId:
conversation.otherUser

};

const threadBox =
document.getElementById(
`conversation-${index}`
);

if(!threadBox){
return;
}

const visible =
!threadBox.classList.contains(
"hidden"
);

if(!preserve){

document
.querySelectorAll(
'[id^="conversation-"]'
)
.forEach(el=>{

el.classList.add("hidden");

});

markSelectedRow(-1);

if(visible){
return;
}

}

markSelectedRow(index);

threadBox.classList.remove(
"hidden"
);

threadBox.innerHTML = renderThreadSkeleton();

const thread =
await getConversationThread({
  

vehicleId:
conversation.latest.vehicle_id,

otherUserId:
conversation.otherUser

});

const attachments =
await getMessageAttachments(

thread.map(m=>m.id)

);

/* Only persist read-state on a genuine user
open — NOT on preserve-reopens after list
refreshes (those already had it marked,
and re-calling would duplicate API calls
and re-trigger realtime refreshes) */
if(!preserve){

await markConversationRead({

vehicleId:
conversation.latest.vehicle_id,

otherUserId:
conversation.otherUser

});

await markMessageNotificationsRead({

otherUserId:
conversation.otherUser,

vehicleId:
conversation.latest.vehicle_id

});

}


threadBox.innerHTML = `
<div class="msg-thread-card msg-thread-active">

<div class="msg-chat-header">

<div class="msg-avatar">
${(conversation.vehicle?.make || "B").charAt(0).toUpperCase()}
</div>

<div class="min-w-0">

<p class="msg-chat-title">
${conversation.vehicle?.make || ""}
${conversation.vehicle?.model || ""}
</p>

<p class="msg-chat-sub">
${conversation.vehicle?.year || ""}
 • 
R ${Number(conversation.vehicle?.price || 0).toLocaleString()}
${conversation.isTyping ? " • typing…" : ""}
</p>

</div>

<div class="msg-chat-header-actions">

<button
onclick="replyWhatsapp('${conversation.latest?.phone || ""}')"
class="btn btn-dark btn-sm">
WhatsApp
</button>
</div>

</div>

<div class="message-thread-shell msg-chat-body">

${thread.map((m,messageIndex)=>{

const messageAttachments =
attachments.filter(a=>

a.message_id === m.id

);

/* =====================================
UNREAD DIVIDER
===================================== */

const previous =
thread[messageIndex - 1];

const showUnreadDivider =

m.sender_id ===
conversation.otherUser

&&

!m.is_read

&&

(
!previous ||
previous.is_read
);

return `

${
showUnreadDivider
? `
<div class="
message-unread-divider
">

<span>
Unread Messages
</span>

</div>
`
: ""
}

<div
data-message-id="${m.id}"
class="
message-bubble
${
m.sender_id ===
conversation.otherUser

? 'message-received'

: 'message-sent'
}
">

<div class="
message-bubble-text
">
${m.message || ""}
</div>

${
messageAttachments.length
? `

<div class="
message-attachments
">

${messageAttachments.map(file=>`

${
file.file_type?.startsWith("image/")

? `

<a
href="${file.file_url}"
target="_blank"
class="
message-image-link
">

<img
src="${file.file_url}"

onclick="
openImageLightbox(
'${file.file_url}'
)
"

class="
message-image-preview
cursor-pointer
"
/>

</a>

`

: file.file_type?.startsWith("audio/")

? `

<div class="
voice-message-card
">

<audio
controls
class="
voice-player
">

<source
src="${file.file_url}"
type="${file.file_type}"
>

</audio>

</div>

`

: `

<a
href="${file.file_url}"
target="_blank"
class="
message-file-card
">

<div class="
message-file-icon
">
📄
</div>

<div>

<div class="
message-file-name
">
${file.file_name || "Attachment"}
</div>

<div class="
message-file-type
">
${file.file_type || "File"}
</div>

</div>

</a>

`
}

`).join("")}

</div>

`
: ""
}

<div class="
message-reactions
">
</div>

<div class="
message-bubble-footer
">

<div class="
message-bubble-time
">
${m.created_at
? formatSATime(
m.created_at
)
: ""}
</div>

${
m.sender_id !== conversation.otherUser
? `
<div class="
message-status
${m.is_read ? 'seen' : 'sent'}
">
${m.is_read ? 'Seen' : 'Sent'}
</div>
`
: ""
}

</div>

</div>

`;
}).join("")}

</div>

<div class="message-compose-shell msg-compose" id="composeShell-${index}">

<textarea
id="replyBox-${index}"
class="input message-reply-box"
placeholder="Type your reply..."

oninput="
window.handleTyping(${index})
"

></textarea>

<div class="msg-compose-actions">

<span class="msg-compose-hint">Reply as dealer</span>

<button
onclick="sendReply(${index})"
class="btn btn-gold btn-sm">

Send Reply

</button>

</div>

</div>

</div>
`;
if(!preserve){

threadBox.scrollIntoView({
behavior:"smooth",
block:"start"
});

}

const replyBox =
document.getElementById(
`replyBox-${index}`
);

if(replyBox){
replyBox.focus();
}

}finally{

threadLoading = false;

}

};

/* =========================================
TYPING SYSTEM
========================================= */

let typingTimeout = null;

window.handleTyping =
async function(){

await updatePresence({
isOnline:true,
isTyping:true
});

clearTimeout(typingTimeout);

typingTimeout =
setTimeout(async ()=>{

await updatePresence({
isOnline:true,
isTyping:false
});

}, 1800);

};

/* =========================================
IMAGE LIGHTBOX
========================================= */

window.openImageLightbox =
function(url){

const lightbox =
document.getElementById(
"imageLightbox"
);

const image =
document.getElementById(
"lightboxImage"
);

if(
!lightbox ||
!image
){
return;
}

image.src = url;

lightbox.classList.remove(
"hidden"
);

document.body.style.overflow =
"hidden";

};

window.closeImageLightbox =
function(){

const lightbox =
document.getElementById(
"imageLightbox"
);

if(!lightbox){
return;
}

lightbox.classList.add(
"hidden"
);

document.body.style.overflow =
"";

};


window.sendReply =
async function(index){

const conversation =
window.currentConversations[index];

if(!conversation){
return;
}

const input =
document.getElementById(
`replyBox-${index}`
);

const message =
input.value.trim();

if(!message){
return;
}

input.disabled = true;

const sendButton =
document.querySelector(
`button[onclick="sendReply(${index})"]`
);

if(sendButton){
sendButton.disabled = true;
}


const result =
await sendConversationMessage({

receiverId:
conversation.otherUser,

vehicleId:
conversation.latest.vehicle_id,

message,

phone:
conversation.latest.phone || ""

});

input.disabled = false;

if(sendButton){
sendButton.disabled = false;
}

if(result?.error){

alert(
"Failed to send message"
);

return;

}

/* RESET */

input.value = "";

await loadMessages(true);

};

/* =========================================
DELETE CONVERSATION
========================================= */

window.deleteConversation =
async function(index){

const conversation =
window.currentConversations[index];

if(!conversation){
return;
}

const confirmed =
confirm(
"Delete this conversation?"
);

if(!confirmed){
return;
}

try{

const { error } =
await supabase
.from("messages")
.delete()
.eq(
"vehicle_id",
conversation.latest.vehicle_id
)
.or(
`sender_id.eq.${conversation.otherUser},receiver_id.eq.${conversation.otherUser}`
);

if(error){

console.error(
"Delete conversation failed:",
error
);

alert(
"Failed to delete conversation"
);

return;

}

/* If the deleted conversation was open,
close it intentionally so the empty
placeholder state is shown */

if(
activeConversation &&
String(activeConversation.vehicleId) ===
String(conversation.latest.vehicle_id)
&&
String(activeConversation.otherUserId) ===
String(conversation.otherUser)
){

activeConversation = null;

}

await loadMessages();

alert(
"Conversation deleted"
);

}
catch(error){

console.error(error);

alert(
"Something went wrong"
);

}

};

/* =========================================
CLEANUP
========================================= */

window.addEventListener(
"beforeunload",
()=>{

  updatePresence({
isOnline:false,
isTyping:false
});

if(realtimeChannel){

supabase.removeChannel(
realtimeChannel
);

}

}
);