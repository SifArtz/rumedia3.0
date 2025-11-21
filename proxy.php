<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$cookie = $_ENV['RUMEDIA_COOKIE'] ?? "PHPSESSID=82013a22d081c9e1047758a92c04d081";
$target = $_GET['target'] ?? 'premium';

$map = [
    'premium' => 'https://rumedia.io/media/admin-cp/manage-songs?check_pro=1',
    'single'  => 'https://rumedia.io/media/admin-cp/manage-songs?check=1',
    'queue'   => 'https://rumedia.io/media/admin-cp/manage-songs',
    'track'   => 'https://rumedia.io/media/edit-track/'
];

if (!array_key_exists($target, $map)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid target']);
    exit;
}

if ($target === 'track') {
    $trackId = $_GET['track_id'] ?? '';
    if ($trackId === '') {
        http_response_code(400);
        echo json_encode(['error' => 'track_id is required']);
        exit;
    }
    $url = $map[$target] . rawurlencode($trackId);
} else {
    $url = $map[$target];
}

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Cookie: $cookie",
    "User-Agent: Mozilla/5.0"
]);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($_POST));
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode([
        'error' => curl_error($ch)
    ]);
    curl_close($ch);
    exit;
}

$contentType = stripos($response, '<!DOCTYPE') === 0 ? 'text/html; charset=utf-8' : 'application/json';
header("Content-Type: $contentType");

echo $response;

curl_close($ch);
