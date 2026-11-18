<?php
/* =========================================================================
   Jurkovičova Tepláreň — contact form handler (Websupport / PHP hosting)
   Receives the contact form (AJAX POST from js/main.js) and e-mails it to the
   reception inbox via PHP mail(). No external services, no cookies.

   ANTI-SPAM — several layers, all invisible to a real visitor:
     1. the POST must come from this site (Origin / Referer header)
     2. one-time form token: js/main.js fetches it (GET contact.php?token=1)
        when the visitor starts filling the form in; a POST without a valid,
        unused token is refused
     3. rate limit per visitor IP (kept only as a salted hash, for max. 24 h)
     4. honeypot field "website", pushed off-screen by CSS; filled in = bot
     5. minimum fill time — a POST sooner than min_seconds after the token = bot
     6. strict validation of every field; the e-mail domain must exist (DNS)
     7. content score — gibberish names, links, spam phrases, no real key /
        pointer input, throwaway e-mail… (see "7." below)
          score >= spam_tag  → delivered, the subject starts with "[SPAM?]"
          score >= spam_drop → discarded; the visitor still sees "thank you"
   Only clean enquiries answer track:true — js/main.js pushes the GTM
   conversion event only for those, so spam never counts as a conversion.

   Storage: .contact-data/ next to this file (created automatically, closed to
   the web) holds the token key, used tokens and the rate-limit counters. If
   the folder can't be created, the form still works — only without the
   one-time-token and rate-limit layers.
   ========================================================================= */

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

// --- where the enquiries are delivered -----------------------------------
$TO   = 'info@jurkovicovateplaren.sk';
// From MUST be an address on this domain so SPF/DKIM pass on Websupport.
// Create this mailbox/alias (or change it) in your Websupport mail settings.
$FROM = 'noreply@jurkovicovateplaren.sk';

// --- anti-spam settings ----------------------------------------------------
$CFG = [
  'min_seconds' => 3,                         // POST sooner than this after the token = bot
  'token_ttl'   => 6 * 3600,                  // a form token stays valid for 6 hours
  'rate'        => [[5, 600], [20, 86400]],   // max. POSTs per visitor: 5 / 10 min and 20 / 24 h
  'spam_tag'    => 3,                         // score from which the subject gets "[SPAM?]"
  'spam_drop'   => 6,                         // score from which the enquiry is discarded
  'spam_to'     => '',                        // optional inbox for discarded spam (to audit the filter); '' = delete it
  // Pages still cached in visitors' browsers from before the anti-spam update
  // post without a token. Until this date such posts are delivered with
  // "[SPAM?]" in the subject instead of being refused; afterwards refused.
  'grace_until' => '2026-12-15',
];

define('DATA_DIR', __DIR__ . '/.contact-data');
// invisible characters used to disguise spam: zero-width, bidi overrides, BOM
const INVISIBLE = '\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2064}\x{2066}-\x{2069}\x{FEFF}';

/* ==== helpers ============================================================ */

function respond($status, array $payload) {
  http_response_code($status);
  echo json_encode($payload);
  exit;
}

/* ---- storage ------------------------------------------------------------- */
function data_dir() {
  static $dir = false;
  if ($dir !== false) return $dir;
  $dir = null;
  if (!is_dir(DATA_DIR) && !@mkdir(DATA_DIR, 0700)) return $dir;
  if (!is_file(DATA_DIR . '/.htaccess')) @file_put_contents(DATA_DIR . '/.htaccess', "Require all denied\n");
  if (is_writable(DATA_DIR)) $dir = DATA_DIR;
  return $dir;
}

// HMAC key for the form tokens — generated once into .contact-data/secret.php
// (a CONTACT_FORM_SECRET environment variable takes precedence)
function secret() {
  static $key = null;
  if ($key !== null) return $key;
  $env = getenv('CONTACT_FORM_SECRET');
  if (is_string($env) && strlen($env) >= 16) return $key = $env;
  if ($dir = data_dir()) {
    $file = $dir . '/secret.php';
    for ($i = 0; $i < 2; $i++) {
      if (is_file($file) && preg_match('/\b([a-f0-9]{64})\b/', (string) @file_get_contents($file), $m)) return $key = $m[1];
      if ($i === 0 && ($h = @fopen($file, 'x'))) {
        fwrite($h, "<?php exit; /* contact form token key — keep private */ ?>\n" . bin2hex(random_bytes(32)) . "\n");
        fclose($h);
        @chmod($file, 0600);
      }
    }
  }
  // no writable storage: a value that is stable on this server but not public
  return $key = hash('sha256', __FILE__ . '|' . php_uname() . '|' . @filemtime(__FILE__));
}

/* ---- visitor key for the rate limit (the IP itself is never stored) ------ */
function client_ip() {
  $ip     = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
  $public = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
  // behind the host's reverse proxy REMOTE_ADDR is a private address — the
  // visitor is then the right-most public address the proxy added to X-Forwarded-For
  if (!filter_var($ip, FILTER_VALIDATE_IP, $public) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    foreach (array_reverse(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])) as $hop) {
      $hop = trim($hop);
      if (filter_var($hop, FILTER_VALIDATE_IP, $public)) return $hop;
    }
  }
  return $ip;
}
function visitor_key() {
  $ip  = client_ip();
  $bin = @inet_pton($ip);
  if ($bin !== false && strlen($bin) === 16) $bin = substr($bin, 0, 8); // IPv6: the whole /64
  return substr(hash_hmac('sha256', $bin !== false ? $bin : $ip, secret()), 0, 32);
}

// true = within the limits (and this attempt is counted); fails open without storage
function rate_ok($key, array $limits) {
  $dir = data_dir();
  if (!$dir || !($h = @fopen("$dir/r-$key.json", 'c+'))) return true;
  flock($h, LOCK_EX);
  $now  = time();
  $span = 0;
  foreach ($limits as $l) $span = max($span, $l[1]);
  $hits = json_decode((string) stream_get_contents($h), true);
  $hits = array_values(array_filter(is_array($hits) ? $hits : [], function ($t) use ($now, $span) {
    return is_int($t) && $t > $now - $span;
  }));
  $ok = true;
  foreach ($limits as $l) {
    $recent = count(array_filter($hits, function ($t) use ($now, $l) { return $t > $now - $l[1]; }));
    if ($recent >= $l[0]) $ok = false;
  }
  if ($ok) {
    $hits[] = $now;
    ftruncate($h, 0);
    rewind($h);
    fwrite($h, json_encode($hits));
  }
  flock($h, LOCK_UN);
  fclose($h);
  return $ok;
}

/* ---- one-time form tokens ------------------------------------------------- */
// "<unix time>.<nonce>.<signature>" — signed, so the start time can't be faked
function token_sig($ts, $nonce) {
  return substr(hash_hmac('sha256', "contact|$ts|$nonce", secret()), 0, 32);
}
function token_new() {
  $ts    = (string) time();
  $nonce = bin2hex(random_bytes(8));
  return "$ts.$nonce." . token_sig($ts, $nonce);
}
// → ['age' => seconds since issued, 'nonce' => …], or null if invalid / expired / used
function token_read($token, $ttl) {
  if (!is_string($token) || !preg_match('/^(\d{9,11})\.([a-f0-9]{16})\.([a-f0-9]{32})$/', $token, $m)) return null;
  if (!hash_equals(token_sig($m[1], $m[2]), $m[3])) return null;
  $age = time() - (int) $m[1];
  if ($age < 0 || $age > $ttl || nonce_used($m[2])) return null;
  return ['age' => $age, 'nonce' => $m[2]];
}
function nonce_file($nonce) {
  $dir = data_dir();
  return $dir ? "$dir/n-$nonce" : null;
}
function nonce_used($nonce) {
  $f = nonce_file($nonce);
  return $f !== null && is_file($f);
}
// marks the token as used; false when another request used it first
function nonce_claim($nonce) {
  $f = nonce_file($nonce);
  if ($f === null) return true;
  if ($h = @fopen($f, 'x')) { fclose($h); return true; }
  return !is_file($f); // could not write at all → don't block the visitor
}
function nonce_release($nonce) {
  $f = nonce_file($nonce);
  if ($f !== null) @unlink($f);
}
// now and then delete used tokens and rate counters that are no longer needed
function sweep($ttl) {
  $dir = data_dir();
  if (!$dir || mt_rand(1, 20) !== 1) return;
  $cutoff = time() - max(25 * 3600, $ttl + 3600);
  $files  = glob("$dir/[nr]-*");
  if ($files) foreach ($files as $f) {
    if (@filemtime($f) < $cutoff) @unlink($f);
  }
}

/* ---- input ------------------------------------------------------------------ */
function raw($k) {
  $v = isset($_POST[$k]) && is_string($_POST[$k]) ? $_POST[$k] : '';
  // a browser always sends valid UTF-8 — anything else is a script
  if (!preg_match('//u', $v)) respond(400, ['ok' => false, 'error' => 'invalid']);
  return $v;
}
// shorten to $max characters (never cuts a multi-byte character in half)
function cut($v, $max) {
  return preg_match('/^.{0,' . (int) $max . '}/su', $v, $m) ? $m[0] : $v;
}
// single-line field: control + invisible characters removed, whitespace collapsed
// (also defuses e-mail header injection — no CR/LF can get through)
function line($k, $max = 100) {
  $v = preg_replace('/[\p{Cc}' . INVISIBLE . ']+/u', ' ', raw($k));
  return cut(trim(preg_replace('/[\s\p{Z}]+/u', ' ', $v)), $max);
}
// multi-line field: keeps line breaks and tabs
function text($k, $max = 5000) {
  $v = str_replace(["\r\n", "\r"], "\n", raw($k));
  $v = preg_replace('/[^\P{Cc}\n\t]|[' . INVISIBLE . ']/u', '', $v);
  return cut(trim(preg_replace("/\n{4,}/", "\n\n\n", $v)), $max);
}

/* ---- spam signals ------------------------------------------------------------- */
// machine-made "words" such as "uKxMbtQzRw": 3+ capitals inside a mixed-case
// word that switches lower→upper at least twice (McDonald, DeLaCruz, ChatGPT
// stay clean) — or 8+ letters without a single vowel
function gibberish($s) {
  $words = preg_split('/[^\p{L}]+/u', $s, -1, PREG_SPLIT_NO_EMPTY);
  foreach (($words ? $words : []) as $w) {
    $len = preg_match_all('/./su', $w);
    if ($len < 6) continue;
    $caps     = preg_match_all('/\p{Lu}/u', $w);
    $inner    = $caps - (preg_match('/^\p{Lu}/u', $w) ? 1 : 0);
    $switches = preg_match_all('/\p{Ll}\p{Lu}/u', $w);
    if ($caps < $len && $inner >= 3 && $switches >= 2) return true;
    if ($len >= 8 && !preg_match('/[aeiouyáäéíóôúýěůöüàâèêëìîïòûùÿåæøœ]/iu', $w)) return true;
  }
  return false;
}
function link_count($s) {
  $s = preg_replace('/\S+@\S+/u', ' ', $s); // e-mail addresses are not links
  return preg_match_all('~(?:https?://|www\.)\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|biz|xyz|top|online|site|shop|store|club|icu|ru|su|cn|tk|ml|ga|cf|gq|pw|cc|link|click|live|life|best|win|vip|app|io|ly)\b~iu', $s);
}
function has_markup($s) {
  return (bool) preg_match('~<\s*/?\s*(?:a|script|img|iframe)\b|\[/?(?:url|link|img)\b|href\s*=~i', $s);
}
const SPAM_PHRASES = '~\b(?:seo|backlinks?|link\s*building|guest\s*posts?|search\s+engines?|first\s+page\s+of\s+google|(?:web(?:site)?|organic)\s+traffic|crypto(?:currency|currencies)?|bitcoin|forex|casino|betting|viagra|cialis|porn\w*|loans?|lead\s+generation|unsubscribe|opt[\s-]?out|whats\s?app|telegram|web\s+design\s+services?|virtual\s+assistants?|(?:make|earn)\s+money|investment\s+opportunit(?:y|ies)|pôžič\w*|kasín\w*|kryptomen\w*)\b~iu';
function phrase_count($s) {
  if (!preg_match_all(SPAM_PHRASES, $s, $m)) return 0;
  return count(array_unique(array_map('strtolower', $m[0])));
}
// mostly letters outside the Latin script (Cyrillic, CJK, Arabic…)
function foreign_script($s) {
  $letters = preg_match_all('/\p{L}/u', $s);
  return $letters >= 12 && preg_match_all('/\p{Latin}/u', $s) / $letters < 0.5;
}
const THROWAWAY = ['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'grr.la',
  '10minutemail.com', 'temp-mail.org', 'tempmail.com', 'yopmail.com', 'trashmail.com', 'getnada.com',
  'maildrop.cc', 'dispostable.com', 'fakeinbox.com', 'throwawaymail.com', 'mintemail.com', 'emailondeck.com',
  'mohmal.com', 'tempail.com', 'burnermail.io', 'mailnesia.com', 'tempr.email', 'discard.email', 'mail.tm', 'moakt.com'];
// the e-mail domain must exist (MX, or at least an A / AAAA record)
function domain_exists($domain) {
  if (!function_exists('checkdnsrr')) return true;
  foreach (['MX', 'A', 'AAAA'] as $type) if (@checkdnsrr($domain . '.', $type)) return true;
  // the server's own DNS may be down — then don't reject anybody
  return !@checkdnsrr('gmail.com.', 'MX');
}
// readable reasons for the e-mail footer
const REASONS = [
  'no_origin'         => 'chýba pôvod požiadavky',
  'no_token'          => 'odoslané bez overovacieho tokenu',
  'bad_value'         => 'neplatná hodnota vo formulári',
  'link_in_name'      => 'odkaz v mene',
  'gibberish_name'    => 'nezmyselné meno',
  'gibberish_surname' => 'nezmyselné priezvisko',
  'digits_in_name'    => 'číslice v mene',
  'same_name'         => 'meno = priezvisko',
  'gibberish_message' => 'nezmyselný text správy',
  'links'             => 'odkazy v správe',
  'markup'            => 'HTML / BBCode v správe',
  'spam_phrases'      => 'typické spamové frázy',
  'foreign_script'    => 'neštandardné písmo',
  'throwaway_email'   => 'jednorazový e-mail',
  'no_human_input'    => 'bez písania / klikania (skript)',
];
function mask($email) {
  $at = strrpos($email, '@');
  return $at === false ? '?' : substr($email, 0, 1) . '***' . substr($email, $at);
}
function send_mail($to, $subject, $body, $from, $replyTo, array $extra = []) {
  $headers = array_merge([
    'From: =?UTF-8?B?' . base64_encode('Jurkovičova Tepláreň') . "?= <{$from}>",
    'Reply-To: ' . $replyTo,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ], $extra);
  return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers), '-f' . $from);
}

/* ==== request ============================================================ */

// GET contact.php?token=1 → a fresh form token for js/main.js
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['token'])) {
  respond(200, ['token' => token_new()]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  respond(405, ['ok' => false, 'error' => 'method']);
}
// the whole form is a few KB — refuse oversized payloads
if ((int) (isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 0) > 65536) {
  respond(413, ['ok' => false, 'error' => 'size']);
}

$why = []; // spam signals → score

// 1. the request must come from our own pages
$host = strtolower(preg_replace('/:\d+$/', '', isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : ''));
$src  = !empty($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] !== 'null' ? $_SERVER['HTTP_ORIGIN']
      : (!empty($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
if ($src === '') {
  $why['no_origin'] = 2; // browsers always send one — scripts often don't
} elseif ($host !== '' && strtolower((string) parse_url($src, PHP_URL_HOST)) !== $host) {
  respond(403, ['ok' => false, 'error' => 'origin']);
}

// 2. one-time form token (+ grace period for pages cached before the update)
$token = token_read(isset($_POST['_t']) ? $_POST['_t'] : null, $CFG['token_ttl']);
if ($token === null) {
  $legacy = !isset($_POST['_t']) && $CFG['grace_until'] !== '' && date('Y-m-d') <= $CFG['grace_until'];
  if (!$legacy) respond(403, ['ok' => false, 'error' => 'token']);
  $why['no_token'] = 3;
}

// 3. rate limit per visitor
if (!rate_ok(visitor_key(), $CFG['rate'])) {
  error_log('[contact.php] rate limit reached — submission refused');
  respond(429, ['ok' => false, 'error' => 'rate']);
}
sweep($CFG['token_ttl']);

// 4. honeypot ("bot-field" = the old name, still sent by cached pages)
if (raw('website') !== '' || raw('bot-field') !== '') {
  if ($token !== null) nonce_claim($token['nonce']);
  error_log('[contact.php] spam discarded (honeypot)');
  respond(200, ['ok' => true, 'track' => false]);
}

// 5. minimum fill time — people need a few seconds, bots fill the form instantly
if ($token !== null && $token['age'] < $CFG['min_seconds']) {
  respond(422, ['ok' => false, 'error' => 'fast']);
}

// 6. validation
$name     = line('name', 100);
$surname  = line('surname', 100);
$email    = line('email', 300);
$phone    = line('phone', 40);
$source   = line('source', 60);
$interest = line('interest', 40);
$date     = line('event-date', 20);
$hall     = line('hall', 40);
$message  = text('message', 5000);
$consent  = line('consent', 10);

if ($name === '')    respond(422, ['ok' => false, 'error' => 'name']);
if ($consent === '') respond(422, ['ok' => false, 'error' => 'consent']);
if ($phone !== '' && (!preg_match('~^\+?[0-9 ()/.\-]{6,30}$~', $phone) || preg_match_all('/\d/', $phone) < 6)) {
  respond(422, ['ok' => false, 'error' => 'phone']);
}
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || !domain_exists(substr(strrchr($email, '@'), 1))) {
  respond(422, ['ok' => false, 'error' => 'email']);
}
if (!in_array($interest, ['coworking', 'office', 'event', 'meeting'], true)) $why['bad_value'] = 2;
if ($interest === 'event') {
  if ($date !== '' && !(preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $d) && checkdate((int) $d[2], (int) $d[3], (int) $d[1]))) {
    $date = '';
    $why['bad_value'] = 2;
  }
  if ($hall !== '' && !in_array($hall, ['event-hall', 'main-event-hall'], true)) {
    $hall = '';
    $why['bad_value'] = 2;
  }
}

// 7. content score
$fullName = trim($name . ' ' . $surname);
if (preg_match('~https?://|www\.|\.(?:com|net|org|ru|xyz|top|info|biz|online|site|shop)\b|[<>\[\]]~i', $fullName)) $why['link_in_name'] = 6;
if (gibberish($name))                                      $why['gibberish_name'] = 3;
if (gibberish($surname))                                   $why['gibberish_surname'] = 3;
if (preg_match('/\d/', $fullName))                         $why['digits_in_name'] = 2;
if ($surname !== '' && strcasecmp($name, $surname) === 0)  $why['same_name'] = 1;
if (gibberish($message))                                   $why['gibberish_message'] = 2;
$links = link_count($message);
if ($links)                                                $why['links'] = $links >= 3 ? 4 : $links;
if (has_markup($message))                                  $why['markup'] = 4;
$phrases = phrase_count($fullName . ' ' . $message);
if ($phrases)                                              $why['spam_phrases'] = $phrases >= 3 ? 4 : ($phrases === 2 ? 3 : 1);
if (foreign_script($fullName . ' ' . $message))            $why['foreign_script'] = 2;
if (in_array(strtolower(substr(strrchr($email, '@'), 1)), THROWAWAY, true)) $why['throwaway_email'] = 2;
// js/main.js counts real key / pointer / input events — 0 means a script filled and sent the form
if (isset($_POST['_h']) && raw('_h') === '0')              $why['no_human_input'] = 3;

$score  = array_sum($why);
$tagged = $score >= $CFG['spam_tag'];

// compose the e-mail
$rows = [];
$rows[] = 'Meno: ' . ($fullName !== '' ? $fullName : '—');
$rows[] = 'E-mail: ' . $email;
if ($phone !== '')    $rows[] = 'Telefón: ' . $phone;
if ($interest !== '') $rows[] = 'Záujem: ' . $interest;
if ($interest === 'event') {
  if ($date !== '') $rows[] = 'Preferovaný dátum: ' . $date;
  if ($hall !== '') $rows[] = 'Hala: ' . $hall;
}
if ($source !== '')   $rows[] = 'Odkiaľ sa o nás dozvedeli: ' . $source;
$rows[] = 'Súhlas so spracovaním údajov: áno';
$rows[] = '';
$rows[] = 'Správa:';
$rows[] = ($message !== '' ? $message : '(bez správy)');
if ($tagged) {
  $labels = [];
  foreach (array_keys($why) as $r) $labels[] = array_key_exists($r, REASONS) ? REASONS[$r] : $r;
  $rows[] = '';
  $rows[] = '—';
  $rows[] = 'Antispam: pravdepodobne spam (skóre ' . $score . ': ' . implode(', ', $labels) . ').';
}
$body    = implode("\n", $rows);
$subject = ($tagged ? '[SPAM?] ' : '') . 'Nový dopyt z webu — ' . ($fullName !== '' ? $fullName : $email);
$extra   = $why ? ['X-JT-Spam-Score: ' . $score . ' (' . implode(', ', array_keys($why)) . ')'] : [];

// the token is used up from here on (a parallel duplicate POST is refused)
if ($token !== null && !nonce_claim($token['nonce'])) {
  respond(403, ['ok' => false, 'error' => 'token']);
}

if ($score >= $CFG['spam_drop']) {
  if ($CFG['spam_to'] !== '') send_mail($CFG['spam_to'], '[SPAM] ' . $subject, $body, $FROM, $email, $extra);
  error_log('[contact.php] spam discarded (score ' . $score . ': ' . implode(', ', array_keys($why)) . ') — ' . mask($email));
  respond(200, ['ok' => true, 'track' => false]);
}

if (send_mail($TO, $subject, $body, $FROM, $email, $extra)) {
  respond(200, ['ok' => true, 'track' => !$tagged]);
}

// surfaces in the Websupport PHP error log so you can diagnose a failed send
if ($token !== null) nonce_release($token['nonce']); // let the visitor retry with the same token
error_log('[contact.php] mail() failed — TO=' . $TO . ' FROM=' . $FROM . ' from-visitor=' . mask($email));
respond(500, ['ok' => false, 'error' => 'send']);
