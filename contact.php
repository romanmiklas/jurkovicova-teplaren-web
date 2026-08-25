<?php
/* =========================================================================
   Jurkovičova Tepláreň — contact form handler (Websupport / PHP hosting)
   Receives the contact form (AJAX or normal POST) and e-mails it to the
   reception inbox. No external dependencies — uses PHP mail().
   ========================================================================= */

header('Content-Type: application/json; charset=utf-8');

// --- where the enquiries are delivered -----------------------------------
$TO   = 'info@jurkovicovateplaren.sk';
// From MUST be an address on this domain so SPF/DKIM pass on Websupport.
// Create this mailbox/alias (or change it) in your Websupport mail settings.
$FROM = 'noreply@jurkovicovateplaren.sk';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'method']);
  exit;
}

// Only accept submissions that originate from our own pages (blocks the most
// trivial cross-site spam). Lenient: only rejects a *mismatching* Origin.
if (!empty($_SERVER['HTTP_ORIGIN'])) {
  $host   = $_SERVER['HTTP_HOST'] ?? '';
  $origin = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST) ?? '';
  if ($host !== '' && $origin !== '' && strcasecmp($host, $origin) !== 0) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'origin']);
    exit;
  }
}

// Honeypot — real users never see/fill this; bots do. Drop silently.
if (!empty($_POST['bot-field'])) {
  echo json_encode(['ok' => true]);
  exit;
}

// trim + cap length (stops oversized payloads) + strip control chars
function f($k, $max = 1000) {
  if (!isset($_POST[$k])) return '';
  $v = trim((string) $_POST[$k]);
  if (strlen($v) > $max) $v = substr($v, 0, $max);
  // remove CR/LF and other control chars (defuses header-injection attempts)
  return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v);
}

$name     = f('name');
$surname  = f('surname');
$email    = f('email');
$phone    = f('phone');
$source   = f('source');
$interest = f('interest');
$date     = f('event-date');
$hall     = f('hall');
$message  = f('message', 5000);
$consent  = f('consent');

// Minimal validation — a valid e-mail is required to reply.
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'email']);
  exit;
}

$fullName = trim($name . ' ' . $surname);

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
$rows[] = 'Súhlas so spracovaním údajov: ' . ($consent !== '' ? 'áno' : 'nie');
$rows[] = '';
$rows[] = 'Správa:';
$rows[] = ($message !== '' ? $message : '(bez správy)');

$body    = implode("\n", $rows);
$subject = 'Nový dopyt z webu — ' . ($fullName !== '' ? $fullName : $email);

$headers  = 'From: =?UTF-8?B?' . base64_encode('Jurkovičova Tepláreň') . "?= <{$FROM}>\r\n";
$headers .= 'Reply-To: ' . $email . "\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = @mail($TO, $encodedSubject, $body, $headers, '-f' . $FROM);

if ($sent) {
  echo json_encode(['ok' => true]);
} else {
  // surfaces in the Websupport PHP error log so you can diagnose a failed send
  error_log('[contact.php] mail() failed — TO=' . $TO . ' FROM=' . $FROM . ' from-visitor=' . $email);
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'send']);
}
