import { navigate } from "../js/router.js";

export function AIAdvisor(){

setTimeout(bindAI);

return `

<div class="fixed bottom-6 right-6 z-50">

<!-- TOGGLE BUTTON -->
<button id="aiToggle"
class="bg-black text-white px-4 py-3 rounded-full shadow-lg">
AI
</button>

<!-- CHAT PANEL -->
<div id="aiPanel"
class="hidden mt-3 w-80 bg-white rounded-xl shadow-xl border flex flex-col">

<div class="p-3 border-b font-semibold">
AI Car Advisor
</div>

<div id="aiMessages"
class="p-3 space-y-2 h-64 overflow-y-auto text-sm">
<div class="text-gray-500">
Ask me anything about cars 👋
</div>
</div>

<div class="p-2 border-t flex gap-2">
<input id="aiInput"
placeholder="e.g. cheap suv under 300k"
class="flex-1 border p-2 rounded text-sm">
<button id="aiSend"
class="bg-black text-white px-3 rounded">
Send
</button>
</div>

</div>

</div>

`;

}


/* ========================== */

function bindAI(){

const toggle = document.getElementById("aiToggle");
const panel = document.getElementById("aiPanel");
const input = document.getElementById("aiInput");
const send = document.getElementById("aiSend");

toggle.onclick = ()=>{
panel.classList.toggle("hidden");
};

send.onclick = sendMessage;
input.onkeypress = (e)=>{
if(e.key==="Enter") sendMessage();
};

}


/* ========================== */

function sendMessage(){

const input = document.getElementById("aiInput");
const msg = input.value.trim();

if(!msg) return;

addMessage("user", msg);

/* simulate thinking */
setTimeout(()=>{

addMessage("ai", "Searching for the best matches...");

/* redirect to browse with query */
navigate("/browse?q=" + encodeURIComponent(msg));

},500);

input.value="";

}


/* ========================== */

function addMessage(type, text){

const box = document.getElementById("aiMessages");

box.innerHTML += `
<div class="${type==="user" ? "text-right" : ""}">
<span class="inline-block px-3 py-2 rounded 
${type==="user" ? "bg-black text-white" : "bg-gray-200"}">
${text}
</span>
</div>
`;

box.scrollTop = box.scrollHeight;

}
