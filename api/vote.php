<?php
/**
 * HYSPANIA - API de Votación
 * Sistema de votos con protección anti-abuso
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuración
define('DATA_DIR', __DIR__ . '/../data/');
define('SERVERS_FILE', DATA_DIR . 'servers.json');
define('VOTES_FILE', DATA_DIR . 'votes.json');
define('VOTE_COOLDOWN', 24 * 60 * 60); // 24 horas en segundos
define('MIN_USERNAME_LENGTH', 3);
define('MAX_USERNAME_LENGTH', 16);

// Funciones de utilidad
function getClientIP() {
    $ip = '';
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    return filter_var(trim($ip), FILTER_VALIDATE_IP) ?: 'unknown';
}

function hashIP($ip) {
    return hash('sha256', $ip . 'hyspania_salt_2026');
}

function readJSON($file) {
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    return json_decode($content, true) ?? [];
}

function writeJSON($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    // Usar bloqueo de archivo para evitar condiciones de carrera
    $fp = fopen($file, 'c+');
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return true;
}

function validateUsername($username) {
    $username = trim($username);
    if (strlen($username) < MIN_USERNAME_LENGTH || strlen($username) > MAX_USERNAME_LENGTH) {
        return false;
    }
    return preg_match('/^[a-zA-Z0-9_]+$/', $username);
}

function sendResponse($success, $data = null, $error = null, $code = 200) {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'error' => $error,
        'timestamp' => time()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Verificar si puede votar
function canVote($serverId) {
    $clientIP = getClientIP();
    $hashedIP = hashIP($clientIP);
    
    $votes = readJSON(VOTES_FILE);
    $key = $hashedIP . '_' . $serverId;
    
    if (!isset($votes[$key])) {
        return ['canVote' => true, 'timeRemaining' => 0];
    }
    
    $lastVote = $votes[$key]['timestamp'];
    $timeSince = time() - $lastVote;
    $timeRemaining = max(0, VOTE_COOLDOWN - $timeSince);
    
    return [
        'canVote' => $timeRemaining === 0,
        'timeRemaining' => $timeRemaining
    ];
}

// Registrar un voto
function registerVote($data) {
    $serverId = $data['serverId'] ?? '';
    $username = $data['username'] ?? '';
    
    // Validar username
    if (!validateUsername($username)) {
        sendResponse(false, null, 'Username inválido. Usa 3-16 caracteres (letras, números, _)', 400);
    }
    
    // Verificar que el servidor existe
    $servers = readJSON(SERVERS_FILE);
    $serverIndex = null;
    
    foreach ($servers as $i => $server) {
        if ($server['id'] === $serverId) {
            $serverIndex = $i;
            break;
        }
    }
    
    if ($serverIndex === null) {
        sendResponse(false, null, 'Servidor no encontrado.', 404);
    }
    
    // Verificar cooldown
    $voteStatus = canVote($serverId);
    if (!$voteStatus['canVote']) {
        $hours = floor($voteStatus['timeRemaining'] / 3600);
        $minutes = floor(($voteStatus['timeRemaining'] % 3600) / 60);
        $timeStr = $hours > 0 ? "{$hours}h {$minutes}m" : "{$minutes} minutos";
        sendResponse(false, null, "Ya votaste. Puedes volver a votar en {$timeStr}", 429);
    }
    
    $clientIP = getClientIP();
    $hashedIP = hashIP($clientIP);
    
    // Registrar voto
    $votes = readJSON(VOTES_FILE);
    $key = $hashedIP . '_' . $serverId;
    
    $votes[$key] = [
        'timestamp' => time(),
        'username' => preg_replace('/[^a-zA-Z0-9_]/', '', $username)
    ];
    
    writeJSON(VOTES_FILE, $votes);
    
    // Incrementar contador del servidor
    $servers[$serverIndex]['votes'] = ($servers[$serverIndex]['votes'] ?? 0) + 1;
    $servers[$serverIndex]['votesAllTime'] = ($servers[$serverIndex]['votesAllTime'] ?? 0) + 1;
    
    writeJSON(SERVERS_FILE, $servers);
    
    sendResponse(true, [
        'message' => "¡Gracias {$username}! Tu voto ha sido registrado.",
        'newVoteCount' => $servers[$serverIndex]['votes']
    ]);
}

// Obtener estado de votos del usuario
function getVoteStatus() {
    $serverId = $_GET['serverId'] ?? null;
    
    if ($serverId) {
        $status = canVote($serverId);
        sendResponse(true, $status);
    } else {
        // Devolver estado de todos los servidores
        $servers = readJSON(SERVERS_FILE);
        $statuses = [];
        
        foreach ($servers as $server) {
            $statuses[$server['id']] = canVote($server['id']);
        }
        
        sendResponse(true, ['voteStatuses' => $statuses]);
    }
}

// Router
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getVoteStatus();
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            sendResponse(false, null, 'Datos JSON inválidos.', 400);
        }
        registerVote($input);
        break;
        
    default:
        sendResponse(false, null, 'Método no permitido.', 405);
}
