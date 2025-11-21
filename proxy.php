<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$defaultUrl = 'https://rumedia.io/media/admin-cp/manage-songs?check=1';
$target = $_GET['target'] ?? $defaultUrl;

$allowedPrefixes = [
    'https://rumedia.io/media/admin-cp/manage-songs',
    'https://rumedia.io/media/edit-track',
    'https://rumedia.io/media/endpoints',
];

$targetIsAllowed = false;
foreach ($allowedPrefixes as $prefix) {
    if (strpos($target, $prefix) === 0) {
        $targetIsAllowed = true;
        break;
    }
}

if (!$targetIsAllowed) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid target URL']);
    exit;
}

$cookie = getenv('RUMEDIA_COOKIE') ?: 'PHPSESSID=82013a22d081c9e1047758a92c04d081';

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Cookie: $cookie",
    'User-Agent: Mozilla/5.0',
]);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => curl_error($ch),
    ]);
} else {
    header('Content-Type: text/html; charset=utf-8');
    echo $response;
}

curl_close($ch);
