<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: text/html; charset=UTF-8");

$type = $_GET['type'] ?? 'premium';
$trackId = $_GET['track'] ?? '';

switch ($type) {
    case 'single':
        $url = 'https://rumedia.io/media/admin-cp/manage-songs?check=1';
        break;
    case 'track':
        $trackId = preg_replace('/[^A-Za-z0-9_-]/', '', $trackId);
        $url = $trackId
            ? 'https://rumedia.io/media/edit-track/' . $trackId
            : 'https://rumedia.io/media/edit-track/';
        break;
    case 'premium':
    default:
        $url = 'https://rumedia.io/media/admin-cp/manage-songs?check_pro=1';
        break;
}

// TODO: replace with a secure secret store in production
$cookie = getenv('RUMEDIA_COOKIE') ?: 'PHPSESSID=82013a22d081c9e1047758a92c04d081';

$cookie = getenv('RUMEDIA_COOKIE') ?: 'PHPSESSID=82013a22d081c9e1047758a92c04d081';

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Cookie: $cookie",
    "User-Agent: Mozilla/5.0",
]);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
}

$response = curl_exec($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode([
        'error' => curl_error($ch),
    ]);
} else {
    header('Content-Type: text/html; charset=utf-8');
    echo $response;
}

$contentType = stripos($response, '<!DOCTYPE') === 0 ? 'text/html; charset=utf-8' : 'application/json';
header("Content-Type: $contentType");

echo $response;

curl_close($ch);
