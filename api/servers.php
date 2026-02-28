<?php
/**
 * HYSPANIA - API de Servidores
 * Gestión de servidores de Hytale
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
define('USER_SERVERS_FILE', DATA_DIR . 'user_servers.json');
define('MAX_SERVERS_PER_IP', 1);

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
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sanitizeString($str, $maxLength = 255) {
    $str = trim($str);
    $str = strip_tags($str);
    $str = htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
    return mb_substr($str, 0, $maxLength);
}

function validateServerName($name) {
    $name = trim($name);
    if (strlen($name) < 3 || strlen($name) > 32) {
        return false;
    }
    return preg_match('/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-_]+$/', $name);
}

function validateIP($ip) {
    $ip = trim($ip);
    // Permitir IPs y dominios
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        return true;
    }
    // Validar dominio básico
    return preg_match('/^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(:\d{1,5})?$/', $ip);
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

// Obtener todos los servidores
function getServers() {
    $servers = readJSON(SERVERS_FILE);
    
    // Ordenar por featured primero, luego por votos
    usort($servers, function($a, $b) {
        if ($a['featured'] && !$b['featured']) return -1;
        if (!$a['featured'] && $b['featured']) return 1;
        return ($b['votes'] ?? 0) - ($a['votes'] ?? 0);
    });
    
    // Añadir ranking
    foreach ($servers as $i => &$server) {
        $server['rank'] = $i + 1;
    }
    
    return $servers;
}

// Añadir un servidor
function addServer($data) {
    $clientIP = getClientIP();
    $hashedIP = hashIP($clientIP);
    
    // Verificar límite por IP
    $userServers = readJSON(USER_SERVERS_FILE);
    if (isset($userServers[$hashedIP])) {
        sendResponse(false, null, 'Ya has registrado un servidor. Solo se permite 1 servidor por usuario.', 429);
    }
    
    // Validar datos
    $name = $data['name'] ?? '';
    $ip = $data['ip'] ?? '';
    $description = $data['description'] ?? '';
    $tags = $data['tags'] ?? [];
    
    if (!validateServerName($name)) {
        sendResponse(false, null, 'Nombre inválido. Usa 3-32 caracteres alfanuméricos.', 400);
    }
    
    if (!validateIP($ip)) {
        sendResponse(false, null, 'IP o dominio inválido.', 400);
    }
    
    if (strlen($description) < 20 || strlen($description) > 300) {
        sendResponse(false, null, 'La descripción debe tener entre 20 y 300 caracteres.', 400);
    }
    
    // Sanitizar tags
    $allowedTags = ['survival', 'pvp', 'creativo', 'minijuegos', 'roleplay', 'español'];
    $tags = array_filter($tags, function($tag) use ($allowedTags) {
        return in_array($tag, $allowedTags);
    });
    
    $servers = readJSON(SERVERS_FILE);
    
    // Verificar duplicados
    $ipLower = strtolower($ip);
    $nameLower = strtolower($name);
    
    foreach ($servers as $server) {
        if (strtolower($server['ip']) === $ipLower) {
            sendResponse(false, null, 'Ya existe un servidor con esa IP.', 409);
        }
        if (strtolower($server['name']) === $nameLower) {
            sendResponse(false, null, 'Ya existe un servidor con ese nombre.', 409);
        }
    }
    
    // Crear servidor
    $serverId = preg_replace('/[^a-z0-9]/', '-', strtolower($name));
    $serverId = preg_replace('/-+/', '-', $serverId);
    $serverId = trim($serverId, '-');
    
    // Asegurar ID único
    $baseId = $serverId;
    $counter = 1;
    while (array_filter($servers, fn($s) => $s['id'] === $serverId)) {
        $serverId = $baseId . '-' . $counter++;
    }
    
    $newServer = [
        'id' => $serverId,
        'name' => sanitizeString($name, 32),
        'ip' => sanitizeString($ip, 64),
        'description' => sanitizeString($description, 300),
        'tags' => $tags,
        'votes' => 0,
        'votesAllTime' => 0,
        'featured' => false,
        'verified' => false,
        'createdAt' => time() * 1000
    ];
    
    $servers[] = $newServer;
    writeJSON(SERVERS_FILE, $servers);
    
    // Registrar que esta IP ya añadió servidor
    $userServers[$hashedIP] = [
        'serverId' => $serverId,
        'timestamp' => time()
    ];
    writeJSON(USER_SERVERS_FILE, $userServers);
    
    sendResponse(true, ['server' => $newServer]);
}

// Router
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $servers = getServers();
        sendResponse(true, ['servers' => $servers]);
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            sendResponse(false, null, 'Datos JSON inválidos.', 400);
        }
        addServer($input);
        break;
        
    default:
        sendResponse(false, null, 'Método no permitido.', 405);
}
