import {
  PHASE2_SOCIAL_PLATFORMS,
  normalizeEditSocialValue,
  buildSocialLinks
} from "../js/socialProfile.js";

let pass = 0, fail = 0;
function check(label, cond){
  if(cond){ pass++; console.log("PASS:", label); }
  else { fail++; console.log("FAIL:", label); }
}

check("5 platforms defined", PHASE2_SOCIAL_PLATFORMS.length === 5);

let r = normalizeEditSocialValue("whatsapp", "27 82 123 4567");
check("whatsapp normalizes digits", r.ok && r.value === "27821234567");

r = normalizeEditSocialValue("whatsapp", "123");
check("whatsapp too short rejected", !r.ok);

r = normalizeEditSocialValue("facebook", "@MyMotors");
check("facebook handle → URL", r.ok && r.value === "https://facebook.com/MyMotors");

r = normalizeEditSocialValue("facebook", "https://facebook.com/MyMotors");
check("facebook URL accepted", r.ok && r.value === "https://facebook.com/MyMotors");

r = normalizeEditSocialValue("facebook", "https://twitter.com/x");
check("facebook wrong domain rejected", !r.ok);

r = normalizeEditSocialValue("instagram", "my_motors.sa");
check("instagram handle → URL", r.ok && r.value === "https://instagram.com/my_motors.sa");

r = normalizeEditSocialValue("instagram", "has space");
check("instagram invalid handle rejected", !r.ok);

r = normalizeEditSocialValue("tiktok", "https://tiktok.com/@mymotors");
check("tiktok URL accepted", r.ok);

r = normalizeEditSocialValue("other", "not a url");
check("other non-URL rejected", !r.ok);

r = normalizeEditSocialValue("other", "https://mymotors.co.za");
check("other URL accepted", r.ok);

r = normalizeEditSocialValue("whatsapp", "");
check("empty value allowed (clearing)", r.ok && r.value === "");

// PHASE 4 — buildSocialLinks
let links = buildSocialLinks({
  whatsapp: "27821234567",
  facebook: "https://facebook.com/mymotors",
  instagram: "",
  tiktok: null,
  other: "not-a-url"
});
check("buildSocialLinks: only provided platforms", links.length === 2);
check("buildSocialLinks: wa.me link built", links[0].href === "https://wa.me/27821234567" && links[0].label === "WhatsApp");
check("buildSocialLinks: facebook kept", links[1].href === "https://facebook.com/mymotors");
check("buildSocialLinks: icons attached", Boolean(links[0].icon) && Boolean(links[1].icon));

links = buildSocialLinks(null);
check("buildSocialLinks: null → empty", links.length === 0);

links = buildSocialLinks({});
check("buildSocialLinks: empty object → empty", links.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
