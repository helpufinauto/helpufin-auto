# =========================================================
# PHASE 5 — GITHUB PAGES FIRST-VISIT DEEP-LINK FALLBACK TESTS
# =========================================================
# Local Windows validation (no Node.js required on this machine).
# Mirrors scripts/phase5-ghpages-404-test.js (the canonical Node
# harness) and adds a live HTTP simulation.
#
#   Part A — STATIC: file presence, single router, single
#            base-path abstraction, Phase 4 boot intact,
#            service-worker registration intact, extension-set
#            parity with sw.js, no logging of URLs/tokens.
#   Part B — HTTP: a local HttpListener server that REPLAYS
#            GitHub Pages semantics (any missing path under
#            /helpufin-auto/ is answered with 404.html at
#            status 404, at the requested URL, no redirect).
#   Part C — BEHAVIOURAL: a JScript harness (run via cscript)
#            evals the REAL inline scripts extracted from
#            404.html and index.html against stubbed
#            location/sessionStorage/history/console, proving
#            URL + query + hash preservation, the localhost
#            gate, the asset guard, the TTL / cross-origin /
#            directory guards, and that recovery-hash tokens
#            are never logged.
#
# Run:  powershell -NoProfile -ExecutionPolicy Bypass ^
#         -File scripts\phase5-ghpages-404-test.ps1
# =========================================================

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$script:pass = 0
$script:fail = 0

$marker404     = "FIRST-VISIT DEEP-LINK FALLBACK"
$markerRestore = "FIRST-VISIT RESTORE"

function Section([string]$t){
  Write-Output ""
  Write-Output $t
}

function Check([string]$name, [bool]$ok, [string]$detail){
  if($ok){
    $script:pass++
    Write-Output ("  [OK]   " + $name)
  } else {
    $script:fail++
    $suffix = ""
    if($detail){ $suffix = "   {" + $detail + "}" }
    Write-Output ("  [FAIL] " + $name + $suffix)
  }
}

function Read-TextUtf8([string]$path){
  $sr = New-Object System.IO.StreamReader(
    $path, [System.Text.Encoding]::UTF8, $true)
  try { return $sr.ReadToEnd() } finally { $sr.Close() }
}

function Has([string]$text, [string]$needle){
  return $text.IndexOf($needle, [System.StringComparison]::Ordinal) -ge 0
}

function HasRegex([string]$text, [string]$pattern){
  return [regex]::IsMatch($text, $pattern)
}

function Extract-Script([string]$text, [string]$marker){
  $found = [regex]::Matches($text, '(?s)<script>(.*?)</script>')
  foreach($m in $found){
    if($m.Groups[1].Value.IndexOf($marker, [System.StringComparison]::Ordinal) -ge 0){
      return $m.Groups[1].Value
    }
  }
  return ""
}

function Extract-Extensions([string]$text){
  $m = [regex]::Match($text, 'ASSET_EXTENSIONS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)')
  if(-not $m.Success){ return $null }
  $found = [regex]::Matches($m.Groups[1].Value, '"(\.[a-z0-9]+)"')
  $list = @()
  foreach($x in $found){ $list += $x.Groups[1].Value }
  return ($list | Sort-Object)
}

# ---------------- PART A — STATIC ----------------

Section "[A. STATIC CHECKS]"

$idxText = Read-TextUtf8 (Join-Path $root "index.html")
$swText  = Read-TextUtf8 (Join-Path $root "sw.js")
$p404Path = Join-Path $root "404.html"
$p404Exists = Test-Path $p404Path
$p404Text = ""
if($p404Exists){ $p404Text = Read-TextUtf8 $p404Path }

Check "404.html exists at repository root" $p404Exists ""
Check "404.html contains the Phase 5 bootstrap" (Has $p404Text $marker404) ""
Check "index.html contains the Phase 5 restore script" (Has $idxText $markerRestore) ""

$script404 = Extract-Script $p404Text $marker404
$scriptRestore = Extract-Script $idxText $markerRestore
Check "Phase 5 inline scripts extractable for behavioural testing" (
  ($script404.Length -gt 0) -and ($scriptRestore.Length -gt 0)) (
  "404:" + $script404.Length + " restore:" + $scriptRestore.Length)

$routerDefRe = 'const\s+ROUTES\s*=|function\s+renderNotFound\b|async\s+function\s+navigate\b'
$baseDefRe = 'function\s+(getBasePath|getBaseUrl|stripBase|appUrl)\b|const\s+BASE_PATH\b'

$files = @(
  Get-ChildItem (
    Join-Path $root "js"),
    (Join-Path $root "components"),
    (Join-Path $root "pages") `
    -Recurse -Filter *.js | Select-Object -ExpandProperty FullName
)
$files += (Join-Path $root "sw.js")

$secondRouter = @(
  $files | Where-Object {
    $fn = $_
    ($fn -ne (Join-Path $root "js\router.js")) -and
    (HasRegex (Read-TextUtf8 $fn) $routerDefRe)
  }
)
Check "no second router exists outside js/router.js" (
  $secondRouter.Count -eq 0) ($secondRouter -join ", ")

$secondBase = @(
  $files | Where-Object {
    $fn = $_
    ($fn -ne (Join-Path $root "js\basePath.js")) -and
    (HasRegex (Read-TextUtf8 $fn) $baseDefRe)
  }
)
Check "no second base-path abstraction outside js/basePath.js" (
  $secondBase.Count -eq 0) ($secondBase -join ", ")

$p404HtmlCode = [regex]::Replace($p404Text, '(?s)<!--.*?-->', '')
$p404ScriptCode = [regex]::Replace($script404, '(?s)/\*.*?\*/', '')

Check "404.html defines no routes / router / base-path helpers" (
  (-not (HasRegex $p404ScriptCode $routerDefRe)) -and
  (-not (HasRegex $p404ScriptCode $baseDefRe))) ""
Check "404.html imports no application modules and has no base element (code, not comments)" (
  (-not (HasRegex $p404ScriptCode 'js/(router|app|basePath)\.js')) -and
  (-not (HasRegex $p404HtmlCode '<base\s'))) ""
Check "404.html is NOT a copy of the app shell (no app markup)" (
  (-not (Has $p404Text 'id="app"')) -and
  (-not (Has $p404Text 'js/app.js'))) ""

$bootIdx = $idxText.IndexOf("BASE-PATH BOOT", [System.StringComparison]::Ordinal)
$restoreIdx = $idxText.IndexOf($markerRestore, [System.StringComparison]::Ordinal)
$appIdx = $idxText.IndexOf('src="js/app.js"', [System.StringComparison]::Ordinal)
Check "Phase 4 base-path boot still present" ($bootIdx -ge 0) ""
Check "Phase 4 boot remains the FIRST head script (before restore)" (
  ($bootIdx -ge 0) -and ($restoreIdx -ge 0) -and ($bootIdx -lt $restoreIdx)) ""
Check "restore script runs before the app module (deferred)" (
  ($restoreIdx -ge 0) -and ($appIdx -ge 0) -and ($restoreIdx -lt $appIdx)) ""
Check "app module entry intact (js/app.js)" (
  HasRegex $idxText '<script\s+type="module"\s+src="js/app\.js">') ""
Check "service-worker registration intact (root + relative fallback)" (
  (Has $idxText "navigator.serviceWorker") -and
  (Has $idxText 'register("/sw.js")') -and
  (HasRegex $idxText 'register\("sw\.js"\)')) ""
Check "app root container intact" (Has $idxText 'id="app"') ""

$keyNeedle = '"' + "hufa:ghp-redirect" + '"'
Check "sessionStorage key identical in both documents" (
  (Has $p404Text $keyNeedle) -and (Has $idxText $keyNeedle)) ""
Check "TTL identical in both documents (300000 ms)" (
  (Has $p404Text "300000") -and (Has $idxText "300000")) ""
Check "404.html saves the FULL href (query + hash preserved)" (
  HasRegex $script404 'href:\s*location\.href') ""
Check "Phase 5 scripts never log to the console (tokens safe)" (
  (-not (HasRegex $script404 'console\.')) -and
  (-not (HasRegex $scriptRestore 'console\.'))) ""
Check "Phase 5 scripts reference no Supabase / auth modules" (
  (-not (HasRegex $script404 '(?i)supabase')) -and
  (-not (HasRegex $scriptRestore '(?i)supabase'))) ""

$swExts = Extract-Extensions $swText
$p404Exts = Extract-Extensions $p404Text
$swExtStr = ""
if($null -ne $swExts){ $swExtStr = (@($swExts) -join ",") }
$p404ExtStr = ""
if($null -ne $p404Exts){ $p404ExtStr = (@($p404Exts) -join ",") }
Check "404.html asset-extension guard matches sw.js exactly" (
  ($null -ne $swExts) -and ($null -ne $p404Exts) -and
  ($swExtStr -eq $p404ExtStr)) (
  "sw[" + @($swExts).Count + "]=" + $swExtStr +
  " 404[" + @($p404Exts).Count + "]=" + $p404ExtStr)

Check "sw.js: offline shell only refreshed by the app-root document" (
  HasRegex $swText 'isHtmlResponse\(response\)\s*&&\s*url\.href\s*===\s*INDEX_URL') ""
Check "sw.js: navigation fallback + offline shell intact" (
  (Has $swText "handleNavigation") -and
  (Has $swText "serveIndex") -and
  (Has $swText "storeShellCopy")) ""

# ---------------- PART B — HTTP SIMULATION ----------------

Section "[B. GITHUB PAGES HTTP SIMULATION]"

$sync = [hashtable]::Synchronized(@{})
$sync.Ready = $false
$sync.Port = 0
$sync.Error = ""
$sync.Seen = New-Object 'System.Collections.Generic.List[string]'

$serverCode = {
  param($rootPath, $syncState)

  function Write-Bytes($ctx, [int]$code, [string]$type, [byte[]]$bytes){
    $ctx.Response.StatusCode = $code
    $ctx.Response.ContentType = $type
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.OutputStream.Close()
  }

  $indexHtml = [System.IO.File]::ReadAllBytes((Join-Path $rootPath "index.html"))
  $notFoundHtml = [System.IO.File]::ReadAllBytes((Join-Path $rootPath "404.html"))

  $listener = $null
  for($i = 0; $i -lt 8; $i++){
    try{
      $port = Get-Random -Minimum 30000 -Maximum 60000
      $listener = New-Object System.Net.HttpListener
      $listener.Prefixes.Add("http://127.0.0.1:$port/")
      $listener.Start()
      $syncState.Port = $port
      $syncState.Listener = $listener
      $syncState.Ready = $true
      break
    } catch {
      $syncState.Error = $_.Exception.Message
      try { $listener.Close() } catch {}
      $listener = $null
    }
  }

  if(-not $listener){
    $syncState.Ready = $true
    return
  }

  try{
    while($listener.IsListening){
      $ctx = $listener.GetContext()
      try{
        $uri = $ctx.Request.Url
        [void]$syncState.Seen.Add($uri.PathAndQuery)
        $pathname = [System.Uri]::UnescapeDataString($uri.AbsolutePath)
        $rootFull = [System.IO.Path]::GetFullPath($rootPath)

        if(($pathname -eq "/") -or ($pathname -eq "/index.html")){
          Write-Bytes $ctx 200 "text/html; charset=utf-8" $indexHtml
        } elseif($pathname.StartsWith("/helpufin-auto/")){
          if($pathname -eq "/helpufin-auto/"){
            Write-Bytes $ctx 200 "text/html; charset=utf-8" $indexHtml
          } else {
            $rel = $pathname.Substring("/helpufin-auto/".Length)
            $candidate = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))
            if(
              $candidate.StartsWith($rootFull) -and
              [System.IO.File]::Exists($candidate)
            ){
              $type = "application/octet-stream"
              if($candidate.EndsWith(".js")){
                $type = "text/javascript; charset=utf-8"
              }
              Write-Bytes $ctx 200 $type ([System.IO.File]::ReadAllBytes($candidate))
            } else {
              # GitHub Pages: any missing path under the project
              # site is answered with 404.html - status 404 - at
              # the REQUESTED URL (no redirect).
              Write-Bytes $ctx 404 "text/html; charset=utf-8" $notFoundHtml
            }
          }
        } else {
          Write-Bytes $ctx 404 "text/plain; charset=utf-8" (
            [System.Text.Encoding]::UTF8.GetBytes("not found"))
        }
      } catch {
        try {
          $ctx.Response.StatusCode = 500
          $ctx.Response.OutputStream.Close()
        } catch {}
      }
    }
  } catch {
    # listener stopped by the parent
  }
}

$rs = [runspacefactory]::CreateRunspace()
$rs.Open()
$ps = [System.Management.Automation.PowerShell]::Create()
$ps.Runspace = $rs
[void]$ps.AddScript($serverCode).AddArgument($root).AddArgument($sync)
$handle = $ps.BeginInvoke()

$deadline = (Get-Date).AddSeconds(10)
while((-not $sync.Ready) -and ((Get-Date) -lt $deadline)){
  Start-Sleep -Milliseconds 50
}

function Get-Page([string]$url){
  $result = @{ Status = 0; Body = ""; Location = ""; Error = "" }
  try{
    $req = [System.Net.HttpWebRequest]::Create($url)
    $req.Method = "GET"
    $req.Timeout = 15000
    $req.Proxy = $null
    $resp = $req.GetResponse()
    $result.Status = [int]$resp.StatusCode
    $result.Location = [string]$resp.Headers["Location"]
    $sr = New-Object System.IO.StreamReader(
      $resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $result.Body = $sr.ReadToEnd()
    $sr.Close()
    $resp.Close()
  } catch {
    $ex = $_.Exception
    $r = $ex.Response
    if((-not $r) -and $ex.InnerException){
      $r = $ex.InnerException.Response
    }
    if($r){
      $result.Status = [int]$r.StatusCode
      $result.Location = [string]$r.Headers["Location"]
      try {
        $sr = New-Object System.IO.StreamReader(
          $r.GetResponseStream(), [System.Text.Encoding]::UTF8)
        $result.Body = $sr.ReadToEnd()
        $sr.Close()
      } catch {}
      $r.Close()
    } else {
      $result.Error = $ex.Message
    }
  }
  return $result
}

try{
  if($sync.Ready -and ($sync.Port -gt 0)){

    $base = "http://127.0.0.1:" + $sync.Port

    $rootPage = Get-Page ($base + "/helpufin-auto/")
    Check "GH Pages root /helpufin-auto/ serves index.html (200, app entry)" (
      ($rootPage.Status -eq 200) -and
      (Has $rootPage.Body 'src="js/app.js"')) ("status " + $rootPage.Status)

    $deepRoutes = @(
      "/helpufin-auto/browse?condition=new",
      "/helpufin-auto/browse",
      "/helpufin-auto/login",
      "/helpufin-auto/signup",
      "/helpufin-auto/forgot-password",
      "/helpufin-auto/dealerships",
      "/helpufin-auto/compare",
      "/helpufin-auto/saved",
      "/helpufin-auto/dashboard",
      "/helpufin-auto/mfa-verify",
      "/helpufin-auto/vehicle?id=EXAMPLE",
      "/helpufin-auto/dashboard/dealer"
    )

    $allMissing404 = $true
    $allFallbackBody = $true
    $statusTrace = @()
    foreach($r in $deepRoutes){
      $res = Get-Page ($base + $r)
      $statusTrace += ($r + " => " + $res.Status + "/" + $res.Error)
      if($res.Status -ne 404){ $allMissing404 = $false }
      if(
        (-not (Has $res.Body $marker404)) -or
        (Has $res.Body 'id="app"')
      ){ $allFallbackBody = $false }
    }
    Check "every first-visit deep route answered with HTTP 404 (no SW yet)" $allMissing404 (
      $statusTrace -join " | ")
    Check "every 404 response carries the bootstrap - not the app shell" $allFallbackBody (
      $statusTrace -join " | ")

    $browse = Get-Page ($base + "/helpufin-auto/browse?condition=new")
    Check "no server-side redirect - requested URL stays in the address bar" (
      $browse.Location -eq "") ("Location: " + $browse.Location)
    Check "query string reaches the server intact (?condition=new)" (
      $sync.Seen.Contains("/helpufin-auto/browse?condition=new")) ""
    Check "vehicle id query reaches the server intact (?id=EXAMPLE)" (
      $sync.Seen.Contains("/helpufin-auto/vehicle?id=EXAMPLE")) ""

    $asset = Get-Page ($base + "/helpufin-auto/js/basePath.js")
    Check "existing assets still served normally (200)" (
      $asset.Status -eq 200) ("status " + $asset.Status)

    $missingAsset = Get-Page ($base + "/helpufin-auto/js/nope.js")
    Check "missing asset still a real 404 (asset guard proven in part C)" (
      $missingAsset.Status -eq 404) (
      "status " + $missingAsset.Status + " err:" + $missingAsset.Error +
      " body:" + $missingAsset.Body.Substring(0, [Math]::Min(80, $missingAsset.Body.Length)))

    $local = Get-Page ($base + "/")
    Check "localhost-style root serves index.html directly (200, no 404 hop)" (
      ($local.Status -eq 200) -and
      (Has $local.Body 'src="js/app.js"') -and
      (-not (Has $local.Body $marker404))) ""

    $hashLeaked = $false
    foreach($s in $sync.Seen){
      if($s.IndexOf("#") -ge 0){ $hashLeaked = $true }
    }
    Check "hash fragments are never sent to the server (by spec)" (-not $hashLeaked) ""

  } else {
    Check "HTTP simulation server started" $false (
      "Ready=" + $sync.Ready + " " + $sync.Error)
  }
} finally {
  # Unblock the server thread: Stop() cannot abort a runspace
  # blocked inside HttpListener.GetContext(), but aborting the
  # listener makes GetContext throw and the loop exit cleanly.
  try {
    if($sync.Listener){ $sync.Listener.Abort() }
  } catch {}
  Start-Sleep -Milliseconds 200
  try { $ps.Dispose() } catch {}
  try { $rs.Close() } catch {}
}

# ---------------- PART C — BEHAVIOURAL (real scripts) ----------------

# The harness below is ES3 JScript executed by cscript. It reads
# the REAL 404.html and index.html, extracts the REAL inline
# scripts, and eval()s them inside a stubbed browser environment
# (Set / URL / Date.now shims; location / sessionStorage /
# history / console stubs). Output is ASCII: CHECK|name|PASS|detail

$jscriptHarness = @'
var KEY = "hufa:ghp-redirect";

var ROOT = ".";
if(WScript.Arguments.Named.Exists("root")){
  ROOT = WScript.Arguments.Named("root");
}

function emit(line){
  WScript.Echo(line);
}

var passed = 0;
var failed = 0;

function record(name, ok, detail){
  if(ok){
    passed++;
    emit("CHECK|" + name + "|PASS|" + (detail || ""));
  } else {
    failed++;
    emit("CHECK|" + name + "|FAIL|" + (detail || ""));
  }
}

function readUtf8(path){
  var stream = new ActiveXObject("ADODB.Stream");
  stream.Type = 2;
  stream.Charset = "utf-8";
  stream.Open();
  stream.LoadFromFile(path);
  var text = stream.ReadText();
  stream.Close();
  return text;
}

function extractScript(text, marker){
  var re = /<script>([\s\S]*?)<\/script>/g;
  var m;
  while((m = re.exec(text)) !== null){
    if(m[1].indexOf(marker) !== -1){
      return m[1];
    }
  }
  return "";
}

function ShimSet(items){
  this.map = {};
  for(var i = 0; i < items.length; i++){
    this.map[items[i]] = 1;
  }
}
ShimSet.prototype.has = function(x){
  return this.map[x] === 1;
};

function ShimURL(url, base){
  var abs = String(url);
  var originRe = /^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\/[^\/?#]*/;
  if(!/^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\//.test(abs)){
    var om = String(base).match(originRe);
    if(om && abs.charAt(0) === "/"){
      abs = om[0] + abs;
    }
  }
  var m = abs.match(/^([a-zA-Z][a-zA-Z0-9+.\-]*):\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/);
  this.href = abs;
  if(m){
    this.origin = m[1] + "://" + m[2];
    this.hostname = m[2].split(":")[0];
    this.pathname = m[3] || "/";
    this.search = m[4] || "";
    this.hash = m[5] || "";
  } else {
    this.origin = "";
    this.hostname = "";
    this.pathname = abs;
    this.search = "";
    this.hash = "";
  }
}

if(!Date.now){
  Date.now = function(){
    return (new Date()).getTime();
  };
}

/* Some JScript builds have no native JSON. Provide a minimal
   shim covering exactly the payload shape the REAL scripts
   use ({href: string, ts: number}) so the real code paths
   execute unchanged. */
if(typeof JSON === "undefined" || !JSON.stringify || !JSON.parse){
  function JsonQuote(s){
    s = String(s);
    var out = "";
    for(var i = 0; i < s.length; i++){
      var ch = s.charAt(i);
      if(ch === '"'){ out += '\\"'; }
      else if(ch === "\\"){ out += "\\\\"; }
      else { out += ch; }
    }
    return out;
  }
  JSON = {
    stringify: function(o){
      return '{"href":"' + JsonQuote(o.href) + '","ts":' + String(o.ts) + '}';
    },
    parse: function(s){
      var m = String(s).match(/^\s*\{\s*"href"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"ts"\s*:\s*(\d+)\s*\}\s*$/);
      if(!m){
        throw new Error("unsupported json");
      }
      return {
        href: String(m[1]).replace(/\\(["\\])/g, "$1"),
        ts: Number(m[2])
      };
    }
  };
}
'@ + @'

function copyParts(u, loc){
  loc.origin = u.origin;
  loc.hostname = u.hostname;
  loc.pathname = u.pathname;
  loc.search = u.search;
  loc.hash = u.hash;
}

function makeLocation(initialHref, calls){
  var loc = {
    href: initialHref,
    origin: "",
    hostname: "",
    pathname: "",
    search: "",
    hash: "",
    replace: function(u){
      calls.replace.push(String(u));
      var u2 = new ShimURL(String(u), loc.href);
      loc.href = u2.href;
      copyParts(u2, loc);
      calls.finalHref = loc.href;
    }
  };
  copyParts(new ShimURL(initialHref, initialHref), loc);
  return loc;
}

function makeStorage(store){
  return {
    getItem: function(k){
      if(Object.prototype.hasOwnProperty.call(store, k)){
        return store[k];
      }
      return null;
    },
    setItem: function(k, v){
      store[k] = String(v);
    },
    removeItem: function(k){
      delete store[k];
    }
  };
}

function makeHistory(loc, calls){
  return {
    state: null,
    replaceState: function(state, title, url){
      calls.replaceState.push({ state: state, url: String(url) });
      var u = new ShimURL(String(url), loc.href);
      loc.href = u.href;
      copyParts(u, loc);
      calls.finalHref = loc.href;
    }
  };
}

function makeConsole(calls){
  function push(kind){
    return function(){
      calls.logs.push(kind);
    };
  }
  return {
    log: push("log"),
    info: push("info"),
    warn: push("warn"),
    error: push("error"),
    debug: push("debug")
  };
}

function runScript(body, initialHref, store, calls){
  var location = makeLocation(initialHref, calls);
  var sessionStorage = makeStorage(store);
  var history = makeHistory(location, calls);
  var console = makeConsole(calls);
  var Set = ShimSet;
  var URL = ShimURL;
  eval(body);
}

function storeSize(store){
  var n = 0;
  for(var k in store){
    if(Object.prototype.hasOwnProperty.call(store, k)){
      n++;
    }
  }
  return n;
}

function simulateFirstVisit(deepUrl, script404, scriptRestore){
  var store = {};
  var calls404 = { replace: [], replaceState: [], logs: [], finalHref: deepUrl };
  runScript(script404, deepUrl, store, calls404);
  var savedRaw = null;
  if(Object.prototype.hasOwnProperty.call(store, KEY)){
    savedRaw = store[KEY];
  }
  var callsIndex = { replace: [], replaceState: [], logs: [], finalHref: calls404.finalHref };
  runScript(scriptRestore, calls404.finalHref, store, callsIndex);
  return {
    store: store,
    savedRaw: savedRaw,
    calls404: calls404,
    callsIndex: callsIndex,
    finalHref: callsIndex.finalHref
  };
}
'@ + @'

function harnessMain(){
  var p404 = readUtf8(ROOT + "\\404.html");
  var idx = readUtf8(ROOT + "\\index.html");

  var script404 = extractScript(p404, "FIRST-VISIT DEEP-LINK FALLBACK");
  var scriptRestore = extractScript(idx, "FIRST-VISIT RESTORE");

  record(
    "scripts extracted from real files",
    (script404.length > 0) && (scriptRestore.length > 0),
    "404:" + script404.length + " restore:" + scriptRestore.length
  );

  var GH = "https://helpufinauto.github.io";

  var routes = [
    "/browse?condition=new",
    "/browse",
    "/login",
    "/signup",
    "/forgot-password",
    "/dealerships",
    "/compare",
    "/saved",
    "/dashboard",
    "/mfa-verify",
    "/vehicle?id=EXAMPLE",
    "/dashboard/dealer",
    "/browse/"
  ];

  for(var i = 0; i < routes.length; i++){
    var r = routes[i];
    var target = GH + "/helpufin-auto" + r;
    var s = simulateFirstVisit(target, script404, scriptRestore);
    var storedHref = null;
    try{
      if(s.savedRaw !== null){
        storedHref = JSON.parse(s.savedRaw).href;
      }
    }catch(e){
      storedHref = null;
    }
    var ok =
      (s.calls404.replace.length === 1) &&
      (s.calls404.replace[0] === "/helpufin-auto/") &&
      (storedHref === target) &&
      (s.callsIndex.replaceState.length === 1) &&
      (s.callsIndex.replaceState[0].url === target) &&
      (s.finalHref === target) &&
      (!Object.prototype.hasOwnProperty.call(s.store, KEY));
    record("route " + r + " transfer + exact restore", ok, "final=" + s.finalHref);
    record(
      "route " + r + " no logging",
      (s.calls404.logs.length === 0) && (s.callsIndex.logs.length === 0),
      ""
    );
  }

  var recovery = GH + "/helpufin-auto/reset-password#access_token=EXAMPLE_ACCESS_TOKEN&type=recovery";
  var rec = simulateFirstVisit(recovery, script404, scriptRestore);
  record(
    "recovery hash fully restored",
    (rec.finalHref === recovery) &&
      (rec.callsIndex.replaceState.length === 1) &&
      (rec.callsIndex.replaceState[0].url === recovery),
    "final=" + rec.finalHref
  );
  record(
    "recovery token never logged",
    (rec.calls404.logs.length === 0) && (rec.callsIndex.logs.length === 0),
    ""
  );

  var base1 = "https://helpufinauto.github.io/helpufin-auto/";

  function restoreGuard(name, storedValue, okFn){
    var store = {};
    store[KEY] = storedValue;
    var calls = { replace: [], replaceState: [], logs: [], finalHref: base1 };
    runScript(scriptRestore, base1, store, calls);
    record(name, okFn(calls, store), "final=" + calls.finalHref);
  }

  restoreGuard(
    "stale entry (>5 min) ignored and consumed",
    '{"href":"' + base1 + 'browse?condition=new","ts":' + String(Date.now() - 300001) + '}',
    function(calls, store){
      return (calls.replaceState.length === 0) &&
        (!Object.prototype.hasOwnProperty.call(store, KEY));
    }
  );

  restoreGuard(
    "cross-origin entry rejected",
    '{"href":"https://evil.example/helpufin-auto/x","ts":' + String(Date.now()) + '}',
    function(calls){
      return calls.replaceState.length === 0;
    }
  );

  restoreGuard(
    "entry outside the app directory rejected",
    '{"href":"https://helpufinauto.github.io/other-app/page","ts":' + String(Date.now()) + '}',
    function(calls){
      return calls.replaceState.length === 0;
    }
  );

  restoreGuard(
    "malformed entry discarded without throwing",
    "{not-json",
    function(calls, store){
      return (calls.replaceState.length === 0) &&
        (!Object.prototype.hasOwnProperty.call(store, KEY));
    }
  );

  var callsN = { replace: [], replaceState: [], logs: [], finalHref: base1 };
  runScript(scriptRestore, base1, {}, callsN);
  record(
    "normal root visit (no key): restore is a strict no-op",
    (callsN.replaceState.length === 0) && (callsN.finalHref === base1),
    ""
  );

  var localStart = "http://localhost:5500/browse?condition=new";
  var callsL = { replace: [], replaceState: [], logs: [], finalHref: localStart };
  runScript(scriptRestore, localStart, {}, callsL);
  record(
    "localhost normal load: restore is a strict no-op",
    (callsL.replaceState.length === 0) && (callsL.finalHref === localStart),
    ""
  );

  function transferGuard(name, initialHref){
    var store = {};
    var calls = { replace: [], replaceState: [], logs: [], finalHref: initialHref };
    runScript(script404, initialHref, store, calls);
    record(
      name,
      (calls.replace.length === 0) && (storeSize(store) === 0),
      ""
    );
  }

  transferGuard("localhost: no transfer, no storage write", "http://localhost:5500/browse");
  transferGuard("non-github.io host: no transfer", "https://example.com/helpufin-auto/browse");
  transferGuard("missing .js: static 404, SPA never boots", "https://helpufinauto.github.io/helpufin-auto/js/missing.js");
  transferGuard("missing .png: static 404, SPA never boots", "https://helpufinauto.github.io/helpufin-auto/logo.png");
  transferGuard("404.html own URL: no self-bootstrap", "https://helpufinauto.github.io/helpufin-auto/404.html");
  transferGuard("URL outside /repo/: static 404", "https://helpufinauto.github.io/stray");

  emit("SUMMARY|" + passed + "|" + failed);
}

try{
  harnessMain();
}catch(e){
  emit("HERR|" + (e && e.message ? e.message : String(e)));
  WScript.Quit(2);
}
'@

# Run the JScript harness via cscript and merge its results.

$harnessPath = Join-Path $env:TEMP "phase5-harness.js"
[System.IO.File]::WriteAllText($harnessPath, $jscriptHarness, [System.Text.Encoding]::ASCII)

try{
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try{
    $harnessOut = & cscript //nologo $harnessPath /root:$root 2>&1
  } finally {
    $ErrorActionPreference = $prevEap
  }
  $harnessCode = $LASTEXITCODE

  $harnessError = ""
  foreach($line in @($harnessOut)){
    $l = [string]$line
    if($l.StartsWith("CHECK|")){
      $parts = $l.Split("|")
      if($parts.Length -ge 3){
        $ok = ($parts[2] -eq "PASS")
        $detail = ""
        if($parts.Length -ge 4){ $detail = $parts[3] }
        if($ok){ $script:pass++ } else { $script:fail++ }
        $tag = "  [OK]   "
        if(-not $ok){ $tag = "  [FAIL] " }
        $suffix = ""
        if($detail){ $suffix = "   {" + $detail + "}" }
        Write-Output ($tag + "(C) " + $parts[1] + $suffix)
      }
    } elseif($l.StartsWith("HERR|")){
      $harnessError = $l.Substring(5)
    } elseif($l.Trim().Length -gt 0){
      if($harnessError.Length -lt 800){
        $harnessError = ($harnessError + " RAW: " + $l)
      }
    }
  }

  Check "JScript behavioural harness completed" ($harnessCode -eq 0) (
    "exit=" + $harnessCode + " " + $harnessError)

} finally {
  try { Remove-Item $harnessPath -Force -ErrorAction SilentlyContinue } catch {}
}

# ---------------- SUMMARY ----------------

Section ""
Write-Output "========================================"
$verdict = "FAIL"
if($script:fail -eq 0){ $verdict = "PASS" }
Write-Output (
  "PHASE 5 RESULT: " + $verdict +
  " - " + $script:pass + " passed, " + $script:fail + " failed")
Write-Output "========================================"

if($script:fail -gt 0){ exit 1 } else { exit 0 }






